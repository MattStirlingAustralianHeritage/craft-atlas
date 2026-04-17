'use client'
import { getDefaultImage } from '@/lib/defaultImages'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'

const TYPES = ['All', 'Ceramics & Clay', 'Visual Art', 'Jewellery & Metalwork', 'Textile & Fibre', 'Wood & Furniture', 'Glass', 'Printmaking']
const STATES = ['All States', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const FEATURES = ['Open Studio', 'Workshops', 'Gallery', 'Retail', 'Commissions', 'Experiences & Classes', 'Online Shop']

const REGION_TO_STATE = {
  'blue-mountains': 'NSW',
  'byron-bay-hinterland': 'NSW',
  'yarra-valley': 'VIC',
  'daylesford': 'VIC',
  'adelaide-hills': 'SA',
  'huon-valley': 'TAS',
  'margaret-river': 'WA',
  'sunshine-coast-hinterland': 'QLD',
}

// Map region slug to the sub_region/suburb name used in the database
const REGION_TO_SUBREGION = {
  'blue-mountains': 'Blue Mountains',
  'byron-bay-hinterland': 'Byron Bay Hinterland',
  'yarra-valley': 'Yarra Valley',
  'daylesford': 'Daylesford',
  'adelaide-hills': 'Adelaide Hills',
  'huon-valley': 'Huon Valley',
  'margaret-river': 'Margaret River',
  'sunshine-coast-hinterland': 'Sunshine Coast Hinterland',
}

const CATEGORY_LABEL_MAP = {
  ceramics_clay: 'Ceramics & Clay',
  visual_art: 'Visual Art',
  jewellery_metalwork: 'Jewellery & Metalwork',
  textile_fibre: 'Textile & Fibre',
  wood_furniture: 'Wood & Furniture',
  glass: 'Glass',
  printmaking: 'Printmaking',
}

const PAGE_SIZE = 500

function groupByCategory(items, key) {
  const groups = {}
  items.forEach(item => {
    const cat = item[key] || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  })
  return groups
}

export default function ExploreClient() {
  const searchParams = useSearchParams()
  const [studios, setStudios] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState('All States')
  const [featureFilter, setFeatureFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState(null)
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState('featured')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Read region query parameter on mount
  useEffect(() => {
    const region = searchParams.get('region')
    if (region && REGION_TO_STATE[region]) {
      setStateFilter(REGION_TO_STATE[region])
      setRegionFilter(region)
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchStudios() {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('venues').select('*').eq('published', true).neq('address', '').not('address', 'is', null).range(0, PAGE_SIZE - 1)
      if (!error && data) {
        setStudios(data)
        setHasMore(data.length === PAGE_SIZE)
      }
      setLoading(false)
    }
    fetchStudios()
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    const supabase = getSupabase()
    const { data, error } = await supabase.from('venues').select('*').eq('published', true).neq('address', '').not('address', 'is', null).range(studios.length, studios.length + PAGE_SIZE - 1)
    if (!error && data) {
      setStudios(prev => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingMore(false)
  }

  // Clear region filter when user manually changes state filter
  function handleStateFilter(s) {
    setStateFilter(s)
    setRegionFilter(null)
  }

  const filtered = studios
    .filter(v => {
      const matchType = typeFilter === 'All' || v.category === typeFilter.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')
      const matchState = stateFilter === 'All States' || v.state === stateFilter
      const matchRegion = !regionFilter || (v.suburb && v.suburb.toLowerCase() === REGION_TO_SUBREGION[regionFilter]?.toLowerCase())
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.suburb && v.suburb.toLowerCase().includes(search.toLowerCase()))
      const matchFeature = !featureFilter || (featureFilter === 'Experiences & Classes' ? v.experiences_and_classes === true : (v.features && v.features.includes(featureFilter)))
      return matchType && matchState && matchRegion && matchSearch && matchFeature
    })
    .sort((a, b) => {
      if (sort === 'featured') { const t = { featured: 0, premium: 1, basic: 2 }; return (t[a.tier] || 2) - (t[b.tier] || 2) }
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'state') return a.state.localeCompare(b.state)
      return 0
    })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Page header */}
      <div style={{ padding: '64px 48px 48px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to bottom, rgba(193,96,58,0.04) 0%, transparent 100%)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12 }}>Directory</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>Explore Makers</h1>
          <Link href="/map" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(240,235,227,0.06)', border: '1px solid var(--border-2)',
            color: 'var(--text-2)', padding: '9px 18px', borderRadius: 2, fontSize: 12, fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <span>⊙</span> Map View
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding: '16px 48px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--bg-2)', position: 'sticky', top: 64, zIndex: 10, backdropFilter: 'blur(8px)',
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search makers..."
          style={{ padding: '7px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 13, outline: 'none', borderRadius: 2, width: 200, fontFamily: 'var(--font-sans)' }}
        />
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        {TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '6px 14px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: typeFilter === t ? 'var(--primary)' : 'rgba(139,117,87,0.1)', color: typeFilter === t ? 'var(--bg)' : 'var(--text-2)', transition: 'all 0.15s',
          }}>{t}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        {STATES.map(s => (
          <button key={s} onClick={() => handleStateFilter(s)} style={{
            padding: '6px 10px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: stateFilter === s ? 'rgba(139,117,87,0.15)' : 'transparent', color: stateFilter === s ? 'var(--text)' : 'var(--text-3)', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        {FEATURES.map(f => (
          <button key={f} onClick={() => setFeatureFilter(featureFilter === f ? null : f)} style={{
            padding: '6px 12px', borderRadius: 2, border: `1px solid ${featureFilter === f ? 'rgba(193,96,58,0.4)' : 'transparent'}`, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: featureFilter === f ? 'rgba(193,96,58,0.12)' : 'transparent', color: featureFilter === f ? 'var(--primary)' : 'var(--text-3)', transition: 'all 0.15s',
          }}>{f}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} studios</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontSize: 12, outline: 'none', borderRadius: 2, fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}>
            <option value="featured">Featured first</option>
            <option value="name">Name A–Z</option>
            <option value="state">By state</option>
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 10px', borderRadius: 2, border: 'none', cursor: 'pointer',
                background: view === v ? 'rgba(139,117,87,0.15)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-3)', fontSize: 14, fontFamily: 'var(--font-sans)',
              }}>{v === 'grid' ? '⊞' : '≡'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '40px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading studios...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-3)', marginBottom: 12 }}>No studios found</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Try adjusting your filters</div>
          </div>
        ) : view === 'grid' ? (
          typeFilter === 'All' && !search && !featureFilter ? (
            Object.entries(groupByCategory(filtered, 'category')).map(([category, items]) => (
              <section key={category} style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: '0.75rem',
                  marginBottom: '1rem', paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 400,
                    color: 'var(--text)', margin: 0,
                  }}>{CATEGORY_LABEL_MAP[category] || category}</h2>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-3)',
                  }}>{items.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                  {items.map(studio => <StudioCard key={studio.id} studio={studio} />)}
                </div>
              </section>
            ))
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {filtered.map(studio => <StudioCard key={studio.id} studio={studio} />)}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(studio => <StudioRow key={studio.id} studio={studio} />)}
          </div>
        )}
        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0 0' }}>
            <button onClick={loadMore} disabled={loadingMore} style={{
              padding: '10px 32px', background: 'transparent', border: '1px solid var(--border-2)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
              textTransform: 'uppercase', cursor: loadingMore ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)', borderRadius: 2, opacity: loadingMore ? 0.6 : 1,
            }}>
              {loadingMore ? 'Loading...' : 'Load more studios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StudioCard({ studio }) {
  const color = TYPE_COLORS[studio.category] || '#C1603A'
  return (
    <Link href={`/venue/${studio.slug}`} style={{
      display: 'block', textDecoration: 'none', background: 'var(--bg-2)', border: '1px solid var(--border)', padding: 24, transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}18`, border: `1px solid ${color}33`, padding: '3px 10px', borderRadius: 2 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{TYPE_LABELS[studio.category] || studio.category}</span>
        </div>
        {studio.tier === 'featured' && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.06em' }}>★ FEATURED</span>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.01em' }}>{studio.name}</h3>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{studio.suburb && `${studio.suburb}, `}{studio.state}</div>
      {studio.description && (
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{studio.description}</p>
      )}
      {studio.features && studio.features.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {studio.features.slice(0, 3).map(f => (
            <span key={f} style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 2, fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.03em' }}>{f}</span>
          ))}
          {studio.features.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 4px' }}>+{studio.features.length - 3}</span>}
        </div>
      )}
    </Link>
  )
}

function StudioRow({ studio }) {
  const color = TYPE_COLORS[studio.category] || '#C1603A'
  return (
    <Link href={`/venue/${studio.slug}`} style={{
      display: 'flex', alignItems: 'center', gap: 24, textDecoration: 'none', padding: '16px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}66` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>{studio.name}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color, width: 80, flexShrink: 0 }}>{TYPE_LABELS[studio.category] || studio.category}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', width: 180, flexShrink: 0 }}>{studio.suburb && `${studio.suburb}, `}{studio.state}</div>
      {studio.features && (
        <div style={{ display: 'flex', gap: 4, width: 200, flexShrink: 0 }}>
          {studio.features.slice(0, 2).map(f => (
            <span key={f} style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 2, fontSize: 10, color: 'var(--text-3)' }}>{f}</span>
          ))}
        </div>
      )}
      {studio.tier === 'featured' && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>★</span>}
    </Link>
  )
}
