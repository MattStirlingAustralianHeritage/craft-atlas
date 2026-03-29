'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { TYPE_COLORS } from '@/lib/constants'

const AMBER = '#C1603A'
const TYPES = ['All', 'Maker', 'Maker', 'Studio', 'Maker', 'Maker']

const REGIONS = [
  { label: 'All of Australia', center: [134, -27], zoom: 3.8 },
  { label: 'NSW', center: [146.5, -32], zoom: 5.8 },
  { label: 'VIC', center: [144.5, -37], zoom: 6.2 },
  { label: 'QLD', center: [144, -22], zoom: 5.2 },
  { label: 'SA', center: [135.5, -30], zoom: 5.5 },
  { label: 'WA', center: [121, -26], zoom: 4.8 },
  { label: 'TAS', center: [146.5, -42], zoom: 6.8 },
  { label: 'NT', center: [133, -19], zoom: 5.5 },
  { label: 'ACT', center: [149.1, -35.3], zoom: 9.5 },
  // Popular regions
  { label: 'Yarra Valley', center: [145.5, -37.7], zoom: 10 },
  { label: 'Mornington Peninsula', center: [145.0, -38.3], zoom: 10.5 },
  { label: 'Barossa Valley', center: [138.9, -34.5], zoom: 10.5 },
  { label: 'Hunter Valley', center: [151.3, -32.8], zoom: 10 },
  { label: 'Margaret River', center: [115.0, -33.9], zoom: 10 },
  { label: 'McLaren Vale', center: [138.55, -35.2], zoom: 11 },
  { label: 'Clare Valley', center: [138.6, -33.8], zoom: 10.5 },
  { label: 'Adelaide Hills', center: [138.75, -35.0], zoom: 10.5 },
  { label: 'Tamar Valley', center: [147.1, -41.4], zoom: 10.5 },
  { label: 'Melbourne CBD', center: [144.96, -37.81], zoom: 12 },
  { label: 'Sydney CBD', center: [151.21, -33.87], zoom: 12 },
  { label: 'Brisbane CBD', center: [153.03, -27.47], zoom: 12 },
  { label: 'Perth CBD', center: [115.86, -31.95], zoom: 12 },
]

function TrailBuilderInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const isEmbed = searchParams.get('embed') === '1'

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allVenues, setAllVenues] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [semanticActive, setSemanticActive] = useState(false)
  const [semanticQuery, setSemanticQuery] = useState('')
  const [semanticLoading, setSemanticLoading] = useState(false)
  const semanticTimeout = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const suggestTimeout = useRef(null)
  const [activeTypes, setActiveTypes] = useState(new Set(['All']))
  const [stops, setStops] = useState([])
  const [trailName, setTrailName] = useState('')
  const [trailDesc, setTrailDesc] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saved' | 'error'
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0])
  const [mobileTab, setMobileTab] = useState('builder') // 'builder' | 'map'
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const popupRef = useRef(null)
  const markersRef = useRef([])
  const stopsRef = useRef(stops)
  const searchTimeout = useRef(null)
  const routeLayersRef = useRef([])
  const allVenuesRef = useRef([])

  useEffect(() => { stopsRef.current = stops }, [stops])
  useEffect(() => { allVenuesRef.current = allVenues }, [allVenues])

  // Keep window functions always pointing at latest state via refs
  useEffect(() => {
    window.__trailBuilderAdd = (venueId) => {
      const venue = allVenuesRef.current.find(v => String(v.id) === String(venueId))
      if (!venue || stopsRef.current.find(s => String(s.id) === String(venueId))) return
      setStops(prev => [...prev, venue])
      if (popupRef.current) popupRef.current.remove()
    }
    window.__trailBuilderRemove = (venueId) => {
      setStops(prev => prev.filter(s => String(s.id) !== String(venueId)))
      if (popupRef.current) popupRef.current.remove()
    }
  })

  const getFiltered = useCallback((venues) => {
    if (activeTypes.has('All')) return venues
    return venues.filter(v => activeTypes.has(
      v.category.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    ))
  }, [activeTypes])

  const toggleType = (t) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (t === 'All') return new Set(['All'])
      next.delete('All')
      if (next.has(t)) {
        next.delete(t)
        if (next.size === 0) return new Set(['All'])
      } else {
        next.add(t)
      }
      return next
    })
  }

  // Draw road route using Mapbox Directions API
  const drawRoute = useCallback(async (map, stopsToRender) => {
    if (!map || stopsToRender.length < 2) {
      // Clear existing route layers
      routeLayersRef.current.forEach(id => {
        if (map && map.getLayer(id)) map.removeLayer(id)
        if (map && map.getSource(id)) map.removeSource(id)
      })
      routeLayersRef.current = []
      return
    }

    // Clear old route layers
    routeLayersRef.current.forEach(id => {
      try {
        if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      } catch(e) {}
    })
    routeLayersRef.current = []

    // Fetch road routes for each consecutive pair
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const newLayerIds = []

    for (let i = 0; i < stopsToRender.length - 1; i++) {
      const from = stopsToRender[i]
      const to = stopsToRender[i + 1]
      if (!from.longitude || !from.latitude || !to.longitude || !to.latitude) continue

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?geometries=geojson&access_token=${token}`
        const res = await fetch(url)
        const data = await res.json()
        const route = data.routes?.[0]?.geometry
        if (!route) continue

        const sourceId = `route-${i}-${Date.now()}`
        const layerId = `route-line-${i}-${Date.now()}`
        newLayerIds.push(sourceId, layerId)

        map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: route } })
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': AMBER, 'line-width': 2.5, 'line-opacity': 0.75, 'line-dasharray': [2, 1.5] },
        }, 'pins') // insert below pins layer
      } catch(e) {
        console.error('Route fetch error', e)
      }
    }
    routeLayersRef.current = newLayerIds
  }, [])

  // Fit map to stops bounds
  const fitToStops = useCallback((map, stopsToFit) => {
    if (!map || stopsToFit.length === 0) return
    if (stopsToFit.length === 1) {
      map.flyTo({ center: [parseFloat(stopsToFit[0].longitude), parseFloat(stopsToFit[0].latitude)], zoom: 11, duration: 800 })
      return
    }
    const lngs = stopsToFit.map(s => parseFloat(s.longitude))
    const lats = stopsToFit.map(s => parseFloat(s.latitude))
    const bounds = [
      [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05],
      [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05],
    ]
    map.fitBounds(bounds, { padding: 60, duration: 800 })
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        window.dispatchEvent(new CustomEvent('ca:openauth'))
        return
      }
      setUser(user)
      const { data: venueData } = await supabase
        .from('venues')
        .select('id, name, slug, category, state, suburb, latitude, longitude, description, address')
        .eq('published', true)
        .neq('address', '')
        .not('address', 'is', null)
      setAllVenues(venueData || [])
      if (editId) {
        const { data: trail } = await supabase
          .from('user_trails').select('*').eq('id', editId).eq('user_id', user.id).single()
        if (trail) {
          setTrailName(trail.name)
          setTrailDesc(trail.description || '')
          setVisibility(trail.visibility)
          const { data: stopData } = await supabase
            .from('user_trail_venues')
            .select('position, venues(id, name, slug, category, state, suburb, latitude, longitude, description)')
            .eq('trail_id', editId).order('position', { ascending: true })
          const loadedStops = (stopData || [])
            .map(s => Array.isArray(s.venues) ? s.venues[0] : s.venues).filter(Boolean)
          setStops(loadedStops)
          stopsRef.current = loadedStops
        }
      }
      setLoading(false)
    })
  }, [router, editId])

  useEffect(() => {
    if (loading || !allVenues.length || !mapRef.current || mapInstance.current) return
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        center: [134, -27], zoom: 3.8, attributionControl: false,
      })
      mapInstance.current = map
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '300px', offset: 12 })
      popupRef.current = popup



      map.on('load', () => {
        map.addSource('venues', {
          type: 'geojson', cluster: true, clusterMaxZoom: 10,
          clusterMinPoints: 8, clusterRadius: 50, data: buildGeoJSON(allVenues),
        })
        map.addLayer({ id: 'clusters', type: 'circle', source: 'venues', filter: ['has', 'point_count'],
          paint: { 'circle-color': ['step', ['get', 'point_count'], '#b8a08a', 50, '#a08060', 200, '#7a5c3a'], 'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 32], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
        })
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'venues', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 },
          paint: { 'text-color': '#fff' }
        })
        map.addLayer({ id: 'pins', type: 'circle', source: 'venues', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-opacity': 0.9 }
        })

        // Delegated click handler on popup container — attached once, survives HTML re-renders
        popup.on('open', () => {
          const el = popup.getElement()
          if (!el) return
          el.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-venue-id]')
            if (!btn) return
            const id = btn.getAttribute('data-venue-id')
            const action = btn.getAttribute('data-action')
            if (action === 'add') window.__trailBuilderAdd(id)
            else window.__trailBuilderRemove(id)
          })
        })

        map.on('click', 'pins', (e) => {
          const props = e.features[0].properties
          const coords = e.features[0].geometry.coordinates.slice()
          const isAdded = stopsRef.current.find(s => String(s.id) === String(props.id))

          const desc = props.description && props.description !== 'null'
            ? props.description.length > 110
              ? props.description.slice(0, 110).trimEnd() + '…'
              : props.description
            : ''
          popup.setLngLat(coords).setHTML(
            `<div style="font-family:system-ui,sans-serif;padding:2px 0;max-width:260px;">
              <div style="font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${props.color};margin-bottom:6px;">${props.type.replace('_',' ')}</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#1a1614;margin-bottom:3px;line-height:1.3;">${props.name}</div>
              <div style="font-size:11px;color:#9a8878;margin-bottom:${desc ? 8 : 10}px;">${props.location}</div>
              ${desc ? `<div style="font-size:12px;color:#5a4e45;line-height:1.5;margin-bottom:10px;">${desc}</div>` : ''}
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <a href="/venue/${props.slug}" target="_blank" rel="noopener" style="font-size:11px;color:#9a8878;text-decoration:none;letter-spacing:0.04em;">View listing ↗</a>
              </div>
              ${isAdded
                ? `<button data-venue-id="${props.id}" data-action="remove" style="width:100%;padding:7px 0;background:transparent;border:1px solid #c8943a;color:#c8943a;border-radius:2px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;">Remove from trail</button>`
                : `<button data-venue-id="${props.id}" data-action="add" style="width:100%;padding:7px 0;background:#C1603A;border:none;color:#fff;border-radius:2px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;">+ Add to trail</button>`
              }
            </div>`
          ).addTo(map)
        })

        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          const clusterId = features[0].properties.cluster_id
          map.getSource('venues').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 1 })
          })
        })
        map.on('mouseenter', 'pins', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'pins', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['pins'] })
          if (!features.length) popup.remove()
        })

        // If editing, draw route and fit to stops
        if (stopsRef.current.length > 0) {
          drawRoute(map, stopsRef.current)
          fitToStops(map, stopsRef.current)
        }
      })
    })

    return () => {
      if (popupRef.current) popupRef.current.remove()
      if (mapInstance.current) { try { mapInstance.current.remove() } catch(e) {} mapInstance.current = null }
    }
  }, [loading, allVenues, drawRoute, fitToStops])

  // Redraw route whenever stops change (after map is ready)
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !map.isStyleLoaded()) return
    drawRoute(map, stops)
  }, [stops, drawRoute])

  // Haversine distance in km between two lat/lng points
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // Fetch suggestions whenever stops change — within 10km of the last added stop
  useEffect(() => {
    clearTimeout(suggestTimeout.current)
    if (stops.length === 0) { setSuggestions([]); return }
    suggestTimeout.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const anchor = stops[stops.length - 1]
        const anchorLat = parseFloat(anchor.latitude)
        const anchorLng = parseFloat(anchor.longitude)
        // Build query from stop types and regions
        const types = [...new Set(stops.map(s => s.type.replace('_', ' ')))]
        const regions = [...new Set(stops.map(s => s.suburb || s.state).filter(Boolean))]
        const q = [...types, ...regions].slice(0, 6).join(' ')
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error()
        const { venues } = await res.json()
        const stopIds = new Set(stops.map(s => String(s.id)))
        const nearby = venues
          .filter(v => !stopIds.has(String(v.id)))
          .filter(v => {
            if (!v.latitude || !v.longitude) return false
            return haversine(anchorLat, anchorLng, parseFloat(v.latitude), parseFloat(v.longitude)) <= 10
          })
        // If nothing within 10km, widen to 25km so the section isn't perpetually empty
        const fallback = nearby.length > 0 ? nearby : venues
          .filter(v => !stopIds.has(String(v.id)))
          .filter(v => v.latitude && v.longitude && haversine(anchorLat, anchorLng, parseFloat(v.latitude), parseFloat(v.longitude)) <= 25)
        setSuggestions(fallback.slice(0, 5))
      } catch {}
      finally { setSuggestionsLoading(false) }
    }, 800)
  }, [stops])

  // Update map data when type filter changes
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('venues')
    if (source) source.setData(buildGeoJSON(getFiltered(allVenues)))
  }, [activeTypes, allVenues, getFiltered])

  // Update map pins to match a venue set
  const updateMapSource = useCallback((venueList) => {
    const map = mapInstance.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('venues')
    if (source) source.setData(buildGeoJSON(venueList))
  }, [])

  // Clear semantic search — restore full filtered set
  const clearSemanticSearch = useCallback(() => {
    setSemanticActive(false)
    setSemanticQuery('')
    setSearchResults([])
    updateMapSource(getFiltered(allVenues))
  }, [allVenues, getFiltered, updateMapSource])

  // Debounced semantic search — fires on every keystroke after 400ms
  const handleSemanticInput = useCallback((val) => {
    setSemanticQuery(val)
    clearTimeout(semanticTimeout.current)
    if (!val.trim()) {
      clearSemanticSearch()
      return
    }
    semanticTimeout.current = setTimeout(async () => {
      setSemanticLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`)
        if (!res.ok) throw new Error()
        const { venues: results } = await res.json()
        setSemanticActive(true)
        setSearchResults(results.slice(0, 20))
        // Filter map pins to matched venues only
        updateMapSource(getFiltered(results))
        // Fit map to results
        const doFit = (venueList) => {
          const map = mapInstance.current
          if (!map) return
          const withCoords = venueList.filter(v => v.latitude && v.longitude)
          if (!withCoords.length) return
          if (withCoords.length === 1) {
            map.flyTo({ center: [parseFloat(withCoords[0].longitude), parseFloat(withCoords[0].latitude)], zoom: 11, duration: 800 })
          } else {
            const lngs = withCoords.map(v => parseFloat(v.longitude))
            const lats = withCoords.map(v => parseFloat(v.latitude))
            map.fitBounds([[Math.min(...lngs)-0.3, Math.min(...lats)-0.3],[Math.max(...lngs)+0.3, Math.max(...lats)+0.3]], { padding: 60, duration: 800, maxZoom: 12 })
          }
        }
        if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
          doFit(results)
        } else {
          // Map not ready yet — retry after style loads
          const tryFit = setInterval(() => {
            if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
              clearInterval(tryFit)
              doFit(results)
            }
          }, 100)
          setTimeout(() => clearInterval(tryFit), 5000)
        }
      } catch {}
      finally { setSemanticLoading(false) }
    }, 400)
  }, [clearSemanticSearch, getFiltered, updateMapSource])

  function handleLocalSearch(val) {
    setSearch(val)
    setSemanticActive(false)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(() => {
      const filtered = getFiltered(allVenues).filter(v =>
        v.name.toLowerCase().includes(val.toLowerCase()) ||
        (v.suburb || '').toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8)
      setSearchResults(filtered)
    }, 200)
  }

  function addStop(venue) {
    if (stops.find(s => s.id === venue.id)) return
    setStops(prev => [...prev, venue])
    setSearch('')
    setSearchResults([])
    setSemanticActive(false)
  }

  function removeStop(id) {
    setStops(prev => prev.filter(s => s.id !== id))
  }

  function moveStop(index, dir) {
    setStops(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function handleRegionChange(e) {
    const region = REGIONS.find(r => r.label === e.target.value)
    if (!region || !mapInstance.current) return
    setSelectedRegion(region)
    mapInstance.current.flyTo({ center: region.center, zoom: region.zoom, duration: 800 })
  }

  async function saveTrail() {
    if (!trailName.trim() || stops.length < 2) return
    setSaving(true)
    setSaveStatus(null)
    const supabase = getSupabase()
    try {
      let trailId = editId
      if (editId) {
        await supabase.from('user_trails').update({
          name: trailName.trim(), description: trailDesc.trim(), visibility, updated_at: new Date().toISOString()
        }).eq('id', editId)
        await supabase.from('user_trail_venues').delete().eq('trail_id', editId)
      } else {
        const shortCode = Math.random().toString(36).slice(2, 10)
        const { data: newTrail } = await supabase.from('user_trails').insert({
          user_id: user.id, name: trailName.trim(), description: trailDesc.trim(),
          visibility, short_code: shortCode,
        }).select().single()
        trailId = newTrail.id
      }
      await supabase.from('user_trail_venues').insert(
        stops.map((s, i) => ({ trail_id: trailId, venue_id: s.id, position: i }))
      )
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch(err) {
      console.error(err)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const canSave = trailName.trim().length > 0 && stops.length >= 2

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', overflow: 'hidden', paddingTop: isEmbed ? 0 : 64, background: 'var(--bg)', boxSizing: 'border-box' }}>
      {isEmbed && <style>{`nav, header { display: none !important; } main { padding-top: 0 !important; }`}</style>}

      {/* Top toolbar — live semantic search */}
      <div style={{ padding: '10px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', flexShrink: 0, zIndex: 11, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'visible', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', color: semanticLoading ? AMBER : 'var(--text-muted, #8a7d6b)', flexShrink: 0 }}>
            {semanticLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            )}
          </div>
          <input
            type="text"
            value={semanticQuery}
            onChange={e => handleSemanticInput(e.target.value)}
            placeholder="Search by vibe, region… try 'wild ferment wines Yarra Valley'"
            autoComplete="off" autoCorrect="off" spellCheck="false"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '11px 0', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', minWidth: 0 }}
          />
          {semanticQuery && (
            <button type="button" onClick={clearSemanticSearch}
              style={{ padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #8a7d6b)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
          {semanticActive && (
            <div style={{ padding: '0 12px', borderLeft: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

      </div>

      {/* Mobile tab toggle — only visible on small screens */}
      <div style={{ display: 'none' }} className="mobile-tab-bar">
        {['builder', 'map'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setMobileTab(tab)
              if (tab === 'map') {
                // Give the map container a tick to become visible before resizing
                setTimeout(() => { if (mapInstance.current) mapInstance.current.resize() }, 50)
              }
            }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderBottom: `2px solid ${mobileTab === tab ? AMBER : 'transparent'}`,
              background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: mobileTab === tab ? AMBER : 'var(--text-3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab === 'builder' ? '✏ Builder' : '🗺 Map'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }} className="builder-body">

      {/* Sidebar */}
      <div className={`builder-sidebar${mobileTab === 'builder' ? ' mobile-active' : ''}`} style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg)', overflow: 'hidden' }}>

        {/* Header + Save */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {!isEmbed && (
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: AMBER, fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 10 }}>
              {editId ? 'Edit trail' : <><a href="/map" style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-sans)',textDecoration:'none',letterSpacing:'0.06em'}}>← Map</a><span style={{margin:'0 8px',color:'var(--border)'}}>|</span>Trail builder</>}
            </div>
          )}
          <input
            value={trailName}
            onChange={e => setTrailName(e.target.value)}
            placeholder="Name your trail…"
            style={{ width: '100%', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, padding: '7px 10px', cursor: 'pointer', flexShrink: 0 }}>
              <option value="private">Private</option>
              <option value="link">Link only</option>
              <option value="public">Public</option>
            </select>
            <button onClick={saveTrail} disabled={saving || !canSave} style={{ flex: 1, padding: '8px 16px', background: canSave && !saving ? AMBER : 'var(--bg-2)', color: canSave && !saving ? '#fff' : 'var(--text-3)', border: `1px solid ${canSave && !saving ? AMBER : 'var(--border)'}`, borderRadius: 2, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: canSave && !saving ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
              {saving ? 'Saving…' : editId ? 'Save changes' : 'Save trail'}
            </button>
          </div>
          {saveStatus === 'saved' && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#4a7c59', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>✓ Changes saved</div>
          )}
          {saveStatus === 'error' && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#c0392b', fontFamily: 'var(--font-sans)' }}>Something went wrong — try again</div>
          )}
          {!canSave && !saveStatus && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
              {!trailName.trim() && stops.length < 2 ? 'Add a name and 2+ stops to save' : !trailName.trim() ? 'Add a name to save' : 'Add at least 2 stops to save'}
            </div>
          )}
          {editId && <Link href="/account" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}>← Back to account</Link>}
        </div>

        {/* Type filters */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
          {TYPES.map(t => {
            const active = activeTypes.has(t)
            return (
              <button key={t} onClick={() => toggleType(t)} style={{ padding: '4px 10px', borderRadius: 2, border: `1px solid ${active ? AMBER : 'var(--border)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: active ? AMBER : 'transparent', color: active ? '#fff' : 'var(--text-2)', transition: 'all 0.1s' }}>{t}</button>
            )
          })}
        </div>

        {/* Name filter in sidebar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            value={search}
            onChange={e => handleLocalSearch(e.target.value)}
            placeholder="Filter by name…"
            style={{ width: '100%', padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Stops list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {stops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.8 }}>
              <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>📍</div>
              Click any pin on the map to add it to your trail.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stops.map((stop, i) => (
                <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: AMBER, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stop.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{stop.category}{stop.suburb ? ` · ${stop.suburb}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveStop(i, -1)} disabled={i === 0} style={{ width: 20, height: 20, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', borderRadius: 2, fontSize: 10, cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                    <button onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1} style={{ width: 20, height: 20, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', borderRadius: 2, fontSize: 10, cursor: i === stops.length - 1 ? 'not-allowed' : 'pointer', opacity: i === stops.length - 1 ? 0.4 : 1 }}>↓</button>
                    <button onClick={() => removeStop(stop.id)} style={{ width: 20, height: 20, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', borderRadius: 2, fontSize: 11, cursor: 'pointer' }}>×</button>
                  </div>
                </div>
              ))}
              <textarea value={trailDesc} onChange={e => setTrailDesc(e.target.value)} placeholder="Add a description (optional)…" rows={3} style={{ marginTop: 6, width: '100%', padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />

              {/* Suggestions */}
              {(suggestionsLoading || suggestions.length > 0) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                    {suggestionsLoading ? 'Finding suggestions…' : 'You might also like'}
                  </div>
                  {!suggestionsLoading && suggestions.map(venue => (
                    <div key={venue.id} onClick={() => addStop(venue)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{venue.category.replace('_',' ')}{venue.suburb ? ` · ${venue.suburb}` : ''}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); addStop(venue) }}
                        style={{ flexShrink: 0, padding: '3px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 2, fontSize: 11, color: AMBER, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.04em' }}>
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className={`builder-map${mobileTab === 'map' ? ' mobile-active' : ''}`} style={{ position: 'relative', flex: 1, height: '100%' }}>
        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

        {/* Region picker */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
          <select
            value={selectedRegion.label}
            onChange={handleRegionChange}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text)', background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 3, padding: '7px 12px', cursor: 'pointer', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {REGIONS.map(r => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Legend — hidden in embed mode */}
        {!isEmbed && (
        <div style={{ position: 'absolute', bottom: 40, left: 12, background: 'rgba(250,247,242,0.97)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', zIndex: 5 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Venue Types</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Trail route</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="24" height="8" style={{ flexShrink: 0 }}>
                <line x1="0" y1="4" x2="24" y2="4" stroke={AMBER} strokeWidth="2.5" strokeDasharray="4 3" />
              </svg>
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>Road route</span>
            </div>
          </div>
        </div>
        )}
      </div>

      </div>{/* end body row */}

      <style>{`
        .mapboxgl-popup-content { border-radius: 4px !important; padding: 14px 16px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important; border: 1px solid rgba(139,117,87,0.15) !important; background: #faf7f2 !important; }
        .mapboxgl-popup-tip { display: none !important; }
        .mapboxgl-popup-close-button { font-size: 16px; color: #9a8878; padding: 4px 8px; }
        @media (max-width: 768px) {
          .mobile-tab-bar { display: flex !important; background: var(--bg-2); border-bottom: 1px solid var(--border); flex-shrink: 0; }
          .builder-body { flex-direction: column; position: relative; }
          .builder-sidebar { width: 100% !important; flex-shrink: 0 !important; border-right: none !important; display: none !important; flex: 1; min-height: 0; overflow-y: auto; }
          .builder-sidebar.mobile-active { display: flex !important; }
          .builder-map { position: absolute !important; inset: 0 !important; visibility: hidden !important; pointer-events: none !important; }
          .builder-map.mobile-active { visibility: visible !important; pointer-events: auto !important; position: relative !important; flex: 1 !important; height: 100% !important; }
        }
      `}</style>
    </div>
  )
}

export default function TrailBuilderPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
      </div>
    }>
      <TrailBuilderInner />
    </Suspense>
  )
}


function buildGeoJSON(venues) {
  return {
    type: 'FeatureCollection',
    features: venues.filter(v => v.latitude && v.longitude).map(v => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [parseFloat(v.longitude), parseFloat(v.latitude)] },
      properties: {
        id: v.id, name: v.name, slug: v.slug, type: v.category,
        color: TYPE_COLORS[v.category] || AMBER,
        location: [v.suburb, v.state].filter(Boolean).join(', '),
        description: v.description || '',
      },
    })),
  }
}
