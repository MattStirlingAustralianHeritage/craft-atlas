import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const PARSE_SYSTEM_PROMPT = `You are a search query parser for Craft Atlas, a curated Australian maker and studio directory. Parse natural language search queries into structured filter objects.

The database uses these column names: "category" (not "type"), "suburb" (not "sub_region"), "state", "description" (enriched text about each maker's practice).

RULES:
- Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation
- Only include fields you can confidently infer — set everything else to null
- Craft categories (stored in "category" column): ceramics_clay, visual_art, jewellery_metalwork, textile_fibre, wood_furniture, glass, printmaking
- "ceramics" or "pottery" or "clay" → craft_types: ["ceramics_clay"]
- "painting" or "painter" or "visual art" → craft_types: ["visual_art"]
- "jewellery" or "jewelry" or "metalwork" or "silversmith" → craft_types: ["jewellery_metalwork"]
- "textiles" or "weaving" or "fibre" or "fiber" → craft_types: ["textile_fibre"]
- "woodwork" or "furniture" or "woodturning" → craft_types: ["wood_furniture"]
- "glass" or "glassblowing" or "blown glass" → craft_types: ["glass"]
- "printmaking" or "screen printing" or "etching" → craft_types: ["printmaking"]
- Region names like "Blue Mountains", "Byron Bay Hinterland", "Yarra Valley", "Daylesford", "Adelaide Hills", "Huon Valley", "Margaret River", "Sunshine Coast Hinterland" → sub_region: "<exact name>"
- Suburb names (stored in "suburb" column) can also be searched — if user mentions a specific town/suburb, set keyword to that name
- City/state names: "Melbourne", "Sydney", "Brisbane", "Perth", "Adelaide", "Hobart" → state only, no sub_region
- "open studio" → visitor_experience: ["open_studio"]
- "workshops" or "classes" → visitor_experience: ["workshops"]
- "commissions" → visitor_experience: ["commissions"]
- "experiences" → has_experiences: true
- "worth a trip" → is_destination: true

SCHEMA:
{
  "vibe_tags": ["string"] | null,
  "craft_types": ["string"] | null,
  "materials": ["string"] | null,
  "visitor_experience": ["string"] | null,
  "quality_signals": ["string"] | null,
  "is_destination": true | null,
  "has_experiences": true | null,
  "state": "VIC"|"NSW"|"QLD"|"SA"|"WA"|"TAS"|"ACT"|"NT" | null,
  "sub_region": "string" | null,
  "keyword": "string" | null
}

EXAMPLES:
Query: "ceramics Blue Mountains"
Output: {"vibe_tags":null,"craft_types":["ceramics_clay"],"materials":null,"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_experiences":null,"state":"NSW","sub_region":"Blue Mountains","keyword":null}

Query: "woodworking studios in Tasmania"
Output: {"vibe_tags":null,"craft_types":["wood_furniture"],"materials":null,"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_experiences":null,"state":"TAS","sub_region":null,"keyword":null}

Query: "open studio jewellery Melbourne"
Output: {"vibe_tags":null,"craft_types":["jewellery_metalwork"],"materials":null,"visitor_experience":["open_studio"],"quality_signals":null,"is_destination":null,"has_experiences":null,"state":"VIC","sub_region":null,"keyword":null}

Query: "somewhere interesting to visit"
Output: {"vibe_tags":null,"craft_types":null,"materials":null,"visitor_experience":null,"quality_signals":null,"is_destination":null,"has_experiences":null,"state":null,"sub_region":null,"keyword":"interesting"}`

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
    p_has_studio: filters?.has_studio === true ? true : null,
  })

  if (error) throw error
  return data || []
}

async function keywordFallback(q) {
  const { data, error } = await getSupabase()
    .from('venues')
    .select('id, name, slug, category, subcategories, state, suburb, sub_region, address, latitude, longitude, website, phone, description, hero_image_url, opening_hours, tier, published')
    .eq('published', true)
    .neq('address', '')
    .not('address', 'is', null)
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%,suburb.ilike.%${q}%,state.ilike.%${q}%,classes::text.ilike.%${q}%`)
    .order('tier', { ascending: false, nullsFirst: false })
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
