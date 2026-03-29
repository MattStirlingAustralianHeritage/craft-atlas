'use client'
import { useState } from 'react'
import Link from 'next/link'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'

export default function RegionFilters({ venues, regionName }) {
  const [typeFilter, setTypeFilter] = useState('All')
  const [sortBy, setSortBy] = useState('rating')

  const types = [...new Set(venues.map(v => v.type))]
  const typeCounts = {}
  venues.forEach(v => { typeCounts[v.type] = (typeCounts[v.type] || 0) + 1 })
  const filtered = venues.filter(v => typeFilter === 'All' || v.type === typeFilter)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.google_rating || 0) - (a.google_rating || 0)
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return 0
  })

  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setTypeFilter('All')} style={{
            padding: '7px 14px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', fontFamily: 'var(--font-sans)',
            background: typeFilter === 'All' ? '#C1603A' : 'rgba(139,117,87,0.1)', color: typeFilter === 'All' ? '#fff' : '#5a4a3a', transition: 'all 0.15s',
          }}>All ({venues.length})</button>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '7px 14px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', fontFamily: 'var(--font-sans)',
              background: typeFilter === t ? (TYPE_COLORS[t] || '#C1603A') : 'rgba(139,117,87,0.1)', color: typeFilter === t ? '#fff' : '#5a4a3a', transition: 'all 0.15s',
            }}>{TYPE_LABELS[t] || t} ({typeCounts[t]})</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 4 }}>Sort:</span>
          {['rating', 'name'].map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '5px 10px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-sans)',
              background: sortBy === s ? 'rgba(139,117,87,0.15)' : 'transparent', color: sortBy === s ? 'var(--text)' : 'var(--text-3)',
            }}>{s === 'rating' ? '★ Rating' : 'A-Z'}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {sorted.map(v => {
          const color = TYPE_COLORS[v.type] || '#c8943a'
          return (
            <Link key={v.slug} href={`/venue/${v.slug}`} style={{
              display: 'block', padding: '24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                {TYPE_LABELS[v.type] || v.type}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{v.name}</div>
              {v.google_rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ color: '#C1603A', fontSize: 13 }}>★ {v.google_rating.toFixed(1)}</span>
                  {v.google_rating_count && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({v.google_rating_count.toLocaleString()})</span>}
                </div>
              )}
              {v.description && (
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {v.description}
                </div>
              )}
              {v.features && v.features.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {v.features.slice(0, 3).map(f => (
                    <span key={f} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{f}</span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>No makers found in this region.</div>
      )}
    </section>
  )
}
