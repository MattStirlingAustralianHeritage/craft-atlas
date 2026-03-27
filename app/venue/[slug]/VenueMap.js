'use client'

import { useEffect, useRef } from 'react'

export default function VenueMap({ lat, lng, name }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    // Dynamic import to avoid SSR issues with mapbox-gl
    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        center: [lng, lat],
        zoom: 14,
        attributionControl: false,
      })

      // Add marker
      new mapboxgl.default.Marker({ color: '#b8862b' })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.default.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px 12px; font-family: Georgia, serif; font-size: 14px;">${name}</div>`
          )
        )
        .addTo(map.current)

      map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right')
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [lat, lng, name])

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: 300,
        borderRadius: 8,
        border: '1px solid var(--brand-border)',
        overflow: 'hidden',
      }}
    />
  )
}
