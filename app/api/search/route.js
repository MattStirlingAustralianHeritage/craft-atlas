// ============================================================
// Search — proxied to the Australian Atlas portal hybrid search.
// ============================================================
//
// The portal runs the network's real search stack: Voyage voyage-3.5
// embeddings (1024-dim) + Postgres full-text, fused with Reciprocal Rank
// Fusion in the `search_listings_hybrid` RPC, plus region/suburb resolution
// from natural language. Rather than duplicate pgvector + embeddings + the RPC
// into this vertical's frozen DB, we call the portal's public `/api/search`
// endpoint filtered to this vertical (`?vertical=craft`) and map the response
// into the `{ venues, meta }` shape this site's UI already consumes.
//
// This is the same search technology deployed on the portal — every vertical
// now shares it.

const PORTAL_API = process.env.NEXT_PUBLIC_ATLAS_API_URL
  || process.env.NEXT_PUBLIC_ATLAS_AUTH_URL
  || 'https://www.australianatlas.com.au'

const VERTICAL = 'craft'

// The Craft search-results UI cards key colour/label off `venue.type` and show
// `sub_region`, `state`, `hero_image_url`, `slug`. Map the portal listing's
// `sub_type` (the Craft discipline) onto `type`/`category`, and `region` onto
// `sub_region`.
function mapListing(l) {
  return {
    id: l.id,
    name: l.name,
    slug: l.slug,
    type: l.sub_type || l.type || null,
    category: l.sub_type || l.type || null,
    subcategories: l.sub_types || null,
    sub_region: l.region || null,
    suburb: l.suburb || null,
    state: l.state || null,
    latitude: l.lat ?? null,
    longitude: l.lng ?? null,
    website: l.website || null,
    description: l.description || null,
    hero_image_url: l.hero_image_url || null,
    is_verified: !!l.is_claimed,
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const boundsParam = searchParams.get('bounds')
  if (!q) return Response.json({ error: 'Missing query parameter: q' }, { status: 400 })

  try {
    const params = new URLSearchParams({ q, vertical: VERTICAL, limit: '120' })
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 9000)
    let data
    try {
      const res = await fetch(`${PORTAL_API}/api/search?${params}`, {
        signal: ac.signal,
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`portal search ${res.status}`)
      data = await res.json()
    } finally {
      clearTimeout(timer)
    }

    const venues = (data.listings || []).map(mapListing)

    // Bounds awareness (the homepage map uses majorityInBounds to decide
    // whether to filter in place or navigate to /search).
    let inBoundsCount = venues.length
    let majorityInBounds = false
    if (boundsParam && venues.length > 0) {
      const [swLng, swLat, neLng, neLat] = boundsParam.split(',').map(Number)
      const withCoords = venues.filter(v => v.latitude != null && v.longitude != null)
      inBoundsCount = withCoords.filter(v => v.latitude >= swLat && v.latitude <= neLat && v.longitude >= swLng && v.longitude <= neLng).length
      majorityInBounds = withCoords.length > 0 ? inBoundsCount / withCoords.length >= 0.6 : false
    }

    // Synthesize the meta the UI expects. detectedRegion/State come from the
    // portal's NL location resolver.
    const parsed = {
      sub_region: data.detectedRegion?.name || null,
      state: data.detectedState || null,
      suburb: data.detectedSuburb || null,
    }
    const meta = {
      total: venues.length,
      query: q,
      parsed,
      parseConfidence: venues.length > 0 ? 1 : 0,
      usedFallback: false,
      majorityInBounds,
      inBoundsCount,
      didYouMean: data.didYouMean || null,
      source: 'portal-hybrid',
    }

    return Response.json({ venues, meta })
  } catch (err) {
    console.error('[search proxy]', err?.message || err)
    return Response.json({
      venues: [],
      meta: { total: 0, query: q, parsed: null, parseConfidence: 0, usedFallback: false, majorityInBounds: false, inBoundsCount: 0, source: 'portal-hybrid', error: true },
    })
  }
}
