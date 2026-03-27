'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export function HeroMap({ venues }) {
  const heroMapContainer = useRef(null)
  const heroMap = useRef(null)

  useEffect(() => {
    if (heroMap.current || !heroMapContainer.current) return
    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      heroMap.current = new mapboxgl.default.Map({
        container: heroMapContainer.current,
        style: 'mapbox://styles/mattstirlingaustralianheritage/cmn32b0iz003401swccb7d21k',
        center: [134, -28],
        zoom: 3.8,
        interactive: false,
        attributionControl: false,

      })

      heroMap.current.on('load', () => {
        // Add venue dots
        try {
          heroMap.current.addSource('hero-venues', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: (venues || []).map(v => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [v.longitude || 0, v.latitude || 0] },
                properties: { type: v.type },
              })).filter(f => f.geometry.coordinates[0] !== 0),
            },
          })
          heroMap.current.addLayer({
            id: 'hero-venue-dots',
            type: 'circle',
            source: 'hero-venues',
            paint: {
              'circle-radius': 3,
              'circle-color': [
                'match', ['get', 'type'],
                'distillery', '#c8943a',
                'brewery', '#4a7c59',
                'winery', '#8b4a6b',
                'cidery', '#c45d3e',
                'meadery', '#d4a843',
                '#c8943a',
              ],
              'circle-opacity': 0.6,
            },
          })
        } catch (e) { /* */ }
})
    })

    return () => {
      if (heroMap.current) {
        heroMap.current.remove()
        heroMap.current = null
      }
    }
  }, [venues])

  return (
    <div
      ref={heroMapContainer}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        opacity: 0.35,
      }}
    />
  )
}


export function NewsletterToast() {
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState('confirmed')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('newsletter')
    if (status === 'confirmed' || status === 'unsubscribed') {
      setType(status)
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      <div
        onClick={() => setVisible(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg, #faf8f5)',
        border: '1px solid var(--border, #e5e0d8)',
        padding: '52px 52px 44px',
        maxWidth: 500, width: 'calc(100% - 48px)',
        zIndex: 9999, textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
      }}>
        <button
          onClick={() => setVisible(false)}
          style={{ position: 'absolute', top: 18, right: 22, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-2, #888)', lineHeight: 1 }}
          aria-label="Close"
        >×</button>
        {type === 'confirmed' ? (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber, #b8862b)', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              You&apos;re subscribed
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', margin: '0 0 18px', lineHeight: 1.3 }}>
              Welcome to Small Batch Atlas
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-2, #555)', lineHeight: 1.8, margin: '0 0 36px' }}>
              Monthly dispatches on Australia&apos;s best small-batch producers — the people, the places, and the craft behind every bottle.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--text)', margin: '0 0 16px' }}>
              You&apos;ve been unsubscribed
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-2, #555)', lineHeight: 1.8, margin: '0 0 36px' }}>
              You won&apos;t receive any further emails from Small Batch Atlas.
            </p>
          </>
        )}
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'var(--amber, #b8862b)', color: '#fff', border: 'none', padding: '13px 36px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
        >
          Explore the atlas
        </button>
      </div>
    </>
  )
}


export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ padding: '16px', fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
        Check your inbox to confirm your subscription.
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{ flex: '1 1 220px', maxWidth: 280, padding: '10px 14px', fontSize: 14, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', outline: 'none' }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{ padding: '10px 20px', background: 'var(--amber)', color: 'var(--bg)', border: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', opacity: status === 'loading' ? 0.7 : 1 }}
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && (
        <p style={{ marginTop: 10, fontSize: 13, color: '#c0392b', fontFamily: 'var(--font-sans)' }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
