#!/usr/bin/env node

/**
 * import-regional.js — Import scraped regional venues into Supabase
 *
 * Reads raw-regional.json from the regional scrape step, deduplicates
 * against existing DB entries by name+address, generates slugs,
 * and inserts into the Craft Atlas venues table.
 *
 * Usage: node scripts/seed/import-regional.js
 */

const fs = require('fs')
const path = require('path')

// Load env vars manually from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const env = {}
envContent.split('\n').forEach(l => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim() })

const { createClient } = require('@supabase/supabase-js')

const INPUT_PATH = path.join(__dirname, 'raw-regional.json')

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatOpeningHours(hoursArray) {
  if (!hoursArray || !Array.isArray(hoursArray)) return null
  return hoursArray.join('\n')
}

async function main() {
  console.log('Craft Atlas — Regional Import to Supabase')
  console.log('==========================================\n')

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`No input file found at ${INPUT_PATH}. Run scrape-regional.js first.`)
    process.exit(1)
  }

  const venues = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))
  console.log(`Loaded ${venues.length} venues from raw-regional.json`)

  // Check for existing venues to avoid duplicates — by place_id, and by name+address
  const { data: existing } = await supabase
    .from('venues')
    .select('google_place_id, name, address')

  const existingPlaceIds = new Set()
  const existingNameAddr = new Set()
  for (const v of (existing || [])) {
    if (v.google_place_id) existingPlaceIds.add(v.google_place_id)
    // Deduplicate by normalized name + address
    const key = `${(v.name || '').toLowerCase().trim()}||${(v.address || '').toLowerCase().trim()}`
    existingNameAddr.add(key)
  }
  console.log(`Existing venues in database: ${(existing || []).length}`)

  // Track slugs to ensure uniqueness
  const usedSlugs = new Set()
  const { data: slugs } = await supabase.from('venues').select('slug')
  for (const s of slugs || []) usedSlugs.add(s.slug)

  let inserted = 0
  let skippedPlaceId = 0
  let skippedNameAddr = 0
  let errors = 0
  const insertedByLocation = {}
  const insertedByType = {}

  for (const venue of venues) {
    // Skip if already exists by google_place_id
    if (venue.google_place_id && existingPlaceIds.has(venue.google_place_id)) {
      skippedPlaceId++
      continue
    }

    // Skip if already exists by name+address
    const nameAddrKey = `${(venue.name || '').toLowerCase().trim()}||${(venue.address || '').toLowerCase().trim()}`
    if (existingNameAddr.has(nameAddrKey)) {
      skippedNameAddr++
      continue
    }

    // Generate unique slug
    let slug = slugify(venue.name)
    if (usedSlugs.has(slug)) {
      if (venue.state) {
        slug = `${slug}-${venue.state.toLowerCase()}`
      }
      let counter = 2
      let baseSlug = slug
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }
    usedSlugs.add(slug)

    // Extract suburb from address (first part before comma)
    const suburb = venue.address ? venue.address.split(',')[0].trim() : null

    const record = {
      name: venue.name,
      slug,
      category: venue.craft_type,
      description: null, // Will be enriched later
      address: venue.address,
      suburb,
      state: venue.state || null,
      latitude: venue.lat,
      longitude: venue.lng,
      phone: venue.phone || null,
      website: venue.website || null,
      opening_hours: formatOpeningHours(venue.opening_hours),
      tier: 'free',
      published: true,
    }

    const { error } = await supabase.from('venues').insert(record)
    if (error) {
      if (!error.message.includes('duplicate')) {
        console.error(`  Error inserting ${venue.name}: ${error.message}`)
      }
      errors++
    } else {
      inserted++
      // Also add to our dedup sets so we don't double-insert within this run
      if (venue.google_place_id) existingPlaceIds.add(venue.google_place_id)
      existingNameAddr.add(nameAddrKey)

      // Track stats
      const loc = venue.search_location || 'Unknown'
      insertedByLocation[loc] = (insertedByLocation[loc] || 0) + 1
      const ct = venue.craft_type || 'unknown'
      insertedByType[ct] = (insertedByType[ct] || 0) + 1
    }

    const processed = inserted + skippedPlaceId + skippedNameAddr + errors
    if (processed % 50 === 0) {
      process.stdout.write(`\r  Processed ${processed}/${venues.length} (${inserted} inserted, ${skippedPlaceId + skippedNameAddr} skipped, ${errors} errors)`)
    }
  }

  // Final count
  const { count } = await supabase
    .from('venues')
    .select('*', { count: 'exact', head: true })

  console.log(`\n\n── Summary ──`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped (existing place_id): ${skippedPlaceId}`)
  console.log(`Skipped (existing name+address): ${skippedNameAddr}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total venues now in database: ${count}`)

  if (Object.keys(insertedByLocation).length > 0) {
    console.log('\nInserted by location:')
    for (const [loc, n] of Object.entries(insertedByLocation).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${loc}: ${n}`)
    }
  }

  if (Object.keys(insertedByType).length > 0) {
    console.log('\nInserted by craft type:')
    for (const [type, n] of Object.entries(insertedByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${n}`)
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
