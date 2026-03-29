#!/usr/bin/env node

/**
 * verify.js — Visit every venue's website, verify it's a legitimate craft
 *             producer/seller, and remove those that don't qualify.
 *
 * Criteria for KEEPING a venue:
 *   - Produces/creates handmade or artisan goods (ceramics, art, jewellery, etc.)
 *   - Sells their work directly OR accepts commissions
 *   - Is primarily a maker/studio/workshop that sells
 *
 * Criteria for REMOVING a venue:
 *   - Gallery that only exhibits (doesn't sell or produce)
 *   - Museum or cultural institution (doesn't sell crafts)
 *   - Supply shop (sells materials/tools, not finished crafts)
 *   - School/university (education only, no retail)
 *   - Restaurant/cafe/bar (not a craft business)
 *   - Corporate/commercial entity (advertising, marketing, etc.)
 *   - Dead website / domain for sale / parked domain
 *   - Completely unrelated business
 *   - Art/craft classes ONLY with no products for sale
 *
 * Usage: node scripts/seed/verify.js
 *        node scripts/seed/verify.js --dry-run     # report only, don't delete
 *        node scripts/seed/verify.js --resume      # skip already-verified
 *        node scripts/seed/verify.js --limit 50    # process first N venues
 */

const fs = require('fs')
const path = require('path')

// Load env
const envContent = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const env = {}
envContent.split('\n').forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
})

const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const BATCH_SIZE = 10
const FETCH_CONCURRENCY = 5
const RATE_LIMIT_DELAY = 800
const FETCH_TIMEOUT = 8000
const MODEL = 'claude-haiku-4-5'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const resume = args.includes('--resume')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null

const LOG_FILE = path.join(__dirname, 'verify-log.json')

// Track verified venue IDs so we can resume
let verifiedIds = new Set()
if (resume && fs.existsSync(LOG_FILE)) {
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'))
  verifiedIds = new Set(log.verified || [])
  console.log(`Resuming — ${verifiedIds.size} venues already verified\n`)
}

function saveLog(verified, removed, kept) {
  fs.writeFileSync(LOG_FILE, JSON.stringify({
    verified: [...verified],
    removed,
    kept,
    timestamp: new Date().toISOString()
  }, null, 2))
}

async function fetchWebsite(url) {
  try {
    if (!url.startsWith('http')) url = 'https://' + url
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)
    const text = await res.text()
    return text.substring(0, 50000)
  } catch {
    return null
  }
}

function extractTextFromHtml(html) {
  if (!html) return ''

  // Remove scripts, styles, nav, footer
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Extract meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
  const metaDesc = metaMatch ? metaMatch[1].trim() : ''

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Combine and truncate
  const combined = `TITLE: ${title}\nMETA: ${metaDesc}\nCONTENT: ${text}`
  return combined.substring(0, 3000) // Keep it manageable for Claude
}

async function fetchBatchWebsites(venues) {
  const results = []

  for (let i = 0; i < venues.length; i += FETCH_CONCURRENCY) {
    const batch = venues.slice(i, i + FETCH_CONCURRENCY)
    const fetched = await Promise.all(
      batch.map(async (v) => {
        const html = await fetchWebsite(v.website)
        return { ...v, websiteText: extractTextFromHtml(html), fetchFailed: !html }
      })
    )
    results.push(...fetched)
  }

  return results
}

function buildVerificationPrompt(venues) {
  const venueList = venues.map((v, i) => {
    return [
      `[${i + 1}] "${v.name}"`,
      `    Category: ${v.category}`,
      `    Location: ${[v.suburb, v.state].filter(Boolean).join(', ')}`,
      `    Website: ${v.website}`,
      v.fetchFailed ? '    NOTE: Website could not be reached' : null,
      `    Website content: ${v.websiteText ? v.websiteText.substring(0, 500) : 'UNAVAILABLE'}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `You are verifying venues for Craft Atlas, a curated directory of Australian craft MAKERS who SELL their work. Be RUTHLESS — only venues that genuinely produce and sell handmade/artisan goods should stay.

For each venue, decide: KEEP or REMOVE.

KEEP if:
- They MAKE/CREATE handmade goods (ceramics, art, jewellery, textiles, woodwork, glass, prints) AND sell them
- They are a working studio/workshop that sells their creations
- They are an artist/maker who sells original work
- Gallery that ALSO sells the art/craft on display (artist-run gallery, commercial gallery selling originals)
- They accept commissions for custom handmade work

REMOVE if:
- Gallery/museum that only exhibits — doesn't sell crafts to take home
- Art/craft supply store (sells materials/tools, not finished pieces)
- School, university, or TAFE (education only)
- Classes/workshops only with NO products for sale
- Restaurant, cafe, bar, winery, brewery
- Corporate business (advertising, marketing, tech, digital agency)
- Website is dead, parked, domain for sale, or gives 404
- Completely unrelated to craft making/selling
- Community centre or council venue
- Architecture or interior design firm (not making handcrafted goods)
- Print shop / commercial printer (not artistic printmaking)
- Generic retail store

Return ONLY a JSON array: [{"index": 1, "verdict": "KEEP" or "REMOVE", "reason": "brief reason"}]
No markdown fences, no preamble.

VENUES:

${venueList}`
}

async function verifyBatch(venues, batchNum, totalBatches) {
  // Fetch websites
  const enriched = await fetchBatchWebsites(venues)

  const prompt = buildVerificationPrompt(enriched)

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      let text = response.content[0].text.trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const results = JSON.parse(text)
      if (!Array.isArray(results)) throw new Error('Not an array')

      const toRemove = []
      const toKeep = []

      for (const r of results) {
        const venue = venues[r.index - 1]
        if (!venue) continue

        verifiedIds.add(venue.id)

        if (r.verdict === 'REMOVE') {
          toRemove.push({ id: venue.id, name: venue.name, reason: r.reason })
        } else {
          toKeep.push(venue.id)
        }
      }

      console.log(`  Batch ${batchNum}/${totalBatches}: ${toKeep.length} kept, ${toRemove.length} to remove`)
      if (toRemove.length > 0) {
        for (const v of toRemove) {
          console.log(`    ✕ "${v.name}" — ${v.reason}`)
        }
      }

      return { toRemove, toKeep }

    } catch (err) {
      if (attempt < 3) {
        console.warn(`  Batch ${batchNum} attempt ${attempt} failed: ${err.message}. Retrying...`)
        await sleep(3000)
      } else {
        console.error(`  Batch ${batchNum} FAILED: ${err.message}`)
        // On failure, keep all venues (don't delete anything we're unsure about)
        venues.forEach(v => verifiedIds.add(v.id))
        return { toRemove: [], toKeep: venues.map(v => v.id) }
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Craft Atlas — Venue Verification')
  console.log('=================================')
  if (dryRun) console.log('(DRY RUN — no deletions will be made)\n')
  console.log()

  // Fetch all venues
  let allVenues = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, category, suburb, state, website, description')
      .eq('published', true)
      .order('name')
      .range(from, from + PAGE - 1)

    if (error) { console.error('Fetch error:', error.message); break }
    if (!data || data.length === 0) break
    allVenues.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  console.log(`Total venues in database: ${allVenues.length}`)

  // Filter out already-verified venues if resuming
  if (resume) {
    allVenues = allVenues.filter(v => !verifiedIds.has(v.id))
    console.log(`Venues to verify: ${allVenues.length}`)
  }

  // Apply limit
  if (limit) {
    allVenues = allVenues.slice(0, limit)
    console.log(`Limited to: ${allVenues.length}`)
  }

  console.log()

  const totalBatches = Math.ceil(allVenues.length / BATCH_SIZE)
  const allRemoved = []
  let totalKept = 0

  for (let i = 0; i < allVenues.length; i += BATCH_SIZE) {
    const batch = allVenues.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    const { toRemove, toKeep } = await verifyBatch(batch, batchNum, totalBatches)

    allRemoved.push(...toRemove)
    totalKept += toKeep.length

    // Save progress after each batch
    saveLog(verifiedIds, allRemoved.map(r => ({ id: r.id, name: r.name, reason: r.reason })), totalKept)

    if (i + BATCH_SIZE < allVenues.length) {
      await sleep(RATE_LIMIT_DELAY)
    }
  }

  console.log(`\n── Summary ──`)
  console.log(`Verified: ${totalKept + allRemoved.length}`)
  console.log(`Kept: ${totalKept}`)
  console.log(`Flagged for removal: ${allRemoved.length}`)

  if (allRemoved.length > 0 && !dryRun) {
    console.log(`\nDeleting ${allRemoved.length} venues...`)
    const ids = allRemoved.map(v => v.id)
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const { error } = await supabase.from('venues').delete().in('id', batch)
      if (error) console.error('  Delete error:', error.message)
    }
    console.log('Done.')

    const { count } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
    console.log(`\nTotal venues remaining: ${count}`)
  } else if (dryRun) {
    console.log('\n(Dry run — no venues were deleted)')
    console.log('\nVenues that would be removed:')
    allRemoved.forEach(v => console.log(`  ✕ "${v.name}" — ${v.reason}`))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
