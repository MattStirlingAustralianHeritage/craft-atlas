// ============================================================
// Portal data — the Australian Atlas master portal is the single
// source of truth for this vertical's listings.
// ============================================================
//
// Background: historically each vertical kept its own Supabase DB and the
// data flowed ONE WAY — vertical → master portal (inbound sync). All the
// enrichment then happened on the portal: operator "From the maker"
// highlights, photo galleries, events, producer-pick endorsements, editorial
// descriptions, claim status, curated hours, and the active/hidden curation
// itself. None of that ever flowed back, so the vertical sites rendered a
// frozen February snapshot while the portal showed the live, rich record.
//
// This module reverses the read path: the vertical now reads its listings
// LIVE from the portal (`listings` filtered to this vertical's slug), so every
// change made on the portal is reflected here immediately. Listings, the
// hybrid search RPC and the public storage gallery are readable with the
// portal ANON key; events and producer-pick relationships are gated by RLS to
// approved/published rows (policies added on the portal) and are likewise
// anon-readable. No service-role key is shipped to the vertical.
//
// The portal lacks a handful of display-only fields this site shows (materials,
// practice description, classes, market appearances, custom tags, social
// links). Those are enriched, best-effort, from the vertical's own (frozen but
// still useful) `venues` row, matched on `listings.source_id == venues.id`.

import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase'

export const VERTICAL = 'craft'

const PORTAL_URL = process.env.PORTAL_SUPABASE_URL || process.env.NEXT_PUBLIC_ATLAS_SUPABASE_URL
const PORTAL_ANON = process.env.PORTAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ATLAS_SUPABASE_ANON_KEY

export const PORTAL_STORAGE_URL = PORTAL_URL ? `${PORTAL_URL}/storage/v1/object/public` : null
export const GALLERY_BUCKET = 'listing-images'

let _portal = null
/** Read-only portal client (anon). Returns null when env is not configured. */
export function getPortal() {
  if (_portal) return _portal
  if (!PORTAL_URL || !PORTAL_ANON) {
    console.warn('[portal-data] PORTAL_SUPABASE_URL / PORTAL_SUPABASE_ANON_KEY not set — portal reads unavailable')
    return null
  }
  _portal = createClient(PORTAL_URL, PORTAL_ANON, { auth: { persistSession: false } })
  return _portal
}

// The columns this vertical needs from a portal listing.
const LISTING_COLS = [
  'id', 'source_id', 'vertical', 'verticals', 'name', 'slug', 'description',
  'sub_type', 'sub_types', 'region', 'state', 'suburb', 'postcode',
  'address', 'street_address', 'address_on_request', 'lat', 'lng',
  'website', 'phone', 'hero_image_url', 'is_claimed', 'is_featured',
  'editors_pick', 'verified', 'data_source', 'status', 'hours',
  'operator_highlights',
].join(', ')

// ── Hours: portal {day:{open,close}} → vertical opening_hours {day:"HH:MM–HH:MM"}
function portalHoursToOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return null
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const out = {}
  let any = false
  for (const d of days) {
    const h = hours[d]
    if (!h) { out[d] = ''; continue }
    if (h === 'closed' || h === 'Closed' || h.closed === true) { out[d] = 'Closed'; any = true; continue }
    if (h.open && h.close) { out[d] = `${h.open}–${h.close}`; any = true; continue }
    out[d] = ''
  }
  return any ? out : null
}

// ── Map a portal listing row into the `venue` shape the vertical pages consume.
//    `local` is the optional matching `venues` row used for display-only enrich.
//    Craft venue page field vocabulary: `category` (discipline), `subcategories`,
//    `sub_region`, `suburb`, `opening_hours`, `materials`, `practice_description`.
export function mapListing(listing, local = null) {
  if (!listing) return null
  const openingHours = portalHoursToOpeningHours(listing.hours) || local?.opening_hours || null
  return {
    // identity — keep the local id (favourites / local map exclusion
    // compatibility) when we have it; otherwise fall back to the portal uuid.
    id: local?.id ?? listing.source_id ?? listing.id,
    portal_id: listing.id,
    source_id: listing.source_id ?? local?.id ?? null,

    name: listing.name,
    slug: listing.slug,
    description: listing.description || local?.description || null,

    // Craft discipline vocabulary: portal sub_type → category, sub_types → subcategories
    category: listing.sub_type || local?.category || null,
    subcategories: local?.subcategories || listing.sub_types || null,

    state: listing.state || local?.state || null,
    sub_region: listing.region || local?.sub_region || null,
    suburb: listing.suburb || local?.suburb || null,
    postcode: listing.postcode || local?.postcode || null,
    address: listing.address || listing.street_address || local?.address || null,
    address_on_request: listing.address_on_request ?? local?.address_on_request ?? false,
    latitude: listing.lat ?? local?.latitude ?? null,
    longitude: listing.lng ?? local?.longitude ?? null,

    website: listing.website || local?.website || null,
    phone: listing.phone || local?.phone || null,
    hero_image_url: local?.hero_image_url || listing.hero_image_url || null,
    data_source: listing.data_source || local?.data_source || null,
    is_claimed: !!listing.is_claimed,
    verified: !!(listing.verified || local?.verified),
    status: 'published', // already filtered to active on the portal
    published: true,

    // live operator-authored "right now" layer (master-only)
    operator_highlights: listing.operator_highlights || null,
    hours: listing.hours || null,
    opening_hours: openingHours,

    // display-only fields the portal does not carry — enrich from local row
    materials: local?.materials || null,
    practice_description: local?.practice_description || null,
    presence_type: local?.presence_type || null,
    visitable: local?.visitable ?? null,
    market_appearances: local?.market_appearances || null,
    hours_notes: local?.hours_notes || null,
    offers_classes: local?.offers_classes ?? false,
    classes: local?.classes || null,
    gallery_images: local?.gallery_images || null,
    custom_tags: local?.custom_tags || null,
    features: local?.features || null,
    social_links: local?.social_links || null,
    google_maps_url: local?.google_maps_url || null,
  }
}

// Filter helper: a listing belongs to this vertical if its primary vertical
// matches OR the slug is associated via the verticals[] array.
function applyVertical(query) {
  return query.or(`vertical.eq.${VERTICAL},verticals.cs.{${VERTICAL}}`)
}

// ── Single venue by slug (portal-primary). Returns null when the portal has no
//    ACTIVE listing for this slug — i.e. the portal has curated it out, so the
//    vertical reflects that with a 404.
export async function getPortalVenue(slug) {
  const portal = getPortal()
  if (!portal) return null
  const { data: listing, error } = await applyVertical(
    portal.from('listings').select(LISTING_COLS).eq('slug', slug).eq('status', 'active')
  ).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !listing) return null

  // best-effort local enrichment (display-only fields)
  let local = null
  try {
    const sb = await createServerSupabase()
    const byId = listing.source_id != null
      ? await sb.from('venues').select('*').eq('id', listing.source_id).maybeSingle()
      : { data: null }
    local = byId.data
    if (!local) {
      const bySlug = await sb.from('venues').select('*').eq('slug', slug).maybeSingle()
      local = bySlug.data
    }
  } catch {}

  return mapListing(listing, local)
}

// ── Local fallback: shape a vertical `venues` row into the venue shape. Used
//    only for venues that the portal has not aggregated yet (so there is no
//    portal row to overlay). These render with no rich blocks — exactly as the
//    site behaved before — never worse than today.
function mapLocalVenue(row) {
  if (!row) return null
  return {
    id: row.id,
    portal_id: null,
    source_id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    category: row.category || null,
    subcategories: row.subcategories || null,
    state: row.state || null,
    sub_region: row.sub_region || null,
    suburb: row.suburb || null,
    postcode: row.postcode || null,
    address: row.address || null,
    address_on_request: row.address_on_request ?? false,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    website: row.website || null,
    phone: row.phone || null,
    hero_image_url: row.hero_image_url || null,
    data_source: row.data_source || null,
    is_claimed: !!row.is_claimed,
    verified: !!row.verified,
    status: 'published',
    published: true,
    operator_highlights: null,
    hours: null,
    opening_hours: row.opening_hours || null,
    materials: row.materials || null,
    practice_description: row.practice_description || null,
    presence_type: row.presence_type || null,
    visitable: row.visitable ?? null,
    market_appearances: row.market_appearances || null,
    hours_notes: row.hours_notes || null,
    offers_classes: row.offers_classes ?? false,
    classes: row.classes || null,
    gallery_images: row.gallery_images || null,
    custom_tags: row.custom_tags || null,
    features: row.features || null,
    social_links: row.social_links || null,
    google_maps_url: row.google_maps_url || null,
  }
}

// ── The detail-page entry point: portal-primary, local fallback. The portal is
//    the source of truth; when it has no active listing for a slug we fall back
//    to the (frozen but valid) local row so venues the portal has not yet
//    aggregated still render. Returns null only when neither has the venue.
export async function getVenue(slug) {
  const fromPortal = await getPortalVenue(slug)
  if (fromPortal) return fromPortal
  try {
    const sb = await createServerSupabase()
    const { data } = await sb.from('venues').select('*').eq('slug', slug).eq('published', true).maybeSingle()
    return mapLocalVenue(data)
  } catch {
    return null
  }
}

// ── Nearby venues (same vertical) read from the portal via a bounding box.
//    Lightweight columns only. Output uses Craft's `category` field so the
//    consumer can colour/label pins consistently.
export async function getPortalNearby(lat, lng, excludeSlug, radiusKm = 30, limit = 60) {
  const portal = getPortal()
  if (!portal || lat == null || lng == null) return []
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const { data } = await applyVertical(
    portal.from('listings')
      .select('name, slug, sub_type, region, state, lat, lng')
      .eq('status', 'active')
      .neq('slug', excludeSlug)
      .gte('lat', lat - latDelta).lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta).lte('lng', lng + lngDelta)
  ).limit(limit)
  return (data || [])
    .filter(v => v.lat != null && v.lng != null)
    .map(v => ({
      name: v.name, slug: v.slug, category: v.sub_type,
      sub_region: v.region, state: v.state,
      latitude: v.lat, longitude: v.lng,
    }))
}

// ── Gallery: read the public storage manifest and return clean image URLs.
const MAX_GALLERY = 15
export async function getPortalGallery(listingId) {
  if (!listingId || !PORTAL_STORAGE_URL) return []
  const url = `${PORTAL_STORAGE_URL}/${GALLERY_BUCKET}/listings/gallery/${listingId}/manifest.json`
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const raw = await res.json()
    if (!Array.isArray(raw)) return []
    const seen = new Set()
    const out = []
    for (const entry of raw) {
      // Legacy plain-string entries are grandfathered clean (pre-moderation).
      const obj = typeof entry === 'string' ? { url: entry, status: 'clean' } : entry
      if (!obj || !obj.url || obj.status !== 'clean') continue
      if (seen.has(obj.url)) continue
      seen.add(obj.url)
      out.push(obj.url)
      if (out.length >= MAX_GALLERY) break
    }
    return out
  } catch {
    return []
  }
}

// ── Events. The portal is the single source of truth for events too: an event
//    published on the portal and tagged for this vertical propagates here
//    automatically, with no per-vertical event store to keep in sync. RLS gates
//    the anon key to approved + published rows. `mapEvent` is the shared card
//    shape used by every event surface.
const EVENT_COLS =
  'id, name, slug, description, start_date, end_date, category, category_label, ' +
  'is_free, ticket_url, website_url, image_url, suburb, state, location_name'

function mapEvent(e) {
  return {
    id: e.id,
    slug: e.slug,
    title: e.name,
    description: e.description || null,
    start_date: e.start_date,
    end_date: e.end_date && e.end_date !== e.start_date ? e.end_date : null,
    category_label: e.category_label || e.category || 'Event',
    is_free: !!e.is_free,
    ticket_url: e.ticket_url || e.website_url || null,
    image_url: e.image_url || null,
    suburb: e.suburb || null,
    state: e.state || null,
    location_name: e.location_name || null,
  }
}

// Events a single listing hosts (used on the venue detail page), upcoming only.
export async function getPortalEvents(listingId) {
  const portal = getPortal()
  if (!portal || !listingId) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await portal
    .from('events')
    .select(EVENT_COLS)
    .eq('listing_id', listingId)
    .eq('status', 'approved')
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(12)
  return (data || []).map(mapEvent)
}

// Every upcoming event tagged for this vertical — the network "What's on" feed.
// This is what surfaces a portal-published Craft event across the Craft Atlas
// site (homepage + /events), mirroring the portal's own vertical filter
// (events.verticals @> '{craft}'). Operator-created and vertical-tagged
// community events both carry this vertical in `verticals`, so they propagate here.
export async function getPortalVerticalEvents(limit = 24) {
  const portal = getPortal()
  if (!portal) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await portal
    .from('events')
    .select(EVENT_COLS)
    .contains('verticals', [VERTICAL])
    .eq('status', 'approved')
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(limit)
  return (data || []).map(mapEvent)
}

// ── Producer Picks: cross-venue endorsements via listing_relationships.
//    Outgoing = venues THIS place vouches for; incoming = who vouched for it.
const PORTAL_BASE = 'https://www.australianatlas.com.au'
function pickHref(p) {
  // Same-vertical picks link to this site; otherwise to the portal canonical.
  if (p.vertical === VERTICAL || (Array.isArray(p.verticals) && p.verticals.includes(VERTICAL))) {
    return `/venue/${p.slug}`
  }
  return `${PORTAL_BASE}/place/${p.slug}`
}

export async function getPortalPicks(listingId) {
  const portal = getPortal()
  if (!portal || !listingId) return { given: [], received: [] }
  const [outRes, inRes] = await Promise.all([
    portal.from('listing_relationships')
      .select('listing_id_b, metadata')
      .eq('relationship_type', 'producer_pick').eq('listing_id_a', listingId),
    portal.from('listing_relationships')
      .select('listing_id_a, metadata')
      .eq('relationship_type', 'producer_pick').eq('listing_id_b', listingId),
  ])
  const outRows = outRes.data || []
  const inRows = inRes.data || []
  const ids = [
    ...outRows.map(r => r.listing_id_b),
    ...inRows.map(r => r.listing_id_a),
  ].filter(Boolean)
  if (!ids.length) return { given: [], received: [] }

  const { data: hydr } = await portal
    .from('listings')
    .select('id, name, slug, region, state, vertical, verticals, status')
    .in('id', [...new Set(ids)])
    .eq('status', 'active')
  const map = new Map((hydr || []).map(l => [l.id, l]))

  const cleanNote = (n) => {
    if (!n) return null
    const s = String(n).trim().replace(/^["'“”]+|["'“”]+$/g, '').trim()
    return s || null
  }
  const sortPos = (a, b) => (a.position ?? 99) - (b.position ?? 99)

  const given = outRows
    .map(r => ({ l: map.get(r.listing_id_b), meta: r.metadata || {} }))
    .filter(x => x.l)
    .map(x => ({
      id: x.l.id, name: x.l.name, slug: x.l.slug, region: x.l.region, state: x.l.state,
      vertical: x.l.vertical, verticals: x.l.verticals,
      note: cleanNote(x.meta.note), position: x.meta.position,
      href: pickHref(x.l),
    }))
    .sort(sortPos)

  const received = inRows
    .map(r => ({ l: map.get(r.listing_id_a), meta: r.metadata || {} }))
    .filter(x => x.l)
    .map(x => ({
      id: x.l.id, name: x.l.name, slug: x.l.slug, region: x.l.region, state: x.l.state,
      vertical: x.l.vertical, verticals: x.l.verticals,
      note: cleanNote(x.meta.note), position: x.meta.position,
      href: pickHref(x.l),
    }))
    .sort(sortPos)

  return { given, received }
}

// ── Browse/discovery: map a portal listing to the lightweight "studio" card
//    shape the browse surfaces (explore, map, region, home featured/hero/stats)
//    consume. Uses Craft's field vocabulary: `category` (discipline),
//    `sub_region`, `latitude`/`longitude`, `tier`. Local-only enrichment fields
//    the portal does not carry (visitable/presence_type/features/classes) get
//    safe defaults so filters and map plotting degrade gracefully.
function mapCard(l) {
  // Derive a display tier from the portal's curation flags so the map pin
  // styling and "featured first" sort keep working without the local column.
  const tier = l.is_featured ? 'premium' : (l.is_claimed ? 'standard' : 'basic')
  return {
    id: l.source_id ?? l.id,
    portal_id: l.id,
    name: l.name,
    slug: l.slug,
    category: l.sub_type || null,
    type: l.sub_type || null, // alias: RegionMap pins colour-match on `type`
    subcategories: null,
    sub_region: l.region || null,
    suburb: l.region || null,
    state: l.state || null,
    address: null,
    latitude: l.lat ?? null,
    longitude: l.lng ?? null,
    hero_image_url: l.hero_image_url || null,
    description: l.description || null,
    is_claimed: !!l.is_claimed,
    tier,
    // local-only enrichment — safe defaults (portal listings are active/visitable)
    visitable: true,
    presence_type: 'permanent',
    address_on_request: false,
    experiences_and_classes: false,
    offers_classes: false,
    features: null,
  }
}

const BROWSE_COLS = 'id, source_id, name, slug, sub_type, region, state, lat, lng, hero_image_url, description, is_claimed, is_featured, editors_pick'

// All active listings for this vertical (paginated past the 1000-row cap).
export async function listPortalListings({ limit = 5000 } = {}) {
  const portal = getPortal()
  if (!portal) return []
  const out = []
  const PAGE = 1000
  for (let from = 0; from < limit; from += PAGE) {
    const to = Math.min(from + PAGE - 1, limit - 1)
    const { data, error } = await applyVertical(
      portal.from('listings').select(BROWSE_COLS).eq('status', 'active')
    ).order('is_claimed', { ascending: false }).order('name', { ascending: true }).range(from, to)
    if (error || !data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out.map(mapCard)
}

// Featured listings for the homepage (claimed/featured first).
export async function listPortalFeatured(limit = 8) {
  const portal = getPortal()
  if (!portal) return []
  const { data } = await applyVertical(
    portal.from('listings').select(BROWSE_COLS).eq('status', 'active').eq('is_claimed', true)
  ).order('is_featured', { ascending: false }).order('editors_pick', { ascending: false }).limit(limit)
  let rows = data || []
  if (rows.length < limit) {
    const { data: more } = await applyVertical(
      portal.from('listings').select(BROWSE_COLS).eq('status', 'active')
    ).order('is_featured', { ascending: false }).limit(limit)
    const seen = new Set(rows.map(r => r.id))
    rows = [...rows, ...(more || []).filter(r => !seen.has(r.id))].slice(0, limit)
  }
  return rows.map(mapCard)
}

// Listings in a named region (matches the portal `region` text column).
export async function getPortalRegionListings(regionName) {
  const portal = getPortal()
  if (!portal || !regionName) return []
  const { data } = await applyVertical(
    portal.from('listings').select(BROWSE_COLS).eq('status', 'active').ilike('region', regionName)
  ).order('is_claimed', { ascending: false }).order('name', { ascending: true }).limit(1000)
  return (data || []).map(mapCard)
}

// Upcoming events across this vertical, shaped for the map (keyed by the local
// venue id via the portal listing's source_id).
export async function listPortalMapEvents() {
  const portal = getPortal()
  if (!portal) return []
  const today = new Date().toISOString().slice(0, 10)
  const { data: events } = await portal
    .from('events')
    .select('listing_id, name, start_date, category, category_label')
    .eq('status', 'approved').gte('end_date', today)
    .order('start_date', { ascending: true }).limit(200)
  const evs = events || []
  if (!evs.length) return []
  const ids = [...new Set(evs.map(e => e.listing_id).filter(Boolean))]
  const { data: ls } = await portal.from('listings').select('id, source_id').in('id', ids)
  const idToSource = new Map((ls || []).map(l => [l.id, l.source_id ?? l.id]))
  return evs.map(e => ({
    venue_id: idToSource.get(e.listing_id) ?? null,
    title: e.name,
    event_date: e.start_date,
    event_type: e.category_label || e.category || 'Event',
  })).filter(e => e.venue_id != null)
}
