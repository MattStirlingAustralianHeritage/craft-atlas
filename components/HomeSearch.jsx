'use client'

import { useState } from 'react'
import Link from 'next/link'
import SemanticSearchBar from './SemanticSearchBar'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'
import TypographicCard from '@/components/TypographicCard'

export default function HomeSearch() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleResults(venues) {
    setResults(venues)
  }

  const hasResults = results && results.length > 0

  return (
    <div style={{ width: '100%' }}>
      <SemanticSearchBar onResults={handleResults} onLoading={setLoading} />

      {loading && (
        <div style={{ marginTop: 16, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)' }}>
          Searching...
        </div>
      )}

      {hasResults && !loading && (
        <div style={{ marginTop: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setResults(null)} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Clear</button>
          </div>

          {results.slice(0, 8).map(venue => {
            const typeColor = TYPE_COLORS[venue.category] || '#C1603A'
            const typeLabel = TYPE_LABELS[venue.category] || venue.category
            return (
              <Link key={venue.id} href={`/venue/${venue.slug}`} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 56, height: 56, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                  <TypographicCard name={venue.name} vertical="craft" aspectRatio="1/1" imageUrl={venue.hero_image_url} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venue.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: typeColor }}>{typeLabel}</span>
                    {(venue.suburb || venue.state) && (
                      <>
                        <span style={{ color: 'var(--border)', fontSize: 6 }}>&#9679;</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-3)' }}>{[venue.suburb, venue.state].filter(Boolean).join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}

          {results.length > 8 && (
            <div style={{ padding: '12px 16px', textAlign: 'center' }}>
              <Link href="/search" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                View all {results.length} results &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {results && results.length === 0 && !loading && (
        <div style={{ marginTop: 16, textAlign: 'center', padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
            No results found.{' '}
            <Link href="/map" style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Browse the map</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
