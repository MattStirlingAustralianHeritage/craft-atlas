'use client'
// ── Smart pin filter (Craft Atlas port) ──
//
// A self-contained port of the Australian Atlas PORTAL's floating "smart pin
// filter" logic, adapted to a SINGLE vertical (craft: makers, artists and
// studios across ceramics, jewellery, textile, glass, wood, printmaking and
// visual art) so it replicates cleanly across the other verticals.
//
// It combines two passes:
//   (a) INSTANT local lexical token matching over a per-listing "haystack"
//       (name, discipline vocabulary, locality, description) with synonym
//       expansion + a category → discipline constraint; and
//   (b) a ~1s-later SEMANTIC pass that fetches this vertical's /api/search
//       proxy (the portal's Search 3.0 hybrid pipeline) and unions the ranked
//       result pool in. Debounced. Fails open to local-only if the fetch fails.
//
// The portal keys its haystack + category constraint off a multi-vertical
// SUB_TYPE_LABELS map and getVerticalBadge/Label helpers. Here there is only
// ONE vertical with a handful of discipline keys, so buildHaystack takes an
// explicit `labels` lookup ({ ceramics_clay: 'Ceramics & Clay', … }) and the
// constraint index is built from that lookup + craft-relevant synonyms.
// Everything else (tokenize, matchesPinQuery, the debounce + fetch React hook)
// mirrors the portal 1:1.
//
// DIFFERENCE FROM PORTAL /api/search: the portal endpoint returns
// `{ pins:[{id,strong}], detectedPlace/Region/Suburb/State }`. This vertical's
// proxy returns `{ venues:[{id,category,…}], meta:{ parsed:{sub_region,state,
// suburb} } }`. The hook reads either shape: ids/rank come from `data.pins`
// (preferred) or `data.venues`, place-detection from `detected*`/`meta.parsed`.

import { useEffect, useMemo, useRef, useState } from 'react'

// ── Synonyms ──
// Intent words that don't literally appear in a discipline's labels — kept to
// the craft-relevant subset of the portal's list. Several of these already
// ship in the portal's synonym map (pottery→ceramics, jewelry→jewellery, etc);
// they're reused verbatim here. Keys and values are matched against the
// haystack.
export const QUERY_SYNONYMS = {
  // Ceramics & clay
  pottery: 'ceramics',
  potter: 'ceramics',
  potters: 'ceramics',
  ceramic: 'ceramics',
  clay: 'ceramics',
  porcelain: 'ceramics',
  stoneware: 'ceramics',
  // Jewellery & metalwork (US spelling → AU)
  jewelry: 'jewellery',
  jeweller: 'jewellery',
  jewellers: 'jewellery',
  jeweler: 'jewellery',
  silversmith: 'metalwork',
  blacksmith: 'metalwork',
  metalsmith: 'metalwork',
  metal: 'metalwork',
  // Textile & fibre
  textiles: 'textile',
  fibre: 'textile',
  fiber: 'textile',
  weaver: 'textile',
  weaving: 'textile',
  tapestry: 'textile',
  embroidery: 'textile',
  basketry: 'textile',
  // Wood & furniture
  wood: 'wood',
  woodwork: 'wood',
  woodworker: 'wood',
  woodturning: 'wood',
  furniture: 'furniture',
  cabinetmaker: 'furniture',
  // Glass
  glassblower: 'glass',
  glassblowing: 'glass',
  // Printmaking
  print: 'printmaking',
  prints: 'printmaking',
  printmaker: 'printmaking',
  etching: 'printmaking',
  screenprint: 'printmaking',
  // Visual art
  painter: 'visual art',
  painting: 'visual art',
  paintings: 'visual art',
  artist: 'visual art',
  artists: 'visual art',
  art: 'visual art',
  sculptor: 'visual art',
  sculpture: 'visual art',
  // Leather / shoes
  leather: 'leather',
  leatherwork: 'leather',
  cobbler: 'shoemaking',
  shoemaker: 'shoemaking',
  // Everyday collective nouns
  maker: 'ceramics jewellery textile glass wood printmaking art',
  makers: 'ceramics jewellery textile glass wood printmaking art',
  studio: 'ceramics jewellery textile glass wood printmaking art',
  studios: 'ceramics jewellery textile glass wood printmaking art',
  craft: 'ceramics jewellery textile glass wood printmaking art',
}

// Lowercased searchable text per listing, built once per data load: name,
// discipline vocabulary (label), sub_type/category, locality, and the
// description.
//
// `labels` is the vertical's discipline-key → label lookup (e.g.
// { ceramics_clay: 'Ceramics & Clay', … }) so the module stays
// vertical-agnostic.
export function buildHaystack(l, labels = {}) {
  const entity = l.category || l.sub_type || l.type
  return [
    l.name,
    labels[entity] || (entity ? String(entity).replace(/_/g, ' ') : ''),
    l.sub_type ? String(l.sub_type).replace(/_/g, ' ') : '',
    l.suburb, l.sub_region, l.state,
    l.description,
  ].filter(Boolean).join(' ').toLowerCase()
}

// Every query token must hit the haystack, either literally or through its
// synonym expansion.
export function matchesPinQuery(l, tokens) {
  const hay = l._hay || ''
  return tokens.every(t => hay.includes(t) || (QUERY_SYNONYMS[t] && QUERY_SYNONYMS[t].split(' ').some(s => hay.includes(s))))
}

export const tokenizeQuery = (q) => String(q || '').toLowerCase().split(/\s+/).map(t => t.trim()).filter(t => t.length >= 2)

// ── Semantic-pool id reconciliation ──
// The portal's /api/search pool is keyed by the PORTAL listing id. Craft's
// /api/listings, however, keys each studio by a LOCAL id and carries the portal
// id separately as `portal_id` (see lib/portal-data.js mapListing). So the
// semantic set must be tested against the studio's portal id (and its raw id as
// a fallback) — testing `l.id` alone silently never matches. Fine Grounds
// shares one id space and only needs `l.id`; checking both is harmless there.
export function inSemanticSet(l, ids) {
  if (!ids) return false
  return (l.portal_id != null && ids.has(l.portal_id)) || (l.id != null && ids.has(l.id))
}

// ── Category → discipline constraint ──
// A query that names a discipline ("jewellers", "potters") must NOT sweep in
// OTHER disciplines via the semantic pool. The portal maps every category word
// to the exact sub_type key(s) it names, built from SUB_TYPE_LABELS. Here the
// "categories" are the discipline keys, so the index is built from the labels
// + craft synonyms.
export function buildEntityWordIndex(labels = {}) {
  const idx = {}
  const add = (word, key) => {
    const w = String(word).toLowerCase()
    if (w.length < 3) return
    ;(idx[w] = idx[w] || new Set()).add(key)
  }
  // Discipline keys + their label words (ceramics_clay → ceramics, clay …).
  for (const [key, label] of Object.entries(labels)) {
    key.split('_').forEach(p => add(p, key))
    String(label).toLowerCase().split(/[^a-z]+/).forEach(p => add(p, key))
  }
  // Everyday / spoken words → the discipline key whose label already carries
  // the target word (so "potter" resolves to whichever key holds "ceramics").
  const SYN = {
    pottery: 'ceramics', potter: 'ceramics', potters: 'ceramics', ceramic: 'ceramics', clay: 'ceramics', porcelain: 'ceramics', stoneware: 'ceramics',
    jewelry: 'jewellery', jeweller: 'jewellery', jewellers: 'jewellery', jeweler: 'jewellery',
    silversmith: 'metalwork', blacksmith: 'metalwork', metalsmith: 'metalwork', metal: 'metalwork',
    textiles: 'textile', fibre: 'fibre', fiber: 'fibre', weaver: 'textile', weaving: 'textile', tapestry: 'textile', embroidery: 'textile', basketry: 'textile',
    woodwork: 'wood', woodworker: 'wood', woodturning: 'wood', cabinetmaker: 'furniture', furniture: 'furniture',
    glassblower: 'glass', glassblowing: 'glass',
    print: 'printmaking', prints: 'printmaking', printmaker: 'printmaking', etching: 'printmaking', screenprint: 'printmaking',
    painter: 'art', painting: 'art', paintings: 'art', artist: 'art', artists: 'art', sculptor: 'art', sculpture: 'art',
    leatherwork: 'leather', cobbler: 'shoemaker', shoemaking: 'shoemaker',
  }
  for (const [word, target] of Object.entries(SYN)) {
    const keys = idx[target]
    if (keys) for (const k of keys) add(word, k)
  }
  return idx
}

// The discipline keys a query's tokens explicitly name (empty = no category
// named, so no constraint applies).
export function requiredEntities(tokens, wordIndex) {
  const req = new Set()
  for (const t of tokens) {
    const keys = wordIndex[t]
    if (keys) for (const k of keys) req.add(k)
  }
  return req
}

// A listing satisfies a named category if its discipline is one named, or (as
// a safety net) its name literally contains a category token.
export function passesCategory(l, reqEntities, catTokens) {
  if (reqEntities.size === 0) return true
  const entity = l.category || l.sub_type || l.type
  if (entity && reqEntities.has(entity)) return true
  const n = (l.name || '').toLowerCase()
  return catTokens.some(t => n.includes(t))
}

// State-bounds table (mirrors the portal) — lets a bare-state query
// ("potters in victoria") frame the whole state.
export const STATE_BOUNDS = {
  'NSW':  [140.99, -37.51, 153.64, -28.16],
  'VIC':  [140.96, -39.16, 149.97, -33.98],
  'QLD':  [137.99, -29.18, 153.55, -10.68],
  'SA':   [129.00, -38.06, 141.00, -26.00],
  'WA':   [112.92, -35.13, 129.00, -13.69],
  'TAS':  [143.83, -43.65, 148.48, -39.57],
  'NT':   [129.00, -26.00, 138.00, -10.97],
  'ACT':  [148.76, -35.92, 149.40, -35.12],
}

/**
 * useSmartPinFilter — owns the smart-filter lifecycle.
 *
 * @param {object[]} listings   the annotated studio set (each with `category`;
 *   a `_hay` haystack should already be attached, but the hook tolerates its
 *   absence via matchesPinQuery).
 * @param {boolean}  isEmbedded when true the semantic pass is skipped (matches
 *   the portal's embedded-mode behaviour).
 * @param {string}   initialQuery restored from ?q=.
 * @param {object}   labels     discipline-key → label lookup for the category
 *   constraint.
 *
 * @returns {{
 *   pinQuery, setPinQuery, appliedPinQuery,
 *   matchedIds,     // Set<id> of matching listing ids, or null when no filter
 *   semantic,       // { query, ids:Set, rank:Map, placeDetected, stateCode } | null
 *   semanticRank,   // Map<id, rank> | null — only for the live query
 *   filterActive,   // a debounced query is present
 *   filterBusy,     // still settling (debounce) or semantic request in flight
 *   semanticLoading,
 * }}
 */
export function useSmartPinFilter({ listings, isEmbedded = false, initialQuery = '', labels } = {}) {
  const entityLabels = labels || {}
  const wordIndexRef = useRef(null)
  if (wordIndexRef.current === null) wordIndexRef.current = buildEntityWordIndex(entityLabels)

  // pinQuery follows the keystroke; appliedPinQuery is the debounced value the
  // (re-clustering) map pipeline actually runs on.
  const [pinQuery, setPinQuery] = useState(initialQuery)
  const [appliedPinQuery, setAppliedPinQuery] = useState(initialQuery)
  useEffect(() => {
    const t = setTimeout(() => setAppliedPinQuery(pinQuery.trim()), 220)
    return () => clearTimeout(t)
  }, [pinQuery])

  // Semantic half — the same hybrid pipeline as /search, via this vertical's
  // /api/search proxy. Local token matching answers instantly; these results
  // union in ~a second later. Fails open to local-only.
  const [semantic, setSemantic] = useState(null) // { query, ids, rank, placeDetected, stateCode }
  const [semanticLoading, setSemanticLoading] = useState(false)
  const semanticCache = useRef(new Map())
  const semanticAbort = useRef(null)
  useEffect(() => {
    if (isEmbedded) return
    const q = appliedPinQuery
    if (!q || q.length < 3) { setSemantic(null); setSemanticLoading(false); return }
    const cached = semanticCache.current.get(q)
    if (cached) { setSemantic(cached); setSemanticLoading(false); return }
    const ctrl = new AbortController()
    semanticAbort.current?.abort()
    semanticAbort.current = ctrl
    setSemanticLoading(true)
    // Extra pause on top of the applied-query debounce — the search route
    // embeds the query, so only fire on a real pause.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`search ${res.status}`)
        const data = await res.json()
        // Exact-same-tech as the portal: the ranked pin pool is `data.pins`
        // (the whole map-scoped pool, gated by the calibrated relevance floor
        // via `strong`). The vertical proxy passes `pins` + `detected*` through
        // from the portal; if an older proxy only returns `{ venues, meta }`,
        // fall back to that ranked venue list + `meta.parsed` place detection.
        const rawPins = Array.isArray(data.pins) ? data.pins : []
        const strongPins = rawPins.some(p => p.strong) ? rawPins.filter(p => p.strong) : rawPins
        const venuePool = Array.isArray(data.venues) ? data.venues
          : Array.isArray(data.listings) ? data.listings : []
        const pool = strongPins.length ? strongPins : venuePool
        const parsed = data.meta?.parsed || {}
        const st = typeof data.detectedState === 'string' ? data.detectedState.toUpperCase()
          : typeof parsed.state === 'string' ? parsed.state.toUpperCase() : null
        const entry = {
          query: q,
          ids: new Set(pool.map(p => p.id)),
          rank: new Map(pool.map((p, i) => [p.id, i])),
          placeDetected: !!(data.detectedPlace || data.detectedRegion || data.detectedSuburb || parsed.sub_region || parsed.suburb),
          stateCode: st && STATE_BOUNDS[st] ? st : null,
        }
        semanticCache.current.set(q, entry)
        if (semanticCache.current.size > 40) semanticCache.current.delete(semanticCache.current.keys().next().value)
        setSemantic(entry)
      } catch (e) {
        if (e.name !== 'AbortError') setSemantic(null) // fail open: local matching still applies
      } finally {
        if (!ctrl.signal.aborted) setSemanticLoading(false)
      }
    }, 450)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [appliedPinQuery, isEmbedded])

  // Only surface the semantic pool when it belongs to the live query.
  const sem = semantic && semantic.query === appliedPinQuery ? semantic : null
  // Rank map for the gazetteer sort — only when it belongs to the live query.
  const semanticRank = sem ? sem.rank : null

  // ── Matched-id set ── (memoised so its identity is stable between renders —
  // the consumer keys a map-source-update effect off it, so a fresh Set every
  // render would thrash setData/re-clustering.)
  // A listing matches on local tokens (instant, complete for category words) OR
  // on the semantic result set. A named category ("jewellers") hard-constrains
  // the discipline so another discipline never sneaks in via the semantic pool.
  const matchedIds = useMemo(() => {
    const tokens = tokenizeQuery(appliedPinQuery)
    if (!tokens.length || !Array.isArray(listings)) return null
    const reqEntities = requiredEntities(tokens, wordIndexRef.current)
    const catTokens = tokens.filter(t => wordIndexRef.current[t])
    const isMatch = (l) => passesCategory(l, reqEntities, catTokens) && (matchesPinQuery(l, tokens) || (sem !== null && inSemanticSet(l, sem.ids)))
    const out = new Set()
    for (const l of listings) if (isMatch(l)) out.add(l.id)
    return out
  }, [listings, appliedPinQuery, sem])

  // Lifecycle flags. `filterBusy` is the crucial one: the map's "no matches"
  // empty states must be suppressed while a query is still settling (debounce)
  // or its semantic request is in flight — during that window matchedIds.size
  // === 0 means "not answered yet", NOT "nothing matches".
  const filterActive = appliedPinQuery.length > 0
  const filterBusy = filterActive && (pinQuery.trim() !== appliedPinQuery || semanticLoading)

  return {
    pinQuery, setPinQuery, appliedPinQuery,
    matchedIds, semantic: sem, semanticRank,
    filterActive, filterBusy, semanticLoading,
  }
}
