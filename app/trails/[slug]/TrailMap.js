'use client'
import { useEffect, useRef } from 'react'

async function fetchRouteGeometry(coordinates, token) {
  // Mapbox Directions API supports up to 25 waypoints
  const coords = coordinates.map(c => c.join(',')).join(';')
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return data.routes?.[0]?.geometry ?? null
}

export default function TrailMap({ coordinates, stops }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return
    if (mapRef.current) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    import('mapbox-gl').then(async (mapboxgl) => {
      mapboxgl = mapboxgl.default || mapboxgl
      mapboxgl.accessToken = token

      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      )

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        bounds: bounds,
        fitBoundsOptions: { padding: 80 },
        scrollZoom: false,
      })

      mapRef.current = map
      map.addControl(new mapboxgl.NavigationControl(), 'top-right')

      map.on('load', async () => {
        // Try to get road route, fall back to straight lines
        let routeGeometry = null
        if (coordinates.length >= 2 && coordinates.length <= 25) {
          routeGeometry = await fetchRouteGeometry(coordinates, token)
        }

        const geojsonData = routeGeometry
          ? { type: 'Feature', geometry: routeGeometry }
          : { type: 'Feature', geometry: { type: 'LineString', coordinates } }

        // Subtle background glow for the route
        map.addSource('trail-route', { type: 'geojson', data: geojsonData })

        map.addLayer({
          id: 'trail-route-glow',
          type: 'line',
          source: 'trail-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f59e0b', 'line-width': 8, 'line-opacity': 0.15 },
        })

        map.addLayer({
          id: 'trail-route-line',
          type: 'line',
          source: 'trail-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#b45309', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
        })

        // Numbered markers
        stops.forEach((stop, index) => {
          const venue = stop.venues
          if (!venue?.longitude || !venue?.latitude) return
          const el = document.createElement('div')
          el.style.cssText = `width:28px;height:28px;border-radius:50%;background:#b45309;border:2px solid white;color:white;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;font-family:sans-serif;`
          el.innerText = index + 1
          const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
            .setHTML(`<div style="font-family:sans-serif;padding:4px 2px;"><p style="font-weight:600;margin:0 0 2px;font-size:13px;">${venue.name}</p><p style="margin:0;color:#888;font-size:11px;">${[venue.suburb, venue.state].filter(Boolean).join(', ')}</p></div>`)
          new mapboxgl.Marker({ element: el })
            .setLngLat([parseFloat(venue.longitude), parseFloat(venue.latitude)])
            .setPopup(popup)
            .addTo(map)
        })
      })
    })

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [coordinates, stops])

  if (!coordinates || coordinates.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm">
      <div ref={mapContainer} style={{ height: '480px', width: '100%' }} />
      <div className="bg-white px-4 py-3 border-t border-stone-100">
        <p className="text-xs text-stone-400 text-center">{stops.length} stops · Click markers for details</p>
      </div>
    </div>
  )
}
