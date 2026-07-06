// ============================================================
// Ask the Atlas — plain-language concierge, proxied to the portal.
// ============================================================
//
// The portal runs the concierge (Claude interprets the request → hybrid
// retrieval → a grounded written answer + per-venue reasons). Rather than
// duplicate that stack here, this vertical proxies POST /api/search/ask to the
// portal's endpoint, scoped to this vertical, and maps the response into the
// same `{ listings, meta }` shape the search proxy returns — so the /search page
// renders concierge results with its existing cards, plus the written answer.
//
// Shares VERTICAL / mapListing / PORTAL_API with the sibling search proxy so the
// listing shape can never drift between plain search and concierge.

import { PORTAL_API, VERTICAL, mapListing } from '../route'

export async function POST(request) {
  let query = ''
  try {
    const body = await request.json()
    query = (body?.query || '').trim()
  } catch { /* no body → empty query */ }

  if (!query || query.length < 3) {
    return Response.json({ listings: [], meta: { total: 0, query, source: 'portal-concierge' } })
  }

  try {
    const ac = new AbortController()
    // The concierge makes two Claude calls; give it more headroom than plain search.
    const timer = setTimeout(() => ac.abort(), 20000)
    let data
    try {
      const res = await fetch(`${PORTAL_API}/api/search/ask`, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ query, vertical: VERTICAL }),
      })
      if (!res.ok) throw new Error(`portal ask ${res.status}`)
      data = await res.json()
    } finally {
      clearTimeout(timer)
    }

    const listings = (data.listings || []).map((l) => ({ ...mapListing(l), reason: l.reason || null }))

    return Response.json({
      listings,
      meta: {
        total: listings.length,
        query,
        answer: data.answer || null,
        intent: data.intent || null,
        detectedState: data.detectedState || null,
        detectedRegion: data.detectedRegion?.name || null,
        source: 'portal-concierge',
      },
    })
  } catch (err) {
    console.error('[ask proxy]', err?.message || err)
    // Fail-open: the /search page falls back to a plain search on empty results.
    return Response.json({ listings: [], meta: { total: 0, query, source: 'portal-concierge', error: true } })
  }
}
