'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { TYPE_COLORS, STATES } from '@/lib/constants'
import SemanticSearchBar from './SemanticSearchBar'

const PRIMARY = '#C1603A'

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
const PREMIUM_COLOR = '#c8943a'

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

export default function MapPageClient() {
  const router = useRouter()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const popup = useRef(null)
  // allStudios: full dataset, never mutated after load
  // studios: current display set (filtered by semantic search)
  const [allStudios, setAllStudios] = useState([])
  const [studios, setStudios] = useState([])
  const [events, setEvents] = useState([])
  const [typeFilter, setTypeFilter] = useState('All')
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
  const [legendCollapsed, setLegendCollapsed] = useState(false)

  // Keep a ref to studios so the map source update effect always has the latest value
  const studiosRef = useRef([])
  useEffect(() => { studiosRef.current = studios }, [studios])
  const pendingFitRef = useRef(null) // studios to fit bounds to once map is ready

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase()
      const [{ data: studioData }, { data: eventData }, { data: { user: currentUser } }] = await Promise.all([
        supabase.from('venues').select('id, name, slug, category, state, suburb, latitude, longitude, tier, description').eq('published', true),
        supabase.from('events').select('venue_id, title, event_date, event_type').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }),
        supabase.auth.getUser(),
      ])
      if (studioData) {
        setAllStudios(studioData)
        setStudios(studioData)
        setStudioCount(studioData.length)
      }
      if (eventData) setEvents(eventData || [])
      setUser(currentUser ?? null)
      setLoading(false)
      // Auto-fire semantic search + fit bounds if ?q= param present
      const qParam = new URLSearchParams(window.location.search).get('q')
      if (qParam) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(qParam)}`)
          if (res.ok) {
            const { venues: results } = await res.json()
            setStudios(results)
            setSemanticActive(true)
            pendingFitRef.current = results
            setFitRequest(n => n + 1)
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

  // Build map once on mount (or tab switch) using allStudios as the initial dataset.
  // Does NOT depend on `studios` — semantic updates go through the source-update effect below.
  useEffect(() => {
    if (activeTab !== 'map') return
    if (!allStudios.length || !mapContainer.current) return
    if (map.current) { try { map.current.remove() } catch(e) {} map.current = null }

    const studiosWithEvents = new Set((events || []).map(e => e.venue_id))
    const eventByStudio = {}
    ;(events || []).forEach(e => { if (!eventByStudio[e.venue_id]) eventByStudio[e.venue_id] = e })

    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        center: [134, -27],
        zoom: 3.8,
        attributionControl: false,
      })

      map.current.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'bottom-right')

      popup.current = new mapboxgl.default.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '280px',
        offset: 12,
      })

      map.current.on('load', () => {
        // Seed with whatever is in studiosRef at load time (may already be a semantic result set)
        const initialStudios = studiosRef.current.length ? studiosRef.current : allStudios
        const filtered = getFiltered(initialStudios, typeFilter, stateFilter, search, experiencesFilter)
        if (map.current.getSource('studios-clustered')) return
        map.current.addSource('studios-clustered', {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: 10,
          clusterMinPoints: 10,
          clusterRadius: 50,
          data: buildGeoJSON(filtered, studiosWithEvents, eventByStudio),
        })

        map.current.addLayer({ id: 'clusters', type: 'circle', source: 'studios-clustered', filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#c8a070', 50, '#C1603A', 200, '#8a6020'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 32],
            'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9,
          }
        })
        map.current.addLayer({ id: 'cluster-count', type: 'symbol', source: 'studios-clustered', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 13 },
          paint: { 'text-color': '#ffffff' }
        })
        map.current.addLayer({ id: 'pins-basic', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['!', ['in', ['get', 'tier'], ['literal', ['standard', 'premium']]]]],
          paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 1 }
        })
        map.current.addLayer({ id: 'pins-standard-glow', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tier'], 'standard']],
          paint: { 'circle-radius': 13, 'circle-color': 'transparent', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#C1603A', 'circle-stroke-opacity': 0.5, 'circle-opacity': 0 }
        })
        map.current.addLayer({ id: 'pins-standard', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tier'], 'standard']],
          paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 1 }
        })
        map.current.addLayer({ id: 'pins-premium', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tier'], 'premium']],
          paint: { 'circle-radius': 9, 'circle-color': PREMIUM_COLOR, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 1 }
        })
        map.current.addLayer({ id: 'pins-event-pulse', type: 'circle', source: 'studios-clustered',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasEvent'], true]],
          paint: { 'circle-radius': 14, 'circle-color': 'transparent', 'circle-stroke-width': 2, 'circle-stroke-color': PREMIUM_COLOR, 'circle-stroke-opacity': 0.6, 'circle-opacity': 0 }
        })

        const pinLayers = ['pins-basic', 'pins-standard-glow', 'pins-standard', 'pins-premium']
        pinLayers.forEach(layer => {
          map.current.on('mouseenter', layer, () => { map.current.getCanvas().style.cursor = 'pointer' })
          map.current.on('mouseleave', layer, () => { map.current.getCanvas().style.cursor = '' })
          map.current.on('click', layer, (e) => {
            const props = e.features[0].properties
            const coords = e.features[0].geometry.coordinates.slice()
            const eventInfo = props.eventTitle
              ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(139,117,87,0.15);"><div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${PREMIUM_COLOR};margin-bottom:4px;">Upcoming Event</div><div style="font-size:12px;color:#3a3530;font-weight:500;">${props.eventTitle}</div><div style="font-size:11px;color:#9a8878;margin-top:2px;">${formatDate(props.eventDate)}</div></div>`
              : ''
            const tierBadge = props.tier === 'premium'
              ? `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(200,148,58,0.12);border:1px solid rgba(200,148,58,0.3);padding:2px 7px;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${PREMIUM_COLOR};">★ PREMIUM</span>`
              : ''
            const desc = props.description && props.description !== 'null'
              ? props.description.length > 110 ? props.description.slice(0, 110).trimEnd() + '…' : props.description
              : ''
            popup.current.setLngLat(coords).setHTML(
              `<div style="font-family:system-ui,sans-serif;padding:4px 2px;max-width:260px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
                  <span style="display:inline-flex;align-items:center;gap:5px;background:${props.color}18;border:1px solid ${props.color}33;padding:3px 9px;border-radius:2px;">
                    <span style="width:5px;height:5px;border-radius:50%;background:${props.color};display:inline-block;"></span>
                    <span style="font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${props.color};">${props.category}</span>
                  </span>${tierBadge}
                </div>
                <div style="font-family:Georgia,serif;font-size:17px;font-weight:400;color:#1a1614;margin-bottom:3px;letter-spacing:-0.01em;line-height:1.2;">${props.name}</div>
                <div style="font-size:11px;color:#9a8878;margin-bottom:${desc ? 8 : 10}px;">${props.location}</div>
                ${desc ? `<div style="font-size:12px;color:#5a4e45;line-height:1.5;margin-bottom:10px;">${desc}</div>` : ''}
                ${eventInfo}
                <a href="/venue/${props.slug}" style="display:block;margin-top:10px;padding:7px 0;text-align:center;background:#C1603A;color:#fff;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:2px;">View listing →</a>
              </div>`
            ).addTo(map.current)
          })
        })

        map.current.on('click', (e) => {
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['pins-basic','pins-standard-glow','pins-standard','pins-premium'] })
          if (!features.length) popup.current.remove()
        })
        map.current.on('click', 'clusters', (e) => {
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          const clusterId = features[0].properties.cluster_id
          map.current.getSource('studios-clustered').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.current.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 1 })
          })
        })
        map.current.on('mouseenter', 'clusters', () => { map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', 'clusters', () => { map.current.getCanvas().style.cursor = '' })
        setMapReady(true)
      })
    })

    return () => {
      if (popup.current) popup.current.remove()
      if (map.current) { try { map.current.remove() } catch(e) {} map.current = null }
    }
  }, [allStudios, events, activeTab]) // <-- allStudios not studios: only rebuilds on initial load / tab switch

  // Fit map to a set of studios
  const fitToStudios = useCallback((studioList) => {
    if (!map.current || !studioList?.length) return
    const withCoords = studioList.filter(v => v.latitude && v.longitude)
    if (!withCoords.length) return
    if (withCoords.length === 1) {
      map.current.flyTo({ center: [parseFloat(withCoords[0].longitude), parseFloat(withCoords[0].latitude)], zoom: 11, duration: 800 })
      return
    }
    const lngs = withCoords.map(v => parseFloat(v.longitude))
    const lats = withCoords.map(v => parseFloat(v.latitude))
    map.current.fitBounds(
      [[Math.min(...lngs) - 0.3, Math.min(...lats) - 0.3], [Math.max(...lngs) + 0.3, Math.max(...lats) + 0.3]],
      { padding: 60, duration: 800, maxZoom: 12 }
    )
  }, [])

  // Fit to pending results whenever mapReady or a new fitRequest comes in
  useEffect(() => {
    if (!mapReady || !pendingFitRef.current) return
    fitToStudios(pendingFitRef.current)
    pendingFitRef.current = null
  }, [mapReady, fitRequest, fitToStudios])

  // Update map source whenever studios (semantic results) OR filters change
  useEffect(() => {
    if (!mapReady || !map.current) return
    const studiosWithEvents = new Set((events || []).map(e => e.venue_id))
    const eventByStudio = {}
    ;(events || []).forEach(e => { if (!eventByStudio[e.venue_id]) eventByStudio[e.venue_id] = e })
    const filtered = getFiltered(studios, typeFilter, stateFilter, search, experiencesFilter)
    setStudioCount(filtered.length)
    const source = map.current.getSource('studios-clustered')
    if (source) source.setData(buildGeoJSON(filtered, studiosWithEvents, eventByStudio))
  }, [studios, typeFilter, stateFilter, search, experiencesFilter, mapReady])

  // Zoom to state when state filter changes
  useEffect(() => {
    if (!mapReady || !map.current || stateFilter === 'All States') return
    const bounds = STATE_BOUNDS[stateFilter]
    if (!bounds) return
    map.current.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 40, duration: 800 })
  }, [stateFilter, mapReady])

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

  const activeFilterCount = (typeFilter !== 'All' ? 1 : 0) + (stateFilter !== 'All States' ? 1 : 0) + (experiencesFilter ? 1 : 0) + (search ? 1 : 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh' }}>
      {showTrailModal && <TrailAuthModal onClose={() => setShowTrailModal(false)} />}
      <div style={{ height: 64, flexShrink: 0 }} />

      {/* ── MAP / BUILD A TRAIL toggle — visible on ALL screen sizes ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexShrink: 0, zIndex: 10 }}>
        <button style={tabBtnStyle('map')} onClick={() => setActiveTab('map')}>Map</button>
        <button style={tabBtnStyle('builder')} onClick={() => {
          if (user) { setActiveTab('builder') } else { setShowTrailModal(true) }
        }}>Build a Maker Trail</button>
      </div>

      {/* ── DESKTOP TOOLBAR (hidden on mobile) ── */}
      <div className="map-desktop-toolbar">
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
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '5px 12px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: typeFilter === t ? 'var(--primary)' : 'rgba(139,117,87,0.1)', color: typeFilter === t ? 'var(--bg)' : 'var(--text-2)', transition: 'all 0.15s' }}>{t}</button>
            ))}
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <button onClick={() => setExperiencesFilter(v => !v)} style={{ padding: '5px 12px', borderRadius: 2, border: experiencesFilter ? '1px solid var(--accent)' : '1px solid transparent', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: experiencesFilter ? 'rgba(122,140,126,0.15)' : 'rgba(139,117,87,0.1)', color: experiencesFilter ? 'var(--accent)' : 'var(--text-2)', transition: 'all 0.15s' }}>Experiences & Classes</button>
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            {['All States', ...STATES.filter(s => s !== 'All States')].map(s => (
              <button key={s} onClick={() => setStateFilter(s)} style={{ padding: '5px 9px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: stateFilter === s ? 'rgba(139,117,87,0.15)' : 'transparent', color: stateFilter === s ? 'var(--text)' : 'var(--text-3)', transition: 'all 0.15s' }}>{s}</button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{loading ? 'Loading...' : `${studioCount.toLocaleString()} studios`}</div>
          </div>
        )}
      </div>

      {/* ── MAP (both desktop and mobile) ── */}
      {activeTab === 'map' && (
        <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

          {/* Desktop legend */}
          <div className="map-desktop-toolbar" style={{ position: 'absolute', bottom: 40, left: 16, background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 4, zIndex: 5, overflow: 'hidden' }}>
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
                      <span style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
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
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Craft Types</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MOBILE BOTTOM SHEET ── */}
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
                  {['All States', ...STATES.filter(s => s !== 'All States')].map(s => (
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
                  {loading ? 'Loading…' : `${studioCount.toLocaleString()} studios`}
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setTypeFilter('All'); setStateFilter('All States'); setExperiencesFilter(false); setSearch(''); clearSemanticSearch() }}
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
        .mapboxgl-popup-content { border-radius: 4px !important; padding: 14px 16px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important; border: 1px solid rgba(139,117,87,0.15) !important; background: #faf7f2 !important; }
        .mapboxgl-popup-tip { display: none !important; }
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

function getFiltered(studios, typeFilter, stateFilter, search, experiencesFilter = false) {
  return studios.filter(v => {
    const matchType = typeFilter === 'All' || v.category === typeFilter.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')
    const matchState = stateFilter === 'All States' || v.state === stateFilter
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase())
    const matchExperiences = !experiencesFilter || v.experiences_and_classes === true
    return matchType && matchState && matchSearch && matchExperiences
  })
}

function buildGeoJSON(studios, studiosWithEvents, eventByStudio = {}) {
  return {
    type: 'FeatureCollection',
    features: studios.filter(v => v.latitude && v.longitude).map(v => {
      const color = TYPE_COLORS[v.category] || '#C1603A'
      const tier = v.tier || 'basic'
      const hasEvent = studiosWithEvents.has(v.id)
      const nextEvent = eventByStudio[v.id]
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(v.longitude), parseFloat(v.latitude)] },
        properties: { id: v.id, name: v.name, slug: v.slug, category: v.category, tier, color: tier === 'premium' ? PREMIUM_COLOR : color, hasEvent, eventTitle: nextEvent ? nextEvent.title : null, eventDate: nextEvent ? nextEvent.event_date : null, location: [v.suburb, v.state].filter(Boolean).join(', '), description: v.description || '' },
      }
    }),
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}
