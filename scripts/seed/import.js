#!/usr/bin/env node

/**
 * import.js — Import scraped venues into Supabase
 *
 * Reads raw.json from the scrape step, generates slugs,
 * and inserts into the Craft Atlas venues table.
 *
 * Usage: node scripts/seed/import.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

const { createClient } = require('@supabase/supabase-js')

const INPUT_PATH = path.join(__dirname, 'raw.json')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
  // Convert Google's weekday_text array to a string
  return hoursArray.join('\n')
}

async function main() {
  console.log('Craft Atlas — Import to Supabase')
  console.log('================================\n')

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`No input file found at ${INPUT_PATH}. Run scrape.js first.`)
    process.exit(1)
  }

  const venues = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))
  console.log(`Loaded ${venues.length} venues from raw.json`)

  // Check for existing venues to avoid duplicates
  const { data: existing } = await supabase
    .from('venues')
    .select('google_place_id, name')

  const existingIds = new Set((existing || []).map(v => v.google_place_id).filter(Boolean))
  const existingNames = new Set((existing || []).map(v => v.name.toLowerCase()))
  console.log(`Existing venues in database: ${existingIds.size}`)

  // Track slugs to ensure uniqueness
  const usedSlugs = new Set()
  if (existing) {
    const { data: slugs } = await supabase.from('venues').select('slug')
    for (const s of slugs || []) usedSlugs.add(s.slug)
  }

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const venue of venues) {
    // Skip if already exists
    if (venue.google_place_id && existingIds.has(venue.google_place_id)) {
      skipped++
      continue
    }
    if (existingNames.has(venue.name.toLowerCase())) {
      skipped++
      continue
    }

    // Generate unique slug
    let slug = slugify(venue.name)
    if (usedSlugs.has(slug)) {
      // Append state or a counter
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
      // Log but continue
      if (!error.message.includes('duplicate')) {
        console.error(`  Error inserting ${venue.name}: ${error.message}`)
      }
      errors++
    } else {
      inserted++
    }

    if ((inserted + skipped + errors) % 50 === 0) {
      process.stdout.write(`\r  Processed ${inserted + skipped + errors}/${venues.length} (${inserted} inserted, ${skipped} skipped, ${errors} errors)`)
    }
  }

  console.log(`\n\n── Summary ──`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped (existing): ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total in database: ${existingIds.size + inserted}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
