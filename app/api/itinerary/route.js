import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase } from '@/lib/supabase'

const GEO_ANCHORS = {
  'Barossa':              { lat: -34.56, lng: 138.95, r: 0.35 },
  'Yarra Valley':         { lat: -37.73, lng: 145.51, r: 0.35 },
  'Mornington Peninsula': { lat: -38.37, lng: 145.03, r: 0.30 },
  'Blue Mountains':       { lat: -33.72, lng: 150.31, r: 0.35 },
  'Byron':                { lat: -28.64, lng: 153.61, r: 0.30 },
  'Adelaide Hills':       { lat: -35.02, lng: 138.72, r: 0.35 },
  'Hunter Valley':        { lat: -32.75, lng: 151.28, r: 0.40 },
  'Margaret River':       { lat: -33.95, lng: 115.07, r: 0.40 },
  'Daylesford':           { lat: -37.35, lng: 144.15, r: 0.25 },
  'Macedon Ranges':       { lat: -37.35, lng: 144.55, r: 0.30 },
  'Goldfields':           { lat: -37.05, lng: 144.28, r: 0.50 },
  'Bellarine':            { lat: -38.25, lng: 144.55, r: 0.25 },
  'Gippsland':            { lat: -38.05, lng: 146.00, r: 0.80 },
  'Southern Highlands':   { lat: -34.50, lng: 150.45, r: 0.35 },
  'Great Ocean Road':     { lat: -38.68, lng: 143.55, r: 0.60 },
  'Grampians':            { lat: -37.15, lng: 142.45, r: 0.50 },
  'Tamar Valley':         { lat: -41.30, lng: 147.05, r: 0.30 },
  'Dandenongs':           { lat: -37.85, lng: 145.35, r: 0.20 },
  'Sunshine Coast':       { lat: -26.70, lng: 152.90, r: 0.35 },
  'Melbourne':            { lat: -37.81, lng: 144.96, r: 0.45 },
  'Sydney':               { lat: -33.87, lng: 151.21, r: 0.45 },
  'Brisbane':             { lat: -27.47, lng: 153.03, r: 0.45 },
  'Adelaide':             { lat: -34.93, lng: 138.60, r: 0.40 },
  'Perth':                { lat: -31.95, lng: 115.86, r: 0.45 },
  'Hobart':               { lat: -42.88, lng: 147.33, r: 0.40 },
  'Launceston':           { lat: -41.45, lng: 147.14, r: 0.30 },
  'Bendigo':              { lat: -36.76, lng: 144.28, r: 0.30 },
  'Ballarat':             { lat: -37.56, lng: 143.85, r: 0.30 },
  'Fremantle':            { lat: -32.05, lng: 115.75, r: 0.25 },
  'Canberra':             { lat: -35.28, lng: 149.13, r: 0.35 },
}

const STATE_BOUNDS = {
  VIC: { latMin: -39.2, latMax: -34.0, lngMin: 140.9, lngMax: 150.0 },
  NSW: { latMin: -37.5, latMax: -28.2, lngMin: 140.9, lngMax: 153.7 },
  QLD: { latMin: -29.2, latMax: -10.7, lngMin: 138.0, lngMax: 153.6 },
  SA:  { latMin: -38.1, latMax: -26.0, lngMin: 129.0, lngMax: 141.0 },
  WA:  { latMin: -35.1, latMax: -13.7, lngMin: 112.9, lngMax: 129.0 },
  TAS: { latMin: -43.7, latMax: -39.5, lngMin: 143.8, lngMax: 148.5 },
  ACT: { latMin: -35.9, latMax: -35.1, lngMin: 148.7, lngMax: 149.4 },
  NT:  { latMin: -26.0, latMax: -10.9, lngMin: 129.0, lngMax: 138.0 },
}

const REGION_KEYWORDS = {
  'barossa': 'Barossa', 'yarra valley': 'Yarra Valley', 'mornington': 'Mornington Peninsula',
  'blue mountains': 'Blue Mountains', 'byron': 'Byron', 'adelaide hills': 'Adelaide Hills',
  'hunter valley': 'Hunter Valley', 'margaret river': 'Margaret River',
  'daylesford': 'Daylesford', 'macedon': 'Macedon Ranges', 'goldfields': 'Goldfields',
  'bellarine': 'Bellarine', 'gippsland': 'Gippsland', 'southern highlands': 'Southern Highlands',
  'great ocean road': 'Great Ocean Road', 'grampians': 'Grampians',
  'tamar valley': 'Tamar Valley', 'dandenong': 'Dandenongs', 'sunshine coast': 'Sunshine Coast',
  'melbourne': 'Melbourne', 'sydney': 'Sydney', 'brisbane': 'Brisbane',
  'adelaide': 'Adelaide', 'perth': 'Perth', 'hobart': 'Hobart',
  'launceston': 'Launceston', 'bendigo': 'Bendigo', 'ballarat': 'Ballarat',
  'fremantle': 'Fremantle', 'canberra': 'Canberra',
  'tasmania': 'TAS', 'victoria': 'VIC', 'new south wales': 'NSW',
  'queensland': 'QLD', 'south australia': 'SA', 'western australia': 'WA',
}

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }

function parseRegion(query) {
  const lower = query.toLowerCase()
  const entries = Object.entries(REGION_KEYWORDS).sort((a, b) => b[0].length - a[0].length)
  for (const [kw, label] of entries) {
    if (lower.includes(kw)) return label
  }
  return null
}

function resolveGeoBounds(label) {
  if (!label) return null
  if (GEO_ANCHORS[label]) {
    const a = GEO_ANCHORS[label]
    return { latMin: a.lat - a.r, latMax: a.lat + a.r, lngMin: a.lng - a.r, lngMax: a.lng + a.r, label }
  }
  if (STATE_BOUNDS[label]) return { ...STATE_BOUNDS[label], label }
  const code = { victoria: 'VIC', vic: 'VIC', 'new south wales': 'NSW', nsw: 'NSW', queensland: 'QLD', qld: 'QLD', 'south australia': 'SA', sa: 'SA', 'western australia': 'WA', wa: 'WA', tasmania: 'TAS', tas: 'TAS', act: 'ACT', nt: 'NT' }[label.toLowerCase()]
  if (code && STATE_BOUNDS[code]) return { ...STATE_BOUNDS[code], label: code }
  return null
}

function parseDuration(query) {
  const q = query.toLowerCase()
  const patterns = [
    { re: /(\d+)\s*nights?/i, fn: m => parseInt(m[1]) + 1 },
    { re: /(\d+)\s*days?/i, fn: m => parseInt(m[1]) },
    { re: /\b(one|two|three|four|five|six|seven)\s*nights?\b/i, fn: m => (WORD_NUMBERS[m[1].toLowerCase()] || 2) + 1 },
    { re: /\b(one|two|three|four|five|six|seven)\s*days?\b/i, fn: m => WORD_NUMBERS[m[1].toLowerCase()] || 2 },
    { re: /long\s*weekend/i, fn: () => 3 },
    { re: /weekend/i, fn: () => 2 },
    { re: /day\s*trip/i, fn: () => 1 },
  ]
  for (const { re, fn } of patterns) {
    const m = q.match(re)
    if (m) return Math.min(fn(m), 7)
  }
  return 2
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  if (!q.trim()) return NextResponse.json({ error: 'Query is required' }, { status: 400 })

  const regionLabel = parseRegion(q)
  const geoBounds = resolveGeoBounds(regionLabel)
  if (!geoBounds) {
    return NextResponse.json({
      error: 'no_region',
      message: 'Could not identify a region. Try including a place name like "Melbourne" or "Daylesford".',
      suggestions: ['Melbourne', 'Sydney', 'Daylesford', 'Blue Mountains', 'Hobart'],
    }, { status: 400 })
  }

  const days = parseDuration(q)
  const stopsPerDay = days === 1 ? 5 : 4
  const supabase = getSupabase()

  const { data: candidates } = await supabase
    .from('venues')
    .select('id, name, slug, category, suburb, sub_region, state, latitude, longitude, description, claimed, listing_tier')
    .eq('published', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', geoBounds.latMin).lte('latitude', geoBounds.latMax)
    .gte('longitude', geoBounds.lngMin).lte('longitude', geoBounds.lngMax)
    .limit(days * stopsPerDay * 3)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: 'insufficient_venues', message: `Not enough makers or studios found in ${geoBounds.label} to build a trail.`, region_label: geoBounds.label }, { status: 400 })
  }

  // Sort: claimed and paid-tier venues first
  candidates.sort((a, b) => {
    const aScore = (a.claimed ? 2 : 0) + (a.listing_tier && a.listing_tier !== 'free' ? 1 : 0)
    const bScore = (b.claimed ? 2 : 0) + (b.listing_tier && b.listing_tier !== 'free' ? 1 : 0)
    return bScore - aScore
  })

  const venueList = candidates.map(v => `${v.claimed ? '[FEATURED] ' : ''}[ID:${v.id}] ${v.name} (${v.category}) \u2014 ${v.sub_region || v.suburb || v.state || ''}${v.description ? '. ' + v.description.slice(0, 120) : ''}`).join('\n')

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: `You are a makers and studios travel planner for Craft Atlas, an Australian directory of makers, artists, studios, and creative spaces. Generate a makers trail using ONLY the venues provided. Never invent venues.\n\nOutput JSON only. Format:\n{"title":"string","summary":"string","days":[{"label":"Day 1: [Theme]","stops":[{"venue_id":"uuid","venue_name":"string","note":"1-2 sentences"}]}]}\n\nRules:\n- CRITICAL: Each venue_id MUST be copied exactly from the [ID:...] prefix in the venue list. Do not modify, abbreviate, or invent IDs.\n- Use ONLY venues from the provided list\n- ${stopsPerDay} stops per day, ${days} day(s) total\n- Group geographically close venues on the same day\n- Vary craft types where possible (ceramics, glass, wood, textiles, etc.)\n- Notes should be specific and practical, mentioning the craft practiced\n- TIER WEIGHTING: Venues marked [FEATURED] are verified, operator-managed listings. Prefer them over unmarked venues of similar relevance and location.`,
      messages: [{ role: 'user', content: `Plan a ${days}-day makers trail in ${geoBounds.label}: "${q}"\n\nAvailable venues:\n${venueList}` }],
    })

    const text = response.content[0]?.text || ''
    let itinerary
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      itinerary = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    } catch {
      return NextResponse.json({ error: 'Failed to generate trail. Please try again.' }, { status: 500 })
    }

    const enrichedDays = (itinerary.days || []).map(day => {
      const stops = (day.stops || []).reduce((acc, stop) => {
        const c = candidates.find(v => String(v.id) === String(stop.venue_id))
        if (!c) return acc
        acc.push({ ...stop, slug: c.slug, category: c.category, suburb: c.suburb, sub_region: c.sub_region, state: c.state, lat: c.latitude, lng: c.longitude })
        return acc
      }, [])
      return { ...day, stops }
    }).filter(d => d.stops.length > 0)

    if (enrichedDays.length === 0) return NextResponse.json({ error: 'Trail generation failed. Please try again.' }, { status: 500 })

    return NextResponse.json({ title: itinerary.title, summary: itinerary.summary, days: enrichedDays, region_label: geoBounds.label, candidate_count: candidates.length })
  } catch (err) {
    console.error('[itinerary] error:', err.message)
    return NextResponse.json({ error: 'Trail generation unavailable.' }, { status: 500 })
  }
}
