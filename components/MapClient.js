'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { TYPE_COLORS, TYPE_LABELS, TYPE_LABELS_PLURAL, STATES } from '@/lib/constants'
import { ATLAS_PAPER_STYLE, ATLAS_LABEL_ROOF } from '@/lib/map/atlasPaperStyle'
import { attachDonutClusters } from '@/lib/map/donutClusters'
import DiscoveryPanel from '@/components/map/DiscoveryPanel'
import MapPreviewCard from '@/components/map/MapPreviewCard'
import SemanticSearchBar from './SemanticSearchBar'
import SmartMapFilter from './SmartMapFilter'
import { useSmartPinFilter, buildHaystack, inSemanticSet } from '@/lib/map/smartPinFilter'

const PRIMARY = '#C1603A'
const PREMIUM_COLOR = '#c8943a'
const PAPER = '#FBF9F4'

// Discipline-key → label lookup for the smart-filter haystack + category
// constraint. Plural labels double as singular for craft disciplines.
const DISCIPLINE_HAYSTACK_LABELS = TYPE_LABELS_PLURAL

// Dev-only: headless / hidden-tab preview environments never fire
// requestAnimationFrame, which stalls mapbox-gl completely (its style parse
// and render loop are rAF-driven). Shim with a timer so the map still builds
// when the document starts hidden. Compiled out of production builds.
if (process.env.NODE_ENV !== 'production' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
  const nativeRaf = typeof window !== 'undefined' ? window.requestAnimationFrame?.bind(window) : null
  if (nativeRaf) {
    let shimming = true
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') shimming = false })
    window.requestAnimationFrame = (cb) => shimming ? setTimeout(() => cb(performance.now()), 33) : nativeRaf(cb)
    window.cancelAnimationFrame = (id) => clearTimeout(id)
  }
}

function TrailAuthModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,16,12,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '40px 36px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>🗺️</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>Create an account to build trails</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>Plan and save curated routes across Australia's best makers, artists and studios. Free to join.</p>
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('craftatlas:openauth')); onClose() }}
          style={{ display: 'block', width: '100%', padding: '12px 0', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: 'pointer', marginBottom: 10 }}
        >
          Sign up — it's free
        </button>
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('craftatlas:openauth')); onClose() }}
          style={{ display: 'block', width: '100%', padding: '11px 0', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
        >
          Sign in
        </button>
        <button onClick={onClose} style={{ marginTop: 16, background: 'none', border: 'none', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Maybe later</button>
      </div>
    </div>
  )
}

const TYPES = ['All', 'Ceramics & Clay', 'Visual Art', 'Jewellery & Metalwork', 'Textile & Fibre', 'Wood & Furniture', 'Glass', 'Printmaking']

const STATE_BOUNDS = {
  'NSW':  [140.99, -37.51, 153.64, -28.16],
  'VIC':  [140.96, -39.16, 149.97, -33.98],
  'QLD':  [137.99, -29.18, 153.55, -10.68],
  'SA':   [129.00, -38.06, 141.00, -26.00],
  'WA':   [112.92, -35.13, 129.00, -13.69],
  'TAS':  [143.83, -43.65, 148.48, -39.57],
  'NT':   [129.00, -26.00, 138.00, -10.97],
  'ACT':  [148.76, -35.92, 149.40, -35.12],
}

// Mainland + Tasmania. The initial camera and the "All States" reset both
// fit these bounds so the country fills the viewport on any screen size or
// aspect ratio — a fixed centre/zoom either strands Australia in a sea of
// empty ocean on large monitors or crops the coasts on small ones.
const AUSTRALIA_BOUNDS = [[112.7, -43.9], [153.9, -10.4]]

// Zoom-out floor — keeps the map from shrinking to a speck.
const MIN_ZOOM = 2

// Desktop discovery panel width. Every camera call passes explicit padding
// (mapbox persists whatever padding a camera call carries — by passing it
// everywhere we own that state instead of being surprised by it).
const PANEL_W = 384

// Cap on rendered gazetteer rows — the list is a scanning surface, not a
// database dump; past this the answer is "zoom in".
const PANEL_CAP = 60

// Base (unfiltered) standard-pin radius by zoom, as [zoom, r] stop pairs. The
// smart-filter emphasis scaler multiplies the OUTPUT stops (not the whole
// expression) so `zoom` stays the top-level interpolate input. Mirrors the
// standard `pins` layer's base radius (3→4.5, 6→6, 10→7, 14→9).
const PIN_RADIUS_STOPS = [3, 4.5, 6, 6, 10, 7, 14, 9]
function pinRadius(mult = 1) {
  const out = ['interpolate', ['linear'], ['zoom']]
  for (let i = 0; i < PIN_RADIUS_STOPS.length; i += 2) out.push(PIN_RADIUS_STOPS[i], PIN_RADIUS_STOPS[i + 1] * mult)
  return out
}

// As a filter narrows the field, the survivors grow and pop off the greyed-out
// rest. Maps the live match COUNT to 0..1 — near 1 when only a handful survive,
// a gentle floor when a broad filter is active, 0 when no filter is on.
function matchEmphasis(count, active) {
  if (!active || count <= 0) return 0
  const e = 1 - Math.min(1, Math.max(0, (count - 6) / (250 - 6)))
  return Math.max(0.14, e)
}

// Shared network-wide key — pins the reader has opened on ANY Atlas map dim.
const VISITED_KEY = 'aa_map_visited_v1'
const VISITED_CAP = 500

const typeToCategory = (t) => t.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')

// Fast flat-earth distance — fine at duplicate-detection ranges.
function approxMeters(aLat, aLng, bLat, bLng) {
  const dLat = (aLat - bLat) * 111320
  const dLng = (aLng - bLng) * 111320 * Math.cos(aLat * Math.PI / 180)
  return Math.hypot(dLat, dLng)
}

/**
 * Display-geometry pass over the studio set, run once per data load.
 * Returns annotated copies; originals are untouched.
 *
 * 1. Pin fan-out (`_dlng`/`_dlat`): studios sharing an ~11m coordinate cell
 *    (usually duplicate rows or two businesses at one address) are spread
 *    onto a ~15m ring so each renders as its own visible, clickable dot —
 *    sub-pixel at national zoom, clearly separate at street zoom.
 * 2. Label ownership (`_labelShow`): only ONE name label per (normalised
 *    name × ~150m). Without this, duplicate venues get the same text placed
 *    at two different anchors — stacked twin labels.
 */
function annotateDisplayGeometry(studios) {
  const out = studios.map(s => ({ ...s, _hay: buildHaystack(s, DISCIPLINE_HAYSTACK_LABELS) }))

  const cells = new Map()
  for (const s of out) {
    if (s.latitude == null || s.longitude == null) continue
    const key = (+s.latitude).toFixed(4) + ',' + (+s.longitude).toFixed(4)
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key).push(s)
  }
  for (const group of cells.values()) {
    if (group.length === 1) {
      const s = group[0]
      s._dlng = parseFloat(s.longitude); s._dlat = parseFloat(s.latitude)
      continue
    }
    const R = 0.00014 // ≈ 15m of latitude
    group.forEach((s, i) => {
      const lat = parseFloat(s.latitude), lng = parseFloat(s.longitude)
      const angle = (2 * Math.PI * i) / group.length
      s._dlat = lat + R * Math.sin(angle)
      s._dlng = lng + (R * Math.cos(angle)) / Math.max(0.2, Math.cos(lat * Math.PI / 180))
    })
  }

  const byName = new Map()
  for (const s of out) {
    if (s.latitude == null || s.longitude == null) continue
    const key = String(s.name || '').toLowerCase().replace(/\s+/g, ' ').trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(s)
  }
  for (const group of byName.values()) {
    const shown = []
    for (const s of group) {
      const isNearShown = shown.some(x => approxMeters(+x.latitude, +x.longitude, +s.latitude, +s.longitude) < 150)
      s._labelShow = !isNearShown
      if (!isNearShown) shown.push(s)
    }
  }
  return out
}

// Display coordinates for a studio — fan-out-adjusted when present.
const displayCoords = (s) => [
  s._dlng != null ? s._dlng : parseFloat(s.longitude),
  s._dlat != null ? s._dlat : parseFloat(s.latitude),
]

const placesLabel = (n) => `${n.toLocaleString()} ${n === 1 ? 'studio' : 'studios'}`

// Human label for a Mapbox geocoding result's primary type, so a town reads as
// a distinct, selectable thing in the search dropdown (vs a suburb/postcode).
const PLACE_TYPE_LABEL = {
  place: 'Town / City', locality: 'Locality', neighborhood: 'Suburb',
  postcode: 'Postcode', region: 'State / Region', district: 'District',
  address: 'Address', country: 'Country',
}
const placeTypeLabel = (f) => PLACE_TYPE_LABEL[f?.place_type?.[0]] || 'Place'

// Small location-pin glyph — marks town/place rows in the search dropdown so
// they read distinct from the studio-name results above them.
function PlacePin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function getFiltered(studios, typeFilter, stateFilter, search, experiencesFilter = false) {
  return studios.filter(v => {
    const matchType = typeFilter === 'All' || v.category === typeToCategory(typeFilter)
    const matchState = stateFilter === 'All States' || v.state === stateFilter
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase())
    const matchExperiences = !experiencesFilter || v.experiences_and_classes === true
    return matchType && matchState && matchSearch && matchExperiences
  })
}

function buildGeoJSON(studios, studiosWithEvents, eventByStudio = {}) {
  return {
    type: 'FeatureCollection',
    features: studios.filter(v => {
      if (!v.latitude || !v.longitude) return false
      if (v.address_on_request) return false
      if (v.visitable === false && !['by_appointment'].includes(v.presence_type)) return false
      return true
    }).map(v => {
      const color = TYPE_COLORS[v.category] || PRIMARY
      const tier = v.tier || 'basic'
      const hasEvent = studiosWithEvents.has(v.id)
      const nextEvent = eventByStudio[v.id]
      const isByAppointment = v.presence_type === 'by_appointment'
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: displayCoords(v) },
        properties: {
          id: v.id, name: v.name, slug: v.slug, category: v.category,
          categoryLabel: TYPE_LABELS[v.category] || v.category,
          tier: isByAppointment ? 'appointment' : tier,
          color: tier === 'premium' ? PREMIUM_COLOR : color,
          hasEvent, eventTitle: nextEvent ? nextEvent.title : null, eventDate: nextEvent ? nextEvent.event_date : null,
          location: [v.sub_region || v.suburb, v.state].filter(Boolean).join(', '),
          description: v.description || '', isByAppointment,
          labelShow: v._labelShow !== false,
        },
      }
    }),
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}

export default function MapPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  const mapContainer = useRef(null)
  const map = useRef(null)
  const donuts = useRef(null)

  // allStudios: full dataset, never mutated after load
  // studios: current display set (filtered by semantic search)
  const [allStudios, setAllStudios] = useState([])
  const [studios, setStudios] = useState([])
  const [events, setEvents] = useState([])
  const initialType = typeParam ? (TYPES.find(t => typeToCategory(t) === typeParam) || 'All') : 'All'
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [stateFilter, setStateFilter] = useState('All States')
  const [experiencesFilter, setExperiencesFilter] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [studioCount, setStudioCount] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [activeTab, setActiveTab] = useState('map')
  const [user, setUser] = useState(undefined)
  const [showTrailModal, setShowTrailModal] = useState(false)
  const [semanticActive, setSemanticActive] = useState(false)
  const [fitRequest, setFitRequest] = useState(0)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false)
  const [legendCollapsed, setLegendCollapsed] = useState(true)
  const [mobileListOpen, setMobileListOpen] = useState(false)

  // ── Smart pin filter ── (portal port). Owns pinQuery/appliedPinQuery/the
  // debounced semantic /api/search pass. `?q=` restores it on load. Returns
  // matchedIds (Set<id>|null): matched pins keep colour + clustering; the rest
  // grey out as a quiet underlay. Runs over the CURRENT display set (`studios`)
  // so it composes with the SemanticSearchBar result set already in play.
  const {
    pinQuery, setPinQuery, appliedPinQuery,
    matchedIds, semantic, semanticRank,
    filterActive, filterBusy,
  } = useSmartPinFilter({
    listings: studios,
    labels: DISCIPLINE_HAYSTACK_LABELS,
    initialQuery: searchParams.get('q') || '',
  })
  const semanticRankRef = useRef(null)
  useEffect(() => { semanticRankRef.current = semanticRank }, [semanticRank])
  // Fly the camera to a place-scoped semantic result once, per resolved query.
  const flownForQuery = useRef(null)

  // Discovery panel (desktop) — open by default: split view is the difference
  // between a map people use and a map people bounce off.
  const [panelOpen, setPanelOpen] = useState(true)
  const panelOpenRef = useRef(true)
  useEffect(() => { panelOpenRef.current = panelOpen }, [panelOpen])

  // The toolbar wraps at narrow widths, so the panel can't assume its height —
  // measure it and hang the panel off its real bottom edge.
  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(106)
  useEffect(() => {
    if (!toolbarRef.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height
      if (h) setToolbarH(Math.round(h))
    })
    ro.observe(toolbarRef.current)
    return () => ro.disconnect()
  }, [])

  // What's in the current viewport (drives the panel + mobile list)
  const [inView, setInView] = useState({ items: [], total: 0 })

  // Selected studio — replaces the old popup with a card (anchored marker
  // portal on desktop, docked bottom card on mobile).
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)
  useEffect(() => { selectedRef.current = selected }, [selected])
  const [cardPortalEl, setCardPortalEl] = useState(null)
  const cardMarker = useRef(null)

  // Visited studios (grey-out pins the reader has already opened — the long
  // browse courtesy). localStorage, capped FIFO, shared network key.
  const visitedRef = useRef(null)
  const [, setVisitedVersion] = useState(0)
  if (visitedRef.current === null) {
    visitedRef.current = new Set()
    if (typeof window !== 'undefined') {
      try {
        const raw = JSON.parse(window.localStorage.getItem(VISITED_KEY) || '[]')
        if (Array.isArray(raw)) visitedRef.current = new Set(raw.slice(-VISITED_CAP))
      } catch { /* ignore */ }
    }
  }

  // Geocoding place search state (unified search: studio names + towns)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false)
  const placeSearchRef = useRef(null)
  const mobilePlaceSearchRef = useRef(null)

  // Keep a ref to studios so the map source update effect always has the latest value
  const studiosRef = useRef([])
  useEffect(() => { studiosRef.current = studios }, [studios])
  const pendingFitRef = useRef(null) // studios to fit bounds to once map is ready

  // Debounced geocoding search
  useEffect(() => {
    if (!placeQuery || placeQuery.length < 2) { setPlaceResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeQuery)}.json?country=AU&types=country,region,postcode,district,place,locality,neighborhood,address&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`)
        const data = await res.json()
        setPlaceResults(data.features || [])
        setShowPlaceDropdown(true)
      } catch (e) { console.error('Geocoding error:', e) }
    }, 400)
    return () => clearTimeout(timer)
  }, [placeQuery])

  useEffect(() => {
    function handleClickOutside(e) {
      const inDesktop = placeSearchRef.current && placeSearchRef.current.contains(e.target)
      const inMobile = mobilePlaceSearchRef.current && mobilePlaceSearchRef.current.contains(e.target)
      if (!inDesktop && !inMobile) setShowPlaceDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Explicit camera padding for every camera call — panel-aware on desktop.
  const cameraPadding = useCallback((panelIsOpen = panelOpenRef.current) => {
    if (typeof window === 'undefined') return 40
    const mobile = window.matchMedia('(max-width: 768px)').matches
    if (mobile) return { top: 116, bottom: 96, left: 28, right: 28 }
    return { top: 138, bottom: 48, left: (panelIsOpen ? PANEL_W : 0) + 56, right: 56 }
  }, [])

  function getZoomForPlaceType(placeType) {
    const zooms = { country: 4, region: 6, postcode: 9, district: 9, place: 11, locality: 13, neighborhood: 13, address: 15 }
    return zooms[placeType] || 11
  }

  function handlePlaceSelect(feature) {
    const [lng, lat] = feature.center
    const placeType = feature.place_type?.[0] || 'place'
    map.current?.flyTo({ center: [lng, lat], zoom: getZoomForPlaceType(placeType), padding: cameraPadding(), duration: 1500 })
    setPlaceQuery(feature.place_name)
    setShowPlaceDropdown(false)
    setMobileSheetOpen(false)
    if (typeof document !== 'undefined' && document.activeElement?.blur) document.activeElement.blur()
  }

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase()
      // Studios + events now come LIVE from the master portal (single source of
      // truth) via /api/listings. Auth stays local to this vertical's Supabase.
      const [listingsRes, { data: { user: currentUser } }] = await Promise.all([
        fetch('/api/listings?events=1').then(r => r.json()).catch(() => ({ venues: [], events: [] })),
        supabase.auth.getUser(),
      ])
      const studioData = annotateDisplayGeometry(listingsRes.venues || [])
      const eventData = listingsRes.events || []
      if (studioData) {
        setAllStudios(studioData)
        setStudios(studioData)
        setStudioCount(studioData.length)
      }
      if (eventData) setEvents(eventData || [])
      setUser(currentUser ?? null)
      setLoading(false)
      // `?q=` now drives the smart pin filter (see useSmartPinFilter above),
      // matching the portal: the full dataset stays loaded, matches keep colour
      // and the rest grey out. We still fetch the results once to frame the
      // camera on them (the filter effect's place-detection fly covers the
      // geographic case; this handles the general one). The dataset is NOT
      // replaced, so the greyed-out context underlay survives.
      const qParam = new URLSearchParams(window.location.search).get('q')
      if (qParam) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(qParam)}`)
          if (res.ok) {
            const { venues: results } = await res.json()
            if (results?.length) {
              pendingFitRef.current = annotateDisplayGeometry(results)
              setFitRequest(n => n + 1)
            }
          }
        } catch {}
      }
    }
    fetchData()
  }, [])

  const handleSemanticResults = useCallback((results, meta) => {
    if (!results) {
      setStudios(allStudios)
      setSemanticActive(false)
      window.history.replaceState({}, '', '/map')
      return
    }
    setStudios(results)
    setSemanticActive(true)
    const params = new URLSearchParams(window.location.search)
    if (meta?.parsed?.query) params.set('q', meta.parsed.query)
    window.history.replaceState({}, '', `/map?${params.toString()}`)
    // Fit map to results
    pendingFitRef.current = results
    setFitRequest(n => n + 1)
  }, [allStudios])

  const clearSemanticSearch = useCallback(() => {
    setStudios(allStudios)
    setSemanticActive(false)
    window.history.replaceState({}, '', '/map')
  }, [allStudios])

  // ── Viewport → gazetteer sync ──
  const filteredRef = useRef([])
  const updateInView = useCallback(() => {
    const m = map.current
    if (!m) return
    const b = m.getBounds()
    const west = b.getWest(), east = b.getEast(), south = b.getSouth(), north = b.getNorth()
    const within = []
    for (const s of filteredRef.current) {
      const lng = parseFloat(s.longitude), lat = parseFloat(s.latitude)
      if (lng >= west && lng <= east && lat >= south && lat <= north) within.push(s)
    }
    // With an active smart-filter semantic result, relevance order leads;
    // otherwise A–Z (stable ordering keeps the list calm while the user pans).
    // The rank Map is keyed by the PORTAL id, so resolve via portal_id first
    // (Craft's local id space differs — see inSemanticSet / lib/portal-data).
    const rank = semanticRankRef.current
    const rankOf = (s) => {
      if (!rank) return Infinity
      if (s.portal_id != null && rank.has(s.portal_id)) return rank.get(s.portal_id)
      if (s.id != null && rank.has(s.id)) return rank.get(s.id)
      return Infinity
    }
    within.sort((a, b2) => {
      if (rank) {
        const ra = rankOf(a), rb = rankOf(b2)
        if (ra !== rb) return ra - rb
      }
      return String(a.name).localeCompare(String(b2.name))
    })
    setInView({ items: within.slice(0, PANEL_CAP), total: within.length })
  }, [])

  // ── Feature-state helpers (hover / selected / visited pins) ──
  const hoverStateId = useRef(null)
  const setHoverState = useCallback((id) => {
    const m = map.current
    if (!m || !m.getSource('studios-clustered')) return
    if (hoverStateId.current && hoverStateId.current !== id) {
      m.setFeatureState({ source: 'studios-clustered', id: hoverStateId.current }, { hover: false })
    }
    if (id) m.setFeatureState({ source: 'studios-clustered', id }, { hover: true })
    hoverStateId.current = id || null
  }, [])

  const selectStateId = useRef(null)
  const setSelectedState = useCallback((id) => {
    const m = map.current
    if (!m || !m.getSource('studios-clustered')) return
    if (selectStateId.current && selectStateId.current !== id) {
      m.setFeatureState({ source: 'studios-clustered', id: selectStateId.current }, { selected: false })
    }
    if (id) m.setFeatureState({ source: 'studios-clustered', id }, { selected: true })
    selectStateId.current = id || null
  }, [])

  const markVisited = useCallback((studio) => {
    const id = studio?.id
    if (!id || visitedRef.current.has(id)) return
    visitedRef.current.add(id)
    try {
      window.localStorage.setItem(VISITED_KEY, JSON.stringify([...visitedRef.current].slice(-VISITED_CAP)))
    } catch { /* storage full/blocked — the pin state is a courtesy */ }
    if (map.current?.getSource('studios-clustered')) {
      map.current.setFeatureState({ source: 'studios-clustered', id }, { visited: true })
    }
    setVisitedVersion(v => v + 1)
  }, [])

  // ── Selection ──
  const selectStudio = useCallback((s, { fly = false } = {}) => {
    if (!s || s.latitude == null || s.longitude == null) return
    setSelected(s)
    setSelectedState(s.id)
    if (fly && map.current) {
      const target = Math.max(map.current.getZoom(), 12.5)
      map.current.flyTo({
        center: displayCoords(s),
        zoom: target,
        padding: cameraPadding(),
        speed: 1.4,
        curve: 1.42,
        maxDuration: 2600,
      })
    }
  }, [cameraPadding, setSelectedState])

  const clearSelected = useCallback(() => {
    setSelected(null)
    setSelectedState(null)
  }, [setSelectedState])

  // ESC closes the selection card / list sheet
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        clearSelected()
        setMobileListOpen(false)
        setShowPlaceDropdown(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelected])

  // Build map once on mount (or tab switch) using allStudios as the initial dataset.
  // Does NOT depend on `studios` — semantic updates go through the source-update effect below.
  useEffect(() => {
    if (activeTab !== 'map') return
    if (!allStudios.length || !mapContainer.current) return
    if (map.current) { try { map.current.remove() } catch(e) {} map.current = null }

    const studiosWithEvents = new Set((events || []).map(e => e.venue_id))
    const eventByStudio = {}
    ;(events || []).forEach(e => { if (!eventByStudio[e.venue_id]) eventByStudio[e.venue_id] = e })

    let cancelled = false
    import('mapbox-gl').then(mapboxgl => {
      if (cancelled || !mapContainer.current) return
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      const m = new mapboxgl.default.Map({
        container: mapContainer.current,
        // "Atlas Paper" — the code-defined editorial basemap (see
        // lib/map/atlasPaperStyle.js). Not a Studio style: the palette lives
        // in the repo beside the design tokens it mirrors.
        style: ATLAS_PAPER_STYLE,
        bounds: AUSTRALIA_BOUNDS,
        fitBoundsOptions: { padding: cameraPadding() },
        projection: 'mercator',
        minZoom: MIN_ZOOM,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
      })
      map.current = m

      m.on('error', (e) => console.error('[map error]', e?.error?.message || e))
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') window.__atlasMap = m

      m.addControl(new mapboxgl.default.AttributionControl({ compact: true }), 'bottom-left')
      m.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'bottom-right')
      m.addControl(new mapboxgl.default.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        showUserHeading: false,
      }), 'bottom-right')

      m.on('load', () => {
        if (cancelled) return
        // Seed with whatever is in studiosRef at load time (may already be a semantic result set)
        const initialStudios = studiosRef.current.length ? studiosRef.current : allStudios
        const filtered = getFiltered(initialStudios, typeFilter, stateFilter, search, experiencesFilter)
        filteredRef.current = filtered

        // Per-category accumulators feed the donut cluster charts.
        const clusterProperties = {}
        for (const k of Object.keys(TYPE_COLORS)) {
          clusterProperties[k] = ['+', ['case', ['==', ['get', 'category'], k], 1, 0]]
        }

        m.addSource('studios-clustered', {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: 10,
          clusterMinPoints: 8,
          clusterRadius: 50,
          clusterProperties,
          promoteId: 'id',
          data: buildGeoJSON(filtered, studiosWithEvents, eventByStudio),
        })

        const roof = m.getLayer(ATLAS_LABEL_ROOF) ? ATLAS_LABEL_ROOF : undefined

        // Grey underlay for the smart filter: studios that DON'T match the
        // active query stay visible as quiet grey dots (context, not noise),
        // while matches keep colour, clustering, labels and counts.
        m.addSource('studios-dimmed', {
          type: 'geojson',
          cluster: false,
          promoteId: 'id',
          data: { type: 'FeatureCollection', features: [] },
        })
        m.addLayer({
          id: 'pins-dimmed', type: 'circle', source: 'studios-dimmed',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 6, 4, 10, 5, 14, 6.5],
            'circle-color': '#BAB2A2',
            'circle-opacity': 0.45,
            'circle-opacity-transition': { duration: 420 },
            'circle-stroke-width': 1,
            'circle-stroke-color': PAPER,
            'circle-stroke-opacity': 0.5,
          },
        }, roof)

        // Hover / selected halo — invisible until feature-state flips.
        m.addLayer({
          id: 'pins-halo', type: 'circle', source: 'studios-clustered',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 11, 6, 13, 10, 14, 14, 17],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['case',
              ['boolean', ['feature-state', 'selected'], false], 0.28,
              ['boolean', ['feature-state', 'hover'], false], 0.20,
              0],
          },
        }, roof)

        // Filter-emphasis glow — a soft colour halo behind matched pins that
        // swells as the filter narrows (driven by setPaintProperty from the
        // filter effect). Invisible when no filter is active.
        m.addLayer({
          id: 'pins-match-glow', type: 'circle', source: 'studios-clustered',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': pinRadius(1),
            'circle-color': ['get', 'color'],
            'circle-opacity': 0,
            'circle-blur': 0.35,
            'circle-radius-transition': { duration: 420 },
            'circle-opacity-transition': { duration: 420 },
          },
        }, roof)

        // Standard pins — radius scales with zoom; premium/appointment tiers
        // get a distinct ring (preserves the WIP tier legend).
        m.addLayer({
          id: 'pins-appointment', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tier'], 'appointment']],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 6, 6.5, 10, 7.5, 14, 9.5],
            'circle-color': 'transparent',
            'circle-stroke-width': 2, 'circle-stroke-color': ['get', 'color'],
          },
        }, roof)
        m.addLayer({
          id: 'pins', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'tier'], 'appointment'], ['!=', ['get', 'tier'], 'premium']],
          paint: {
            'circle-radius': pinRadius(1),
            'circle-radius-transition': { duration: 420 },
            'circle-stroke-width-transition': { duration: 420 },
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.75,
            'circle-stroke-color': PAPER,
            'circle-opacity': ['case', ['boolean', ['feature-state', 'visited'], false], 0.45, 1],
            'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'visited'], false], 0.6, 1],
          },
        }, roof)
        m.addLayer({
          id: 'pins-premium', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tier'], 'premium']],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 6, 7.5, 10, 8.5, 14, 10.5],
            'circle-color': PREMIUM_COLOR,
            'circle-stroke-width': 2.5, 'circle-stroke-color': PAPER,
            'circle-opacity': ['case', ['boolean', ['feature-state', 'visited'], false], 0.45, 1],
          },
        }, roof)

        // Selected ring — crisp outline on the active pin.
        m.addLayer({
          id: 'pins-selected-ring', type: 'circle', source: 'studios-clustered',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 9, 6, 11, 10, 12, 14, 15],
            'circle-color': 'transparent',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.95, 0],
          },
        }, roof)

        // Event pulse — a soft ring on studios with an upcoming event.
        m.addLayer({
          id: 'pins-event-pulse', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasEvent'], true]],
          paint: { 'circle-radius': 14, 'circle-color': 'transparent', 'circle-stroke-width': 2, 'circle-stroke-color': PREMIUM_COLOR, 'circle-stroke-opacity': 0.55 },
        }, roof)

        // Studio name labels at town zoom.
        m.addLayer({
          id: 'pin-labels', type: 'symbol', source: 'studios-clustered',
          minzoom: 11,
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'labelShow'], true]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10.5, 14, 12],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 1.05,
            'text-justify': 'auto',
            'text-max-width': 10,
            'text-padding': 6,
          },
          paint: {
            'text-color': '#4A443B',
            'text-halo-color': 'rgba(251,249,244,0.92)',
            'text-halo-width': 1.4,
          },
        }, roof)

        // Donut cluster markers — the cluster tells you what's inside, not
        // just how many.
        donuts.current = attachDonutClusters(mapboxgl.default, m, 'studios-clustered', {
          segments: Object.keys(TYPE_COLORS).map(k => ({ key: k, color: TYPE_COLORS[k] })),
          onClusterClick: (clusterId, coords) => {
            m.getSource('studios-clustered').getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return
              m.easeTo({ center: coords, zoom: zoom + 0.5, padding: cameraPadding(), duration: 650 })
            })
          },
        })

        const pinLayers = ['pins-appointment', 'pins', 'pins-premium']
        pinLayers.forEach(layer => {
          m.on('mouseenter', layer, () => { m.getCanvas().style.cursor = 'pointer' })
          m.on('mouseleave', layer, () => { m.getCanvas().style.cursor = '' })
        })
        m.on('mousemove', pinLayers, (e) => {
          if (!e.features?.length) return
          const f = e.features[0]
          if (hoverStateId.current !== f.id) {
            if (hoverStateId.current) m.setFeatureState({ source: 'studios-clustered', id: hoverStateId.current }, { hover: false })
            if (f.id) m.setFeatureState({ source: 'studios-clustered', id: f.id }, { hover: true })
            hoverStateId.current = f.id || null
          }
        })
        pinLayers.forEach(layer => {
          m.on('click', layer, (e) => {
            const props = e.features[0].properties
            const s = studiosRef.current.find(x => String(x.id) === String(props.id))
            if (s) selectStudio(s)
          })
        })

        // Dismiss card on empty click. Cluster clicks are handled entirely by
        // the donut markers' own click listener (see attachDonutClusters
        // above) — there is no separate Mapbox circle layer for clusters.
        m.on('click', (e) => {
          const features = m.queryRenderedFeatures(e.point, { layers: pinLayers })
          if (!features.length) clearSelected()
        })

        // Apply remembered visited states so pins the reader has already
        // opened arrive pre-dimmed.
        for (const id of visitedRef.current) {
          m.setFeatureState({ source: 'studios-clustered', id }, { visited: true })
        }

        let t = null
        m.on('moveend', () => {
          clearTimeout(t)
          t = setTimeout(() => { updateInView() }, 160)
        })
        updateInView()

        setMapReady(true)
      })
    })

    return () => {
      cancelled = true
      if (donuts.current) { donuts.current.detach(); donuts.current = null }
      if (cardMarker.current) { try { cardMarker.current.remove() } catch (e) {} cardMarker.current = null }
      if (map.current) { try { map.current.remove() } catch(e) {} map.current = null }
    }
  }, [allStudios, events, activeTab]) // <-- allStudios not studios: only rebuilds on initial load / tab switch

  // Fit map to a set of studios
  const fitToStudios = useCallback((studioList) => {
    if (!map.current || !studioList?.length) return
    const withCoords = studioList.filter(v => v.latitude && v.longitude)
    if (!withCoords.length) return
    if (withCoords.length === 1) {
      map.current.flyTo({ center: displayCoords(withCoords[0]), zoom: 11, padding: cameraPadding(), duration: 800 })
      return
    }
    const lngs = withCoords.map(v => parseFloat(v.longitude))
    const lats = withCoords.map(v => parseFloat(v.latitude))
    map.current.fitBounds(
      [[Math.min(...lngs) - 0.3, Math.min(...lats) - 0.3], [Math.max(...lngs) + 0.3, Math.max(...lats) + 0.3]],
      { padding: cameraPadding(), duration: 800, maxZoom: 12 }
    )
  }, [cameraPadding])

  // Fit to pending results whenever mapReady or a new fitRequest comes in
  useEffect(() => {
    if (!mapReady || !pendingFitRef.current) return
    fitToStudios(pendingFitRef.current)
    pendingFitRef.current = null
  }, [mapReady, fitRequest, fitToStudios])

  // Update map source whenever studios (semantic results), filters, OR the
  // smart pin query change.
  useEffect(() => {
    if (!mapReady || !map.current) return
    const studiosWithEvents = new Set((events || []).map(e => e.venue_id))
    const eventByStudio = {}
    ;(events || []).forEach(e => { if (!eventByStudio[e.venue_id]) eventByStudio[e.venue_id] = e })
    // Base set — the existing type/state/name/experiences filters over the
    // current display set (which may already be a SemanticSearchBar result).
    const base = getFiltered(studios, typeFilter, stateFilter, search, experiencesFilter)
    // The smart query (matchedIds from the hook) splits the base set: matches
    // keep colour, clustering, labels and counts; the rest grey out underneath
    // as context. matchedIds === null means no smart query is active.
    const matches = matchedIds ? base.filter(s => matchedIds.has(s.id)) : base
    const rest = matchedIds ? base.filter(s => !matchedIds.has(s.id)) : []
    filteredRef.current = matches
    setStudioCount(matches.length)
    const source = map.current.getSource('studios-clustered')
    if (source) {
      source.setData(buildGeoJSON(matches, studiosWithEvents, eventByStudio))
      // Cluster ids and mixes change with the data — stale donuts must go.
      donuts.current?.invalidate()
    }
    const dimmedSource = map.current.getSource('studios-dimmed')
    if (dimmedSource) dimmedSource.setData(buildGeoJSON(rest, studiosWithEvents, eventByStudio))

    // Prominence scales with how far the filter narrowed the field: survivors
    // grow, gain a swelling colour glow and a bolder rim; the greyed-out rest
    // fades further back so the matches pop.
    const m = map.current
    const e = matchEmphasis(matches.length, !!matchedIds)
    if (m.getLayer('pins')) {
      m.setPaintProperty('pins', 'circle-radius', pinRadius(1 + 0.95 * e))
      m.setPaintProperty('pins', 'circle-stroke-width', 1.75 + 1.35 * e)
    }
    if (m.getLayer('pins-match-glow')) {
      m.setPaintProperty('pins-match-glow', 'circle-radius', pinRadius(1 + 2.4 * e))
      m.setPaintProperty('pins-match-glow', 'circle-opacity', 0.34 * e)
    }
    if (m.getLayer('pins-dimmed')) {
      m.setPaintProperty('pins-dimmed', 'circle-opacity', 0.45 - 0.24 * e)
    }

    // Drop a selection that filtering (any of the filters or the smart query)
    // has removed from the visible matched set.
    if (selectedRef.current && !matches.some(s => s.id === selectedRef.current.id)) clearSelected()

    // When a geographic smart query resolves, fly the camera to it — otherwise
    // the accurate, place-scoped results sit off-screen. A specific place/
    // region/suburb frames the matched studios; a bare state frames the state.
    // Fires once per resolved query (flownForQuery guard), never on pan.
    const sem = semantic
    if (sem && (sem.placeDetected || sem.stateCode) && flownForQuery.current !== sem.query) {
      flownForQuery.current = sem.query
      if (sem.placeDetected) {
        let pts = matches.filter(s => inSemanticSet(s, sem.ids)).map(displayCoords)
        if (!pts.length) pts = matches.map(displayCoords)
        pts = pts.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
        if (pts.length) {
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
          for (const [lng, lat] of pts) {
            if (lng < minLng) minLng = lng
            if (lat < minLat) minLat = lat
            if (lng > maxLng) maxLng = lng
            if (lat > maxLat) maxLat = lat
          }
          m.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: cameraPadding(), maxZoom: 12.5, duration: 900 })
        }
      } else if (sem.stateCode && STATE_BOUNDS[sem.stateCode]) {
        const b = STATE_BOUNDS[sem.stateCode]
        m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: cameraPadding(), duration: 900 })
      }
    }
    if (!appliedPinQuery) flownForQuery.current = null

    updateInView()
  }, [studios, typeFilter, stateFilter, search, experiencesFilter, events, mapReady, matchedIds, semantic, appliedPinQuery, clearSelected, updateInView, cameraPadding])

  // Keep the shareable `?q=` in sync with the smart pin filter — matching the
  // portal. Only owns the param when the SemanticSearchBar isn't (that flow
  // writes its own `?q=` via handleSemanticResults / clearSemanticSearch).
  useEffect(() => {
    if (typeof window === 'undefined' || semanticActive) return
    const url = new URL(window.location.href)
    if (appliedPinQuery) url.searchParams.set('q', appliedPinQuery)
    else url.searchParams.delete('q')
    window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
  }, [appliedPinQuery, semanticActive])

  // ── Anchored selection card (desktop): one marker as a React portal, so
  // the map engine keeps the card glued to its pin through pan/zoom. ──
  useEffect(() => {
    if (!mapReady || !map.current) return
    if (cardMarker.current) { try { cardMarker.current.remove() } catch (e) {} cardMarker.current = null; setCardPortalEl(null) }
    if (!selected) return
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
    if (mobile) return // mobile renders the docked card instead
    let alive = true
    import('mapbox-gl').then(mapboxgl => {
      if (!alive || !map.current || selectedRef.current?.id !== selected.id) return
      const el = document.createElement('div')
      el.className = 'map-card-anchor'
      cardMarker.current = new mapboxgl.default.Marker({ element: el, anchor: 'bottom', offset: [0, -22] })
        .setLngLat(displayCoords(selected))
        .addTo(map.current)
      setCardPortalEl(el)
    })
    return () => {
      alive = false
      if (cardMarker.current) { try { cardMarker.current.remove() } catch (e) {} cardMarker.current = null }
      setCardPortalEl(null)
    }
  }, [selected, mapReady])

  // Mapbox canvases don't track size while display:none — recalc when the
  // user switches back from the Build-a-Maker-Trail tab.
  useEffect(() => {
    if (activeTab === 'map' && map.current) map.current.resize()
  }, [activeTab])

  // Zoom to state when state filter changes
  useEffect(() => {
    if (!mapReady || !map.current || stateFilter === 'All States') return
    const bounds = STATE_BOUNDS[stateFilter]
    if (!bounds) return
    map.current.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: cameraPadding(), duration: 800 })
  }, [stateFilter, mapReady, cameraPadding])

  // Panel toggle — the camera re-centres into the uncovered area.
  function togglePanel() {
    const next = !panelOpen
    setPanelOpen(next)
    if (map.current) map.current.easeTo({ padding: cameraPadding(next), duration: 380 })
  }

  const tabBtnStyle = (tab) => ({
    padding: '5px 14px',
    borderRadius: 2,
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    background: activeTab === tab ? 'var(--primary)' : 'rgba(139,117,87,0.1)',
    color: activeTab === tab ? '#fff' : 'var(--text-2)',
    transition: 'all 0.15s',
  })

  const activeFilterCount = (typeFilter !== 'All' ? 1 : 0) + (stateFilter !== 'All States' ? 1 : 0) + (experiencesFilter ? 1 : 0) + (search ? 1 : 0) + (appliedPinQuery ? 1 : 0)

  function clearAllFilters() {
    setTypeFilter('All')
    setStateFilter('All States')
    setExperiencesFilter(false)
    setSearch('')
    setPinQuery('')
    clearSemanticSearch()
  }

  // Unified search dropdown — towns/places (studio name filter stays a
  // separate "Filter by name" field, preserving the WIP behaviour).
  const renderPlaceDropdown = (widthStyle) => (
    <div style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 2, background: '#fff',
      border: '1px solid var(--border)', borderRadius: 4,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 1000, maxHeight: 260, overflowY: 'auto',
      ...widthStyle,
    }}>
      {placeResults.map(f => (
        <button key={f.id} onClick={() => handlePlaceSelect(f)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
          <PlacePin />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.text}</span>
            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.place_name.replace(f.text + ', ', '')}</span>
          </span>
          <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: PRIMARY, background: 'rgba(193,96,58,0.1)', borderRadius: 3, padding: '2px 6px' }}>{placeTypeLabel(f)}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh' }}>
      {showTrailModal && <TrailAuthModal onClose={() => setShowTrailModal(false)} />}
      <div style={{ height: 64, flexShrink: 0 }} />

      {/* ── MAP / BUILD A TRAIL toggle — visible on ALL screen sizes ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexShrink: 0, zIndex: 10 }}>
        <button style={tabBtnStyle('map')} onClick={() => setActiveTab('map')}>Map</button>
        <button style={tabBtnStyle('builder')} onClick={() => {
          // On phones the iframed builder has its OWN Builder/Map tab bar, which would
          // stack a second tab bar under this one. Go full-page instead (it has a "← Map" link).
          if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) { window.location.href = '/trails/builder'; return }
          if (user) { setActiveTab('builder') } else { setShowTrailModal(true) }
        }}>Build a Maker Trail</button>
      </div>

      {/* ── DESKTOP TOOLBAR (hidden on mobile) ── */}
      <div ref={toolbarRef} className="map-desktop-toolbar">
        {activeTab === 'map' && (
          <div style={{ padding: '10px 20px 0', background: 'var(--bg-2)', flexShrink: 0, zIndex: 11 }}>
            <SemanticSearchBar onResults={handleSemanticResults} compact />
            {semanticActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px 8px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)' }}>
                  {studioCount} result{studioCount !== 1 ? 's' : ''}
                </span>
                <button onClick={clearSemanticSearch} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '2px 8px', borderRadius: 2, border: '1px solid var(--border)', background: 'none', color: 'var(--primary)', cursor: 'pointer', letterSpacing: '0.04em' }}>
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexWrap: 'wrap', flexShrink: 0, zIndex: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name..."
              style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 12, outline: 'none', borderRadius: 2, width: 160, fontFamily: 'var(--font-sans)' }} />
            {/* Geocoding place search */}
            <div ref={placeSearchRef} style={{ position: 'relative', minWidth: 150, maxWidth: 200 }}>
              <input type="text" placeholder="Search a location..." value={placeQuery}
                onChange={e => { setPlaceQuery(e.target.value); if (!e.target.value) setShowPlaceDropdown(false) }}
                onFocus={() => { if (placeResults.length) setShowPlaceDropdown(true) }}
                style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 12, outline: 'none', borderRadius: 2, width: '100%', fontFamily: 'var(--font-sans)' }} />
              {showPlaceDropdown && placeResults.length > 0 && renderPlaceDropdown({ right: 0, left: 'auto', width: 260 })}
            </div>
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} aria-pressed={typeFilter === t} style={{ padding: '5px 12px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: typeFilter === t ? 'var(--primary)' : 'rgba(139,117,87,0.1)', color: typeFilter === t ? 'var(--bg)' : 'var(--text-2)', transition: 'all 0.15s' }}>{t}</button>
            ))}
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <button onClick={() => setExperiencesFilter(v => !v)} aria-pressed={experiencesFilter} style={{ padding: '5px 12px', borderRadius: 2, border: experiencesFilter ? '1px solid var(--accent)' : '1px solid transparent', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: experiencesFilter ? 'rgba(122,140,126,0.15)' : 'rgba(139,117,87,0.1)', color: experiencesFilter ? 'var(--accent)' : 'var(--text-2)', transition: 'all 0.15s' }}>Experiences & Classes</button>
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              aria-label="Filter by state"
              className="atlas-select"
              style={{ padding: '5px 9px', border: 'none', background: stateFilter !== 'All States' ? 'rgba(139,117,87,0.15)' : 'transparent', color: stateFilter !== 'All States' ? 'var(--text)' : 'var(--text-3)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', outline: 'none' }}
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-3)' }}>
              <span>{loading ? 'Loading...' : filterBusy ? 'Searching…' : placesLabel(studioCount)}</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MAP (both desktop and mobile) ── */}
      {activeTab === 'map' && (
        <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

          {/* ── DESKTOP DISCOVERY PANEL — the gazetteer ── */}
          <div className="map-desktop-toolbar" style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 9,
            width: PANEL_W,
            transform: panelOpen ? 'translateX(0)' : `translateX(-${PANEL_W}px)`,
            transition: 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(250,247,242,0.98)',
              borderRight: '1px solid var(--border)', boxShadow: '4px 0 24px rgba(30,26,23,0.07)',
            }}>
              {mapReady && (
                <DiscoveryPanel
                  mode="panel"
                  items={inView.items}
                  totalInView={inView.total}
                  totalAll={studioCount}
                  loading={loading}
                  selectedId={selected?.id || null}
                  visitedIds={visitedRef.current}
                  filterQuery={pinQuery}
                  onFilterQuery={setPinQuery}
                  filterBusy={filterBusy}
                  onHover={setHoverState}
                  onSelect={(s) => selectStudio(s, { fly: map.current ? map.current.getZoom() < 11 : false })}
                />
              )}
            </div>
            {/* Collapse handle */}
            <button
              onClick={togglePanel}
              aria-label={panelOpen ? 'Hide list' : 'Show list'}
              aria-expanded={panelOpen}
              style={{
                position: 'absolute', top: '50%', right: -22, transform: 'translateY(-50%)',
                width: 22, height: 56, borderRadius: '0 8px 8px 0',
                background: 'rgba(250,247,242,0.98)', border: '1px solid var(--border)', borderLeft: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '3px 0 10px rgba(30,26,23,0.08)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: panelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Anchored selection card — portalled into a Mapbox marker */}
          {selected && cardPortalEl && createPortal(
            <MapPreviewCard
              listing={selected}
              variant="anchored"
              onClose={clearSelected}
              onVisit={markVisited}
            />,
            cardPortalEl
          )}

          {/* Desktop legend — slides with the panel */}
          <div className="map-desktop-toolbar" style={{ position: 'absolute', bottom: 40, left: panelOpen ? PANEL_W + 16 : 16, transition: 'left 0.38s cubic-bezier(0.22, 1, 0.36, 1)', background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 4, zIndex: 5, overflow: 'hidden' }}>
            <button
              onClick={() => setLegendCollapsed(c => !c)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', gap: 24 }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Legend</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" style={{ transform: legendCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {!legendCollapsed && (
              <div style={{ padding: '0 14px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Craft Types</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{TYPE_LABELS[type] || type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Listing Tier</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[['Basic', 5, '#9a8878'], ['Standard', 7, '#4a7c59'], ['Premium', 9, PREMIUM_COLOR]].map(([label, size, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{label}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', border: `2px solid ${PREMIUM_COLOR}`, display: 'inline-block', opacity: 0.7 }} />
                      <span style={{ fontSize: 10, color: 'var(--text-2)' }}>Upcoming event</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <span className="map-spinner" />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.04em' }}>Loading the atlas…</span>
              </div>
            </div>
          )}

          {/* Empty state — every pin filtered away. Suppressed while the smart
              filter is still resolving (filterBusy): count===0 then means "not
              answered yet", not "nothing matches", so the card must not flash. */}
          {!loading && mapReady && studioCount === 0 && !filterBusy && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
              <div style={{ pointerEvents: 'auto', textAlign: 'center', background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 6, padding: '20px 26px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', maxWidth: 320 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                  {filterActive ? `Nothing matches “${appliedPinQuery}”` : 'No studios match these filters'}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 14 }}>
                  {filterActive ? 'Try fewer words, a different phrasing, or clear the filter.' : 'Try widening the state filter or the craft type.'}
                </div>
                <button onClick={clearAllFilters} style={{ padding: '8px 18px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                  Clear all filters
                </button>
              </div>
            </div>
          )}

          {/* ── FLOATING SMART FILTER (desktop) — the hero filter, centred over
              the map at the portal's exact placement (bottom: 30, left tracks
              the panel, `min(520px)` pill). Hidden on mobile via
              map-desktop-toolbar; the mobile sheet's DiscoveryPanel filter
              field carries it there. */}
          <SmartMapFilter
            pinQuery={pinQuery}
            setPinQuery={setPinQuery}
            filterActive={filterActive}
            filterBusy={filterBusy}
            count={studioCount}
            panelOpen={panelOpen}
            panelW={PANEL_W}
          />

          {/* ── MOBILE FABs ── */}
          {/* Search / filter FAB */}
          <button
            className="map-mobile-only"
            onClick={() => setMobileSheetOpen(o => !o)}
            style={{
              position: 'absolute', bottom: 100, right: 16, zIndex: 10,
              width: 48, height: 48, borderRadius: '50%',
              background: mobileSheetOpen ? PRIMARY : 'rgba(250,247,242,0.97)',
              border: `1px solid ${mobileSheetOpen ? PRIMARY : 'var(--border)'}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {mobileSheetOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeFilterCount > 0 ? PRIMARY : 'var(--text-2)'} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            )}
            {activeFilterCount > 0 && !mobileSheetOpen && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: PRIMARY, border: '1.5px solid white' }} />
            )}
          </button>

          {/* Legend FAB */}
          <button
            className="map-mobile-only"
            onClick={() => setMobileLegendOpen(o => !o)}
            style={{
              position: 'absolute', bottom: 160, right: 16, zIndex: 10,
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 16,
              color: 'var(--text-2)', fontWeight: 600,
            }}
          >
            ⓘ
          </button>

          {/* Mobile legend popover */}
          {mobileLegendOpen && (
            <div className="map-mobile-only" style={{
              position: 'absolute', bottom: 220, right: 16, zIndex: 10,
              background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '12px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Craft Types</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{TYPE_LABELS[type] || type.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile "List" pill — persistent, labelled, opens the gazetteer as
              a full sheet (the WIP-preserved studio count sits alongside). */}
          {!mobileSheetOpen && !mobileListOpen && (
            <button className="map-mobile-only" onClick={() => { clearSelected(); setMobileListOpen(true) }} style={{
              position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 11,
              alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 24,
              background: 'var(--text)', color: 'var(--bg)', border: 'none',
              boxShadow: '0 4px 16px rgba(30,26,23,0.3)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.03em',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              List{mapReady && !loading ? ` · ${inView.total.toLocaleString()}` : ''}
            </button>
          )}

          {/* Mobile list sheet — the gazetteer, full height */}
          {mobileListOpen && (
            <div className="map-mobile-only" style={{
              position: 'absolute', inset: 0, top: 44, zIndex: 22, flexDirection: 'column',
              background: 'rgba(250,247,242,0.99)', borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.14)', overflow: 'hidden',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '8px auto 6px', flexShrink: 0 }} />
              <DiscoveryPanel
                mode="sheet"
                items={inView.items}
                totalInView={inView.total}
                totalAll={studioCount}
                loading={loading}
                selectedId={selected?.id || null}
                visitedIds={visitedRef.current}
                filterQuery={pinQuery}
                onFilterQuery={setPinQuery}
                filterBusy={filterBusy}
                onHover={() => {}}
                onSelect={(s) => { setMobileListOpen(false); selectStudio(s, { fly: true }) }}
                onClose={() => setMobileListOpen(false)}
              />
            </div>
          )}

          {/* Mobile docked selection card */}
          {selected && !mobileListOpen && (
            <div className="map-mobile-only" style={{ position: 'absolute', left: 10, right: 10, bottom: 84, zIndex: 21, flexDirection: 'column' }}>
              <MapPreviewCard
                listing={selected}
                variant="docked"
                onClose={clearSelected}
                onVisit={markVisited}
              />
            </div>
          )}

          {/* ── MOBILE BOTTOM SHEET (filters) ── */}
          {mobileSheetOpen && (
            <div className="map-mobile-only" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
              background: 'rgba(250,247,242,0.99)',
              borderTop: '1px solid var(--border)',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
              padding: '8px 0 32px',
              maxHeight: '70vh',
              overflowY: 'auto',
              flexDirection: 'column',
            }}>
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '4px auto 16px' }} />

              {/* Search */}
              <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border)' }}>
                <SemanticSearchBar onResults={(results, meta) => { handleSemanticResults(results, meta); if (results) setMobileSheetOpen(false) }} compact />
                {semanticActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-3)' }}>{studioCount} result{studioCount !== 1 ? 's' : ''}</span>
                    <button onClick={() => { clearSemanticSearch(); }} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, padding: '2px 8px', borderRadius: 2, border: '1px solid var(--border)', background: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Clear</button>
                  </div>
                )}
              </div>

              {/* Name filter */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Filter by name</div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Studio name..."
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none', borderRadius: 4, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
              </div>

              {/* Location search */}
              <div ref={mobilePlaceSearchRef} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Search a location</div>
                <input type="text" placeholder="Town, suburb, postcode..." value={placeQuery}
                  onChange={e => { setPlaceQuery(e.target.value); if (!e.target.value) setShowPlaceDropdown(false) }}
                  onFocus={() => { if (placeResults.length) setShowPlaceDropdown(true) }}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none', borderRadius: 4, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
                {showPlaceDropdown && placeResults.length > 0 && renderPlaceDropdown({ width: '100%', maxHeight: '40vh' })}
              </div>

              {/* Type filters */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>Craft type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} style={{
                      padding: '7px 14px', borderRadius: 20, border: `1px solid ${typeFilter === t ? PRIMARY : 'var(--border)'}`,
                      cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                      background: typeFilter === t ? PRIMARY : 'transparent',
                      color: typeFilter === t ? '#fff' : 'var(--text-2)', transition: 'all 0.15s',
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Experiences & Classes filter */}
              <div style={{ padding: '14px 20px' }}>
                <button onClick={() => setExperiencesFilter(v => !v)} style={{
                  padding: '7px 14px', borderRadius: 20, border: `1px solid ${experiencesFilter ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                  background: experiencesFilter ? 'rgba(122,140,126,0.15)' : 'transparent',
                  color: experiencesFilter ? 'var(--accent)' : 'var(--text-2)', transition: 'all 0.15s',
                }}>Experiences & Classes</button>
              </div>

              {/* State filters */}
              <div style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>State</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATES.map(s => (
                    <button key={s} onClick={() => { setStateFilter(s); setMobileSheetOpen(false) }} style={{
                      padding: '7px 14px', borderRadius: 20, border: `1px solid ${stateFilter === s ? PRIMARY : 'var(--border)'}`,
                      cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                      background: stateFilter === s ? PRIMARY : 'transparent',
                      color: stateFilter === s ? '#fff' : 'var(--text-2)', transition: 'all 0.15s',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Count + clear all */}
              <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-3)' }}>
                  {loading ? 'Loading…' : placesLabel(studioCount)}
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: PRIMARY, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maker Trail builder — embedded iframe */}
      {activeTab === 'builder' && (
        <div className="builder-iframe-container" style={{ flex: 1, minHeight: 0 }}>
          <iframe
            src="/trails/builder?embed=1&tab=builder"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Maker Trail Builder"
          />
        </div>
      )}

      <style>{`
        .map-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(193,96,58,0.25); border-top-color: #C1603A; animation: map-spin 0.8s linear infinite; display: inline-block; flex-shrink: 0; }
        @keyframes map-spin { to { transform: rotate(360deg); } }
        /* Hover transitions live on the INNER .atlas-donut only — the marker
           root is repositioned by mapbox every frame and must never carry a
           transform transition (pins would swim behind the canvas). */
        .atlas-donut { cursor: pointer; filter: drop-shadow(0 2px 6px rgba(30,26,23,0.22)); transition: transform 0.16s ease; }
        .atlas-donut:hover { transform: scale(1.08); }
        @media (prefers-reduced-motion: reduce) {
          .atlas-donut, .atlas-donut:hover { transition: none; transform: none; }
        }
        .map-card-anchor { z-index: 30; }
        .map-panel-row:hover { background: rgba(193,96,58,0.06) !important; }
        .map-panel-row:focus-visible { outline: 2px solid #C1603A; outline-offset: -2px; }
        .map-mobile-only { display: none !important; }
        @media (max-width: 768px) {
          .map-desktop-toolbar { display: none !important; }
          .map-mobile-only { display: flex !important; }
          .builder-iframe-container { flex: none !important; height: calc(100svh - 64px - 41px) !important; }
        }
      `}</style>
    </div>
  )
}
