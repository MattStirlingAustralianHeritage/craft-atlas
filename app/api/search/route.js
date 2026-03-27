import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const PARSE_SYSTEM_PROMPT = `You are a search query parser for a curated Australian craft beverage directory. Parse natural language search queries into structured filter objects.

RULES:
- Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation
- Only include fields you can confidently infer — set everything else to null
- "natural wine" implies production_methods: ["natural_wine"]
- Region names like "Yarra Valley", "Barossa Valley", "Margaret River", "Hunter Valley", "Mornington Peninsula", "McLaren Vale", "Clare Valley", "Coonawarra", "Rutherglen", "Heathcote", "Macedon Ranges", "Pyrenees", "Grampians", "King Valley", "Beechworth", "Gippsland", "Tamar Valley", "Coal River Valley", "Huon Valley" → sub_region: "<exact name>"
- City/state names: "Melbourne", "Sydney", "Brisbane", "Perth", "Adelaide", "Hobart" → state only, no sub_region
- "dog friendly" → visitor_experience: ["dog_friendly"]
- "food", "restaurant", "dining", "lunch", "dinner", "eat" → visitor_experience: ["food_menu"]
- "accommodation", "stay", "overnight" → visitor_experience: ["accommodation"]
- "cellar door" → has_cellar_door: true
- "worth a trip" → is_destination: true
- "shiraz" or "shiraz producer" → beverage_types: ["shiraz"]
- "gin" or "gin distillery" or "gin distilleries" → beverage_types: ["gin"]
- "craft beer" or "brewery" or "breweries" → beverage_types: ["beer"]
- "winery" or "wineries" → beverage_types: ["wine"]
- "distillery" or "distilleries" → beverage_types: ["spirits"]
- "cidery" or "cideries" → beverage_types: ["cider"]
- "meadery" or "meaderies" → beverage_types: ["mead"]

SCHEMA:
{
  "vibe_tags": ["string"] | null,
  "beverage_types": ["string"] | null,
  "production_methods": ["string"] | null,
  "visitor_experience": ["string"] | null,
  "quality_signals": ["string"] | null,
  "is_destination": true | null,
  "has_cellar_door": true | null,
  "state": "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT" | null,
  "sub_region": "string" | null,
  "keyword": "string" | null
}

EXAMPLES:
Query: "Shiraz Barossa Valley"
Output: {"vibe_tags":null,"beverage_types":["shiraz","red_wine"],"production_methods":null,"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_cellar_door":null,"state":"SA","sub_region":"Barossa Valley","keyword":null}

Query: "wild ferment wines in regional Victoria"
Output: {"vibe_tags":null,"beverage_types":["wine"],"production_methods":["wild_ferment","natural_wine"],"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_cellar_door":null,"state":"VIC","sub_region":null,"keyword":null}

Query: "dog friendly urban brewery Melbourne"
Output: {"vibe_tags":["urban_taproom"],"beverage_types":["beer"],"production_methods":null,"visitor_experience":["dog_friendly"],"quality_signals":null,"is_destination":null,"has_cellar_door":null,"state":"VIC","sub_region":null,"keyword":null}

Query: "somewhere interesting to drink"
Output: {"vibe_tags":null,"beverage_types":null,"production_methods":null,"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_cellar_door":null,"state":null,"sub_region":null,"keyword":"interesting"}`

async function parseQuery(query) {
  const claudePromise = getAnthropic().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }],
  }).then(response => {
    let raw = response.content[0].text.trim()
    if (raw.startsWith('```')) { raw = raw.split('```')[1]; if (raw.startsWith('json')) raw = raw.slice(4); raw = raw.trim() }
    return JSON.parse(raw)
  })
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
  try { return await Promise.race([claudePromise, timeoutPromise]) } catch { return null }
}

async function queryVenues(filters, keyword) {
  const allTags = [
    ...(filters?.beverage_types || []),
    ...(filters?.production_methods || []),
    ...(filters?.vibe_tags || []),
    ...(filters?.visitor_experience || []),
    ...(filters?.quality_signals || []),
  ]

  const beverageTypes = filters?.beverage_types || []
  const productionMethods = filters?.production_methods || []
  const vibeTags = filters?.vibe_tags || []
  const visitorExperience = filters?.visitor_experience || []
  const qualitySignals = filters?.quality_signals || []
  const hasTagFilters = beverageTypes.length > 0 || productionMethods.length > 0 || vibeTags.length > 0 || visitorExperience.length > 0 || qualitySignals.length > 0

  const { data, error } = await getSupabase().rpc('search_venues_by_tags', {
    p_beverage_types: beverageTypes.length > 0 ? beverageTypes : null,
    p_production_methods: productionMethods.length > 0 ? productionMethods : null,
    p_vibe_tags: vibeTags.length > 0 ? vibeTags : null,
    p_visitor_experience: visitorExperience.length > 0 ? visitorExperience : null,
    p_quality_signals: qualitySignals.length > 0 ? qualitySignals : null,
    p_state: filters?.state || null,
    p_sub_region: filters?.sub_region || null,
    p_keyword: keyword || null,
    p_is_destination: filters?.is_destination === true ? true : null,
    p_has_cellar_door: filters?.has_cellar_door === true ? true : null,
  })

  if (error) throw error
  return data || []
}

async function keywordFallback(q) {
  const { data, error } = await getSupabase()
    .from('venues')
    .select('id, name, slug, type, subtype, state, sub_region, address, latitude, longitude, website, phone, description, hero_image_url, google_rating, google_rating_count, opening_hours, features, listing_tier, is_verified, status')
    .eq('status', 'published')
    .or(`name.ilike.%${q}%,type.ilike.%${q}%,description.ilike.%${q}%`)
    .order('listing_tier', { ascending: false, nullsFirst: false })
    .order('is_verified', { ascending: false, nullsFirst: false })
    .limit(50)
  if (error) throw error
  return data || []
}

async function logQuery(queryRaw, queryParsed, resultCount) {
  try { await getSupabase().from('search_queries').insert({ query_raw: queryRaw, query_parsed: queryParsed, result_count: resultCount }) } catch {}
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const boundsParam = searchParams.get('bounds')
  if (!q) return Response.json({ error: 'Missing query parameter: q' }, { status: 400 })

  let parsedFilters = null
  let usedFallback = false

  try {
    parsedFilters = await parseQuery(q)
    let venues = []

    if (parsedFilters) {
      venues = await queryVenues(parsedFilters, parsedFilters.keyword)
      if (venues.length === 0) {
        venues = await keywordFallback(q)
        usedFallback = true
      }
    } else {
      venues = await keywordFallback(q)
      usedFallback = true
    }

    let inBoundsCount = venues.length
    let bounds = null
    if (boundsParam && venues.length > 0) {
      const [swLng, swLat, neLng, neLat] = boundsParam.split(',').map(Number)
      bounds = { swLng, swLat, neLng, neLat }
      inBoundsCount = venues.filter(v => v.latitude >= swLat && v.latitude <= neLat && v.longitude >= swLng && v.longitude <= neLng).length
    }

    const majorityInBounds = bounds ? inBoundsCount / venues.length >= 0.6 : false
    const parseConfidence = parsedFilters ? Object.values(parsedFilters).filter(v => v !== null).length / Object.keys(parsedFilters).length : 0

    await logQuery(q, parsedFilters, venues.length)
    return Response.json({ venues, meta: { total: venues.length, query: q, parsed: parsedFilters, parseConfidence, usedFallback, majorityInBounds, inBoundsCount } })

  } catch (err) {
    console.error('[search]', err)
    try {
      const venues = await keywordFallback(q)
      await logQuery(q, null, venues.length)
      return Response.json({ venues, meta: { total: venues.length, query: q, parsed: null, parseConfidence: 0, usedFallback: true, majorityInBounds: false, inBoundsCount: 0 } })
    } catch { return Response.json({ error: 'Search unavailable' }, { status: 500 }) }
  }
}
