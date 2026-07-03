'use client'

// NearbyVenuesMap
//
// Full-width interactive map embedded on /venue/[slug]. Pins are drawn from
// Craft's own `venues` table only — by design, vertical surfaces stay
// within their vertical. The map's editorial job here: surface the
// geographic clustering of makers (Mornington Peninsula ceramicists,
// Castlemaine printmakers, etc.) that no text section can show as well,
// so the user can decide whether a maker fits into a day.
//
// Lazy-loaded by the page via next/dynamic so the Mapbox bundle isn't on
// the critical render path.

import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef } from 'react'
import { ATLAS_PAPER_STYLE } from '@/lib/map/atlasPaperStyle'

const CRAFT_BRAND = '#C1603A'
const PRIMARY = '#5f8a7e'

function buildGeoJSON(venues) {
  return {
    type: 'FeatureCollection',
    features: (venues || [])
      .filter(v => v.latitude != null && v.longitude != null && !v.address_on_request)
      .map(v => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(v.longitude), parseFloat(v.latitude)] },
        properties: {
          id: v.id,
          slug: v.slug,
          name: v.name,
          location: [v.sub_region || v.suburb, v.state].filter(Boolean).join(', '),
        },
      })),
  }
}

export default function NearbyVenuesMap({
  venues,
  currentVenueId,
  initialBounds,
}) {
  const container = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)

  useEffect(() => {
    if (!container.current || !venues?.length) return
    if (mapRef.current) { try { mapRef.current.remove() } catch {} mapRef.current = null }

    let cancelled = false
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled) return
      try {
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

        mapRef.current = new mapboxgl.Map({
          container: container.current,
          style: ATLAS_PAPER_STYLE,
          center: [134, -27],
          zoom: 4,
          attributionControl: false,
          scrollZoom: false,
          cooperativeGestures: true,
        })

        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

        if (initialBounds) {
          mapRef.current.fitBounds(initialBounds, { padding: 50, animate: false })
        }

        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '260px',
          offset: 12,
        })

        mapRef.current.on('load', () => {
          mapRef.current.addSource('venues', { type: 'geojson', data: buildGeoJSON(venues) })

          mapRef.current.addLayer({
            id: 'pins-basic',
            type: 'circle',
            source: 'venues',
            filter: ['!=', ['get', 'id'], currentVenueId || ''],
            paint: {
              'circle-radius': 6,
              'circle-color': CRAFT_BRAND,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })

          if (currentVenueId) {
            mapRef.current.addLayer({
              id: 'pin-highlight-ring',
              type: 'circle',
              source: 'venues',
              filter: ['==', ['get', 'id'], currentVenueId],
              paint: {
                'circle-radius': 16,
                'circle-color': 'transparent',
                'circle-stroke-width': 2,
                'circle-stroke-color': CRAFT_BRAND,
                'circle-stroke-opacity': 0.45,
              },
            })
            mapRef.current.addLayer({
              id: 'pin-highlight',
              type: 'circle',
              source: 'venues',
              filter: ['==', ['get', 'id'], currentVenueId],
              paint: {
                'circle-radius': 10,
                'circle-color': CRAFT_BRAND,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
              },
            })
          }

          const layers = ['pins-basic']
          if (currentVenueId) layers.push('pin-highlight-ring', 'pin-highlight')

          for (const layer of layers) {
            mapRef.current.on('mouseenter', layer, () => { mapRef.current.getCanvas().style.cursor = 'pointer' })
            mapRef.current.on('mouseleave', layer, () => { mapRef.current.getCanvas().style.cursor = '' })
            mapRef.current.on('click', layer, (e) => {
              const props = e.features[0].properties
              const coords = e.features[0].geometry.coordinates.slice()
              const isCurrent = props.id === currentVenueId
              const cta = isCurrent
                ? `<div style="display:block;margin-top:10px;padding:7px 0;text-align:center;background:rgba(193,96,58,0.10);color:${CRAFT_BRAND};font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;border-radius:2px;border:1px dashed rgba(193,96,58,0.35);">You are here</div>`
                : `<a href="/venue/${props.slug}" style="display:block;margin-top:10px;padding:7px 0;text-align:center;background:${PRIMARY};color:#fff;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;border-radius:2px;">View studio &rarr;</a>`

              popupRef.current.setLngLat(coords).setHTML(
                `<div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 2px;max-width:240px;">
                  <span style="display:inline-block;background:${CRAFT_BRAND}18;border:1px solid ${CRAFT_BRAND}33;padding:3px 9px;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${CRAFT_BRAND};margin-bottom:8px;">Craft Atlas</span>
                  <div style="font-family:Georgia,serif;font-size:17px;font-weight:400;color:#1a1614;margin-bottom:3px;letter-spacing:-0.01em;line-height:1.2;">${props.name}</div>
                  <div style="font-size:11px;color:#9a8878;">${props.location}</div>
                  ${cta}
                </div>`
              ).addTo(mapRef.current)
            })
          }

          mapRef.current.on('click', (e) => {
            const f = mapRef.current.queryRenderedFeatures(e.point, { layers })
            if (!f.length && popupRef.current) popupRef.current.remove()
          })
        })
      } catch (err) {
        console.error('[NearbyVenuesMap] init failed:', err)
      }
    }).catch(err => console.error('[NearbyVenuesMap] mapbox load failed:', err))

    return () => {
      cancelled = true
      if (popupRef.current) { try { popupRef.current.remove() } catch {} popupRef.current = null }
      if (mapRef.current) { try { mapRef.current.remove() } catch {} mapRef.current = null }
    }
  }, [venues, currentVenueId, initialBounds])

  return (
    <div
      ref={container}
      style={{ width: '100%', height: '100%' }}
      role="application"
      aria-label="Interactive map of nearby Craft Atlas studios"
    />
  )
}
