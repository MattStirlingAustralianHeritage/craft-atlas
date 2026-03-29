#!/usr/bin/env node

/**
 * enrich.js — Delete venues without websites, then generate 150-word descriptions
 *             for all remaining venues using Claude Haiku.
 *
 * Usage: node scripts/seed/enrich.js
 *        node scripts/seed/enrich.js --resume        # skip already-enriched
 *        node scripts/seed/enrich.js --limit 20      # test run
 */

const fs = require('fs')
const path = require('path')

// Load .env.local manually to avoid dotenv override issues
const envPath = path.join(__dirname, '../../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim()
})

const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk')

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: envVars.ANTHROPIC_API_KEY })

const BATCH_SIZE = 10
const RATE_LIMIT_DELAY = 1000 // ms between batches
const MODEL = 'claude-haiku-4-5'

const args = process.argv.slice(2)
const resume = args.includes('--resume')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null

const CATEGORY_LABELS = {
  ceramics_clay: 'Ceramics & Clay',
  visual_art: 'Visual Art',
  jewellery_metalwork: 'Jewellery & Metalwork',
  textile_fibre: 'Textile & Fibre',
  wood_furniture: 'Wood & Furniture',
  glass: 'Glass',
  printmaking: 'Printmaking',
}

async function deleteVenuesWithoutWebsites() {
  console.log('\n── Step 1: Removing venues without websites ──\n')

  const { data: noWebsite, error: fetchErr } = await supabase
    .from('venues')
    .select('id')
    .or('website.is.null,website.eq.')

  if (fetchErr) {
    console.error('Error fetching venues without websites:', fetchErr.message)
    return 0
  }

  if (!noWebsite || noWebsite.length === 0) {
    console.log('No venues without websites found.')
    return 0
  }

  const ids = noWebsite.map(v => v.id)
  console.log(`Found ${ids.length} venues without websites. Deleting...`)

  // Delete in batches of 50
  let deleted = 0
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const { error } = await supabase.from('venues').delete().in('id', batch)
    if (error) {
      console.error(`  Error deleting batch ${i}-${i + batch.length}:`, error.message)
    } else {
      deleted += batch.length
    }
  }

  console.log(`Deleted ${deleted} venues.\n`)
  return deleted
}

async function fetchVenuesToEnrich() {
  let query = supabase
    .from('venues')
    .select('id, name, category, address, suburb, state, website, phone, opening_hours')
    .eq('published', true)
    .order('name')

  if (resume) {
    query = query.or('description.is.null,description.eq.')
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch venues: ${error.message}`)
  return data || []
}

function buildPrompt(venues) {
  const venueList = venues.map((v, i) => {
    const cat = CATEGORY_LABELS[v.category] || v.category || 'Unknown'
    return [
      `[${i + 1}] "${v.name}"`,
      `    Category: ${cat}`,
      `    Location: ${[v.suburb, v.state].filter(Boolean).join(', ') || v.address || 'Australia'}`,
      v.website ? `    Website: ${v.website}` : null,
      v.opening_hours ? `    Hours: ${v.opening_hours}` : null,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `Write a compelling 150-word description for each of the following Australian craft studios/makers for a curated directory called Craft Atlas. Each description should:

- Sound warm, knowledgeable, and inviting — like a trusted guide recommending a hidden gem
- Mention the craft discipline and what makes the studio distinctive
- Reference the location/region naturally
- Highlight what a visitor or customer might experience or find
- Be factual but evocative — do NOT invent specific details (awards, founding dates, names) you don't know
- Use present tense, third person

Return ONLY a JSON array of objects with "index" (1-based) and "description" fields. No markdown fences, no preamble.

VENUES:

${venueList}`
}

function parseResponse(text, batchSize) {
  // Strip markdown fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Response is not an array')
  if (parsed.length !== batchSize) {
    console.warn(`  Warning: expected ${batchSize} descriptions, got ${parsed.length}`)
  }
  return parsed
}

async function enrichBatch(venues, batchNum, totalBatches) {
  const prompt = buildPrompt(venues)

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].text
      const descriptions = parseResponse(text, venues.length)

      // Update each venue
      let updated = 0
      for (const desc of descriptions) {
        const venue = venues[desc.index - 1]
        if (!venue) {
          console.warn(`  Skipping unknown index ${desc.index}`)
          continue
        }

        const { error } = await supabase
          .from('venues')
          .update({ description: desc.description })
          .eq('id', venue.id)

        if (error) {
          console.error(`  Error updating "${venue.name}":`, error.message)
        } else {
          updated++
        }
      }

      console.log(`  Batch ${batchNum}/${totalBatches}: ${updated}/${venues.length} enriched`)
      return updated

    } catch (err) {
      if (attempt < 3) {
        console.warn(`  Batch ${batchNum} attempt ${attempt} failed: ${err.message}. Retrying in 5s...`)
        await sleep(5000)
      } else {
        console.error(`  Batch ${batchNum} FAILED after 3 attempts: ${err.message}`)
        return 0
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Craft Atlas — Venue Enrichment')
  console.log('==============================\n')

  // Step 1: Delete venues without websites
  await deleteVenuesWithoutWebsites()

  // Step 2: Fetch venues to enrich
  const venues = await fetchVenuesToEnrich()
  console.log(`── Step 2: Enriching ${venues.length} venues ──\n`)

  if (venues.length === 0) {
    console.log('No venues to enrich!')
    return
  }

  const totalBatches = Math.ceil(venues.length / BATCH_SIZE)
  let totalEnriched = 0
  let totalErrors = 0

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    const enriched = await enrichBatch(batch, batchNum, totalBatches)
    totalEnriched += enriched
    totalErrors += (batch.length - enriched)

    if (i + BATCH_SIZE < venues.length) {
      await sleep(RATE_LIMIT_DELAY)
    }
  }

  // Final count
  const { count } = await supabase
    .from('venues')
    .select('*', { count: 'exact', head: true })

  console.log(`\n── Summary ──`)
  console.log(`Enriched: ${totalEnriched}`)
  console.log(`Errors: ${totalErrors}`)
  console.log(`Total venues in database: ${count}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
