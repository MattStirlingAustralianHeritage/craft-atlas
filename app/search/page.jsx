'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SemanticSearchBar from '@/components/SemanticSearchBar'
import ConciergeAnswer from '@/components/ConciergeAnswer'
import TypographicCard from '@/components/TypographicCard'
import { isInquiryQuery } from '@/lib/search/inquiryIntent'

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') || ''
  const [venues, setVenues] = useState([])
  const [meta, setMeta] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [forceExact, setForceExact] = useState(false)  // user opted out of the concierge for this query

  // A fresh query re-arms the concierge (a per-query opt-out shouldn't stick).
  useEffect(() => { setForceExact(false) }, [q])

  useEffect(() => {
    if (!q) return
    const run = async () => {
      setIsLoading(true)
      // A plain-language request is answered by the concierge (/api/search/ask,
      // which returns { listings, meta }); a name/category lookup uses the plain
      // proxy (which returns { venues, meta }).
      const ask = !forceExact && isInquiryQuery(q)
      try {
        if (ask) {
          const res = await fetch('/api/search/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
          if (!res.ok) throw new Error('Search failed')
          const data = await res.json()
          // Concierge found nothing → fall back to the plain search (broader recall).
          if (!data.listings || data.listings.length === 0) {
            const res2 = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
            const data2 = await res2.json()
            setVenues(data2.venues || []); setMeta(data2.meta || null)
          } else {
            setVenues(data.listings); setMeta(data.meta || null)
          }
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
          if (!res.ok) throw new Error('Search failed')
          const data = await res.json()
          setVenues(data.venues || []); setMeta(data.meta || null)
        }
      } catch { setVenues([]) }
      finally { setIsLoading(false); setHasFetched(true) }
    }
    run()
  }, [q, forceExact])

  const handleResults = (newVenues, newMeta) => {
    if (!newVenues) { setVenues([]); setMeta(null); return }
    setVenues(newVenues); setMeta(newMeta)
    const params = new URLSearchParams({ q: newMeta.query })
    if (newMeta.parsed) params.set('filters', JSON.stringify(newMeta.parsed))
    router.replace(`/search?${params}`, { scroll: false })
  }

  const isEmpty = hasFetched && !isLoading && venues.length === 0
  const lowConfidence = meta?.parseConfidence < 0.3

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border, #e0d8cc)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <SemanticSearchBar accent="var(--amber, #C1603A)" onResults={handleResults} onLoading={setIsLoading} />
          {meta && !isLoading && venues.length > 0 && (
            <div style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #8a7d6b)' }}>
                {venues.length} venue{venues.length !== 1 ? 's' : ''} for &ldquo;{meta.query}&rdquo;{meta.usedFallback ? ' (keyword match)' : ''}
              </p>
              <a href={`/map?q=${encodeURIComponent(q)}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--amber, #C1603A)', textDecoration: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', padding: '3px 10px', border: '1px solid var(--amber, #C1603A)', borderRadius: 2, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                View on map
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Concierge answer — a plain-language request gets a written, grounded reply. */}
      {meta?.answer && !isLoading && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 0' }}>
          <ConciergeAnswer answer={meta.answer} intent={meta.intent} accent="var(--amber, #C1603A)" onExact={() => setForceExact(true)} />
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', color: 'var(--text-muted, #8a7d6b)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber, #C1603A)" strokeWidth="2" style={{ marginRight: '10px' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path>
          </svg>
          Searching…
        </div>
      )}

      {isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text)', margin: '0 0 8px' }}>No venues found</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #8a7d6b)', margin: '0 0 20px', lineHeight: '1.6' }}>
            {lowConfidence ? `We weren't sure how to interpret "${q}". Try being more specific.`
              : meta?.parsed?.sub_region ? `Nothing matched in ${meta.parsed.sub_region}. Try a broader region.`
              : 'Try broadening your search or removing specific filters.'}
          </p>
          <Link href="/" style={{ padding: '10px 20px', background: 'var(--amber, #C1603A)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
            Browse all venues
          </Link>
        </div>
      )}

      {!isLoading && venues.length > 0 && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {venues.map(venue => {
              const typeColor = { ceramics_clay: '#C1603A', visual_art: '#7A8C7E', jewellery_metalwork: '#C49A3C', textile_fibre: '#8B6B8A', wood_furniture: '#8A7055', glass: '#5A8A9A', printmaking: '#6B7A5A', leathermaker: '#8A5A3C', shoemaker: '#5F4339' }[venue.type] || '#C1603A'
              const typeLabel = { ceramics_clay: 'Ceramics & Clay', visual_art: 'Visual Art', jewellery_metalwork: 'Jewellery & Metalwork', textile_fibre: 'Textile & Fibre', wood_furniture: 'Wood & Furniture', glass: 'Glass', printmaking: 'Printmaking', leathermaker: 'Leatherwork', shoemaker: 'Shoemaking' }[venue.type] || venue.type
              return (
                <div key={venue.id}>
                  <Link href={`/venue/${venue.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border, #e0d8cc)', borderRadius: '4px', overflow: 'hidden' }}>
                      <TypographicCard name={venue.name} vertical="craft" category={typeLabel} region={venue.sub_region} state={venue.state} aspectRatio="3/2" imageUrl={venue.hero_image_url} />
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor, marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>{typeLabel}</div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--text)', marginBottom: '4px', lineHeight: 1.3 }}>{venue.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #8a7d6b)', fontFamily: 'var(--font-sans)' }}>{[venue.sub_region, venue.state].filter(Boolean).join(', ')}</div>
                      </div>
                    </div>
                  </Link>
                  {venue.reason && (
                    <p style={{ margin: '8px 2px 0', display: 'flex', gap: 6, alignItems: 'flex-start', fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.45, color: 'var(--text-muted, #8a7d6b)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--amber, #C1603A)', flexShrink: 0, marginTop: 2 }} aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
                      <span>{venue.reason}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!q && !isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', color: 'var(--text-muted, #8a7d6b)' }}>
          Enter a search above to find venues.
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted, #8a7d6b)' }}>Loading…</div>}>
      <SearchResults />
    </Suspense>
  )
}
