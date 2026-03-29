'use client'
import { useRef, useEffect } from 'react'
import { TYPE_COLORS } from '@/lib/constants'

export default function VenueMap({ venue, nearby }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (!venue || !mapContainer.current) return
    if (map.current) { map.current.remove(); map.current = null }

    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        center: [venue.longitude, venue.latitude],
        zoom: 13,
        interactive: true,
        attributionControl: false,

      })
      map.current.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'bottom-right')

      map.current.on('load', () => {
        map.current.addSource('venue-pin', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point', coordinates: [venue.longitude, venue.latitude] } },
        })
        map.current.addLayer({
          id: 'venue-pin-layer', type: 'circle', source: 'venue-pin',
          paint: { 'circle-radius': 10, 'circle-color': TYPE_COLORS[venue.type] || '#C1603A', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' },
        })

        if (nearby && nearby.length > 0) {
          map.current.addSource('nearby-venues', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: nearby.map(v => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [v.longitude, v.latitude] },
                properties: { name: v.name, type: v.type, slug: v.slug },
              })),
            },
          })
          map.current.addLayer({
            id: 'nearby-dots', type: 'circle', source: 'nearby-venues',
            paint: {
              'circle-radius': 5,
              'circle-color': ['match', ['get', 'type'], 'ceramics_clay', '#C1603A', 'visual_art', '#7A8C7E', 'jewellery_metalwork', '#C49A3C', 'textile_fibre', '#8B6B8A', 'wood_furniture', '#8A7055', 'glass', '#5A8A9A', 'printmaking', '#6B7A5A', '#C1603A'],
              'circle-opacity': 0.5, 'circle-stroke-width': 1, 'circle-stroke-color': '#ffffff',
            },
          })
        }
      })
    })

    return () => {
      if (map.current) { map.current.remove(); map.current = null }
    }
  }, [venue, nearby])

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: 4, border: '1px solid var(--border)' }} />
  )
}
