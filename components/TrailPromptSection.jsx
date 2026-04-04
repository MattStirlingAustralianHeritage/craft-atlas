'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'

const LOADING_MESSAGES = [
  'Finding studios in the area\u2026',
  'Checking opening hours\u2026',
  'Mapping the route\u2026',
  'Writing your makers trail\u2026',
]

const EXAMPLE_TRAILS = [
  { query: 'Ceramics studios Daylesford', region: 'Daylesford, VIC' },
  { query: 'Makers trail Blue Mountains', region: 'Blue Mountains, NSW' },
  { query: 'Art studios weekend Melbourne', region: 'Melbourne, VIC' },
]

export default function TrailPromptSection() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingIdx, setLoadingIdx] = useState(0)
  const [trail, setTrail] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 3) return

    setLoading(true)
    setError(null)
    setTrail(null)
    setLoadingIdx(0)

    const interval = setInterval(() => {
      setLoadingIdx(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)

    try {
      const res = await fetch(`/api/itinerary?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.message || data.error || 'Could not generate a trail. Try a different query.')
        return
      }
      setTrail(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <section style={{ padding: '72px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Makers Trails</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 12 }}>Plan a makers trail</h2>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', maxWidth: 520, margin: '0 auto 32px' }}>
          Tell us where you&apos;re headed and we&apos;ll build a day-by-day trail from real, verified makers, studios, and artists.
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
            </div>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="A day visiting studios in the Dandenongs\u2026" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '14px 0', fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-sans)', minWidth: 0 }} />
            {query.trim().length >= 3 && (
              <button type="submit" disabled={loading} style={{ padding: '12px 20px', background: 'var(--primary)', border: 'none', borderLeft: '1.5px solid var(--border)', color: '#fff', cursor: loading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
                {loading ? 'Building\u2026' : 'Build trail'}
              </button>
            )}
          </div>
        </form>

        {!trail && !loading && (
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {EXAMPLE_TRAILS.map(ex => (
              <button key={ex.query} onClick={() => setQuery(ex.query)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                {ex.query}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)' }}>{LOADING_MESSAGES[loadingIdx]}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#842029', margin: 0 }}>{error}</p>
          </div>
        )}

        {trail && trail.days && (
          <div style={{ marginTop: 32, textAlign: 'left' }}>
            {trail.region_label && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>{trail.region_label}</p>}
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 4 }}>{trail.title || 'Your makers trail'}</h3>
            {trail.summary && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>{trail.summary}</p>}

            {trail.days.map((day, di) => (
              <div key={di} style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{day.label || `Day ${di + 1}`}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(day.stops || []).map((stop, si) => {
                    const typeColor = TYPE_COLORS[stop.category] || '#C1603A'
                    const typeLabel = TYPE_LABELS[stop.category] || stop.category
                    return (
                      <div key={si} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: typeColor, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontFamily: 'var(--font-sans)' }}>{si + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', lineHeight: 1.3 }}>{stop.venue_name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: typeColor }}>{typeLabel}</span>
                            {stop.suburb && (<><span style={{ color: 'var(--border)', fontSize: 6 }}>&#9679;</span><span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)' }}>{stop.suburb}</span></>)}
                          </div>
                          {stop.note && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>{stop.note}</p>}
                          {stop.slug && <Link href={`/venue/${stop.slug}`} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>View venue &rarr;</Link>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: '14px 20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                Want wineries, cafes, and stays too?{' '}
                <a href="https://www.australianatlas.com.au/itinerary" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 500 }}>Plan a full trip on Australian Atlas &rarr;</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
