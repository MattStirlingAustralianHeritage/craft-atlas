'use client'
import { useRef, useEffect } from 'react'

export default function RegionMap({ venues }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (!venues || !venues.length || !mapContainer.current) return
    if (map.current) { map.current.remove(); map.current = null }

    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const lngs = venues.map(v => parseFloat(v.longitude))
      const lats = venues.map(v => parseFloat(v.latitude))
      const bounds = [[Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05], [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05]]

      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        bounds, fitBoundsOptions: { padding: 40, maxZoom: 13 },
        interactive: true, attributionControl: false,
      })
      map.current.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'bottom-right')

      map.current.on('load', () => {
        map.current.addSource('region-venues', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: venues.map(v => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [parseFloat(v.longitude), parseFloat(v.latitude)] },
              properties: { name: v.name, type: v.type, slug: v.slug },
            })),
          },
        })
        map.current.addLayer({
          id: 'region-venue-dots', type: 'circle', source: 'region-venues',
          paint: {
            'circle-radius': 7,
            'circle-color': ['match', ['get', 'type'], 'ceramics_clay', '#C1603A', 'visual_art', '#7A8C7E', 'jewellery_metalwork', '#C49A3C', 'textile_fibre', '#8B6B8A', 'wood_furniture', '#8A7055', 'glass', '#5A8A9A', 'printmaking', '#6B7A5A', '#C1603A'],
            'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff',
          },
        })
      })
    })

    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [venues])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: 4, border: '1px solid var(--border)' }} />
}
