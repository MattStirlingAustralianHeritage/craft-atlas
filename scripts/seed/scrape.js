#!/usr/bin/env node

/**
 * scrape.js — Pull craft maker/studio data from Google Places API
 *
 * Searches for craft-related venues across Australian cities and regions.
 * Uses Google Places API (Text Search) to find ceramics studios, glassblowers,
 * jewellers, woodworkers, textile artists, printmakers, and galleries.
 *
 * Output: scripts/seed/raw.json
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 *
 * Usage: node scripts/seed/scrape.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
const OUTPUT_PATH = path.join(__dirname, 'raw.json')

if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local')
  process.exit(1)
}

// Search queries mapped to craft categories
const SEARCH_QUERIES = [
  { query: 'ceramics pottery studio', type: 'ceramics_clay' },
  { query: 'artist studio gallery', type: 'visual_art' },
  { query: 'jewellery maker silversmith', type: 'jewellery_metalwork' },
  { query: 'weaving textile fibre studio', type: 'textile_fibre' },
  { query: 'woodworking furniture maker studio', type: 'wood_furniture' },
  { query: 'glass blowing studio', type: 'glass' },
  { query: 'printmaking screen printing studio', type: 'printmaking' },
]

// Australian locations to search — major cities + craft regions
const LOCATIONS = [
  // Capital cities
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, radius: 50000 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, radius: 50000 },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251, radius: 50000 },
  { name: 'Perth', lat: -31.9505, lng: 115.8605, radius: 50000 },
  { name: 'Adelaide', lat: -34.9285, lng: 138.6007, radius: 50000 },
  { name: 'Hobart', lat: -42.8821, lng: 147.3272, radius: 50000 },
  { name: 'Darwin', lat: -12.4634, lng: 130.8456, radius: 50000 },
  { name: 'Canberra', lat: -35.2809, lng: 149.1300, radius: 50000 },

  // Known craft regions
  { name: 'Blue Mountains', lat: -33.7150, lng: 150.3120, radius: 30000 },
  { name: 'Byron Bay', lat: -28.6474, lng: 153.6020, radius: 30000 },
  { name: 'Yarra Valley', lat: -37.7500, lng: 145.5000, radius: 30000 },
  { name: 'Daylesford', lat: -37.3486, lng: 144.1536, radius: 30000 },
  { name: 'Mornington Peninsula', lat: -38.3500, lng: 145.0000, radius: 30000 },
  { name: 'Margaret River', lat: -33.9536, lng: 115.0781, radius: 30000 },
  { name: 'Adelaide Hills', lat: -35.0000, lng: 138.7500, radius: 30000 },
  { name: 'Huon Valley', lat: -43.1000, lng: 147.0500, radius: 30000 },
  { name: 'Sunshine Coast Hinterland', lat: -26.6500, lng: 152.9500, radius: 30000 },
  { name: 'Central Victoria', lat: -37.0500, lng: 144.3500, radius: 40000 },
  { name: 'Newcastle', lat: -32.9283, lng: 151.7817, radius: 30000 },
  { name: 'Tamar Valley', lat: -41.2500, lng: 146.9500, radius: 30000 },
]

const STATE_FROM_COORDS = [
  { state: 'NSW', bounds: { minLat: -37.5, maxLat: -28.0, minLng: 140.9, maxLng: 154.0 } },
  { state: 'VIC', bounds: { minLat: -39.2, maxLat: -33.9, minLng: 140.9, maxLng: 150.0 } },
  { state: 'QLD', bounds: { minLat: -29.2, maxLat: -10.0, minLng: 138.0, maxLng: 154.0 } },
  { state: 'SA', bounds: { minLat: -38.1, maxLat: -26.0, minLng: 129.0, maxLng: 141.0 } },
  { state: 'WA', bounds: { minLat: -35.2, maxLat: -13.5, minLng: 112.9, maxLng: 129.0 } },
  { state: 'TAS', bounds: { minLat: -43.7, maxLat: -39.5, minLng: 143.5, maxLng: 148.5 } },
  { state: 'NT', bounds: { minLat: -26.0, maxLat: -10.9, minLng: 129.0, maxLng: 138.0 } },
  { state: 'ACT', bounds: { minLat: -35.9, maxLat: -35.1, minLng: 148.7, maxLng: 149.4 } },
]

function guessState(lat, lng) {
  // ACT first (smaller, inside NSW bounds)
  const act = STATE_FROM_COORDS.find(s => s.state === 'ACT')
  if (lat >= act.bounds.minLat && lat <= act.bounds.maxLat && lng >= act.bounds.minLng && lng <= act.bounds.maxLng) return 'ACT'
  for (const s of STATE_FROM_COORDS) {
    if (s.state === 'ACT') continue
    if (lat >= s.bounds.minLat && lat <= s.bounds.maxLat && lng >= s.bounds.minLng && lng <= s.bounds.maxLng) return s.state
  }
  return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Use Google Places Text Search API
async function searchPlaces(query, location) {
  const records = []
  const textQuery = `${query} in ${location.name} Australia`
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(textQuery)}&location=${location.lat},${location.lng}&radius=${location.radius}&key=${API_KEY}`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`  API error: ${data.status} — ${data.error_message || ''}`)
      return records
    }

    if (data.results) {
      for (const place of data.results) {
        records.push({
          name: place.name,
          google_place_id: place.place_id,
          address: place.formatted_address || null,
          lat: place.geometry?.location?.lat || null,
          lng: place.geometry?.location?.lng || null,
          google_rating: place.rating || null,
          google_rating_count: place.user_ratings_total || null,
          search_query: query,
          search_location: location.name,
        })
      }
    }

    // Paginate
    let nextPageToken = data.next_page_token
    while (nextPageToken) {
      await sleep(2000)
      const nextUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${API_KEY}`
      const nextRes = await fetch(nextUrl)
      const nextData = await nextRes.json()
      if (nextData.results) {
        for (const place of nextData.results) {
          records.push({
            name: place.name,
            google_place_id: place.place_id,
            address: place.formatted_address || null,
            lat: place.geometry?.location?.lat || null,
            lng: place.geometry?.location?.lng || null,
            google_rating: place.rating || null,
            google_rating_count: place.user_ratings_total || null,
            search_query: query,
            search_location: location.name,
          })
        }
      }
      nextPageToken = nextData.next_page_token
    }
  } catch (err) {
    console.error(`  Fetch error: ${err.message}`)
  }

  return records
}

// Get place details (website, phone, opening hours)
async function getPlaceDetails(placeId) {
  const fields = 'website,formatted_phone_number,opening_hours,types'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.result) {
      return {
        website: data.result.website || null,
        phone: data.result.formatted_phone_number || null,
        opening_hours: data.result.opening_hours?.weekday_text || null,
        google_types: data.result.types || [],
      }
    }
  } catch (err) {
    // silently skip
  }
  return { website: null, phone: null, opening_hours: null, google_types: [] }
}

// Filter out non-craft venues
const EXCLUDE_PATTERNS = [
  /\bpub\b/i, /\bbar\b/i, /\bhotel\b/i, /\brestaurant\b/i, /\bcafe\b(?!.*ceramic)/i,
  /\bbottle.?shop\b/i, /\bliquor\b/i, /\bwine.?bar\b/i, /\bbrewery\b/i, /\bwinery\b/i,
  /\btour\b/i, /\btravel\b/i, /\brealestate\b/i, /\breal estate\b/i,
  /\bsupplies\b/i, /\bsupply\b/i, /\bhardware\b/i, /\bdepot\b/i,
  /\bschool\b/i, /\buniversity\b/i, /\bcollege\b/i, /\btafe\b/i,
  /\bmuseum\b/i, /\blibrary\b/i, /\bcouncil\b/i,
  /\bdentist\b/i, /\bdoctor\b/i, /\bpharmacy\b/i, /\bvet\b/i,
]

function isLikelyCraft(record) {
  const name = record.name || ''
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(name)) return false
  }
  return true
}

async function main() {
  console.log('Craft Atlas — Seed Scraper')
  console.log('==========================\n')

  const allRecords = []
  let searchCount = 0
  const totalSearches = SEARCH_QUERIES.length * LOCATIONS.length

  for (const sq of SEARCH_QUERIES) {
    for (const loc of LOCATIONS) {
      searchCount++
      process.stdout.write(`\r[${searchCount}/${totalSearches}] ${sq.query} in ${loc.name}...           `)

      const results = await searchPlaces(sq.query, loc)
      for (const r of results) {
        r.craft_type = sq.type
      }
      allRecords.push(...results)

      await sleep(200) // Light rate limiting
    }
  }

  console.log(`\n\nTotal raw results: ${allRecords.length}`)

  // Deduplicate by google_place_id
  const byPlaceId = new Map()
  for (const r of allRecords) {
    if (!r.google_place_id) continue
    if (!byPlaceId.has(r.google_place_id)) {
      byPlaceId.set(r.google_place_id, r)
    } else {
      // Keep the existing, but merge craft_type if different
      const existing = byPlaceId.get(r.google_place_id)
      if (existing.craft_type !== r.craft_type) {
        if (!existing.additional_types) existing.additional_types = []
        if (!existing.additional_types.includes(r.craft_type)) {
          existing.additional_types.push(r.craft_type)
        }
      }
    }
  }

  let deduped = Array.from(byPlaceId.values())
  console.log(`After dedup by place_id: ${deduped.length}`)

  // Filter out non-craft venues
  deduped = deduped.filter(isLikelyCraft)
  console.log(`After filtering non-craft: ${deduped.length}`)

  // Enrich with place details (website, phone, hours)
  console.log(`\nFetching place details for ${deduped.length} venues...`)
  let detailCount = 0
  for (const record of deduped) {
    detailCount++
    if (detailCount % 10 === 0) {
      process.stdout.write(`\r  ${detailCount}/${deduped.length}`)
    }
    const details = await getPlaceDetails(record.google_place_id)
    record.website = details.website
    record.phone = details.phone
    record.opening_hours = details.opening_hours
    record.google_types = details.google_types

    // Guess state from coords
    if (record.lat && record.lng) {
      record.state = guessState(record.lat, record.lng)
    }

    await sleep(100)
  }

  // Guess sub_region from address
  for (const record of deduped) {
    if (record.address) {
      for (const loc of LOCATIONS) {
        if (record.search_location === loc.name && !['Sydney','Melbourne','Brisbane','Perth','Adelaide','Hobart','Darwin','Canberra'].includes(loc.name)) {
          record.sub_region = loc.name
          break
        }
      }
    }
  }

  console.log(`\n\n── Summary ──`)
  console.log(`Total unique venues: ${deduped.length}`)
  console.log(`With website: ${deduped.filter(r => r.website).length}`)
  console.log(`With rating: ${deduped.filter(r => r.google_rating).length}`)

  // Count by type
  const typeCounts = {}
  for (const r of deduped) {
    typeCounts[r.craft_type] = (typeCounts[r.craft_type] || 0) + 1
  }
  console.log('\nBy craft type:')
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2))
  console.log(`\nWritten to ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
