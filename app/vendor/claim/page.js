'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'
import { useAuth } from '../layout'

const TYPES = ['All', 'Ceramics & Clay', 'Visual Art', 'Jewellery & Metalwork', 'Textile & Fibre', 'Wood & Furniture', 'Glass', 'Printmaking']
const TYPE_KEYS = { 'All': 'All', 'Ceramics & Clay': 'ceramics_clay', 'Visual Art': 'visual_art', 'Jewellery & Metalwork': 'jewellery_metalwork', 'Textile & Fibre': 'textile_fibre', 'Wood & Furniture': 'wood_furniture', 'Glass': 'glass', 'Printmaking': 'printmaking' }
const STATES = ['All States', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

export default function VendorClaimPage() {
  const { user } = useAuth()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [stateFilter, setStateFilter] = useState('All States')

  useEffect(() => {
    async function fetchVenues() {
      const supabase = getSupabase()
      const { data } = await supabase.from('venues').select('id, name, slug, type, state, sub_region, description, is_claimed, listing_tier').eq('status', 'published').order('name')
      if (data) setVenues(data)
      setLoading(false)
    }
    fetchVenues()
  }, [])

  const filtered = venues.filter(v => {
    const typeKey = TYPE_KEYS[typeFilter] || 'All'
    const matchType = typeKey === 'All' || v.type === typeKey
    const matchState = stateFilter === 'All States' || v.state === stateFilter
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.sub_region && v.sub_region.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchState && matchSearch
  })

  return (
    <div style={{ padding: '0 24px 64px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Claim a Venue</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 8 }}>Find your venue</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>Search our directory below. Once you've found your venue, click to begin the claim process.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 28, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 16 }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by venue name or region..."
            style={{ width: '100%', padding: '12px 14px 12px 38px', background: 'var(--bg-2)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 14, outline: 'none', borderRadius: 2, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '8px 14px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: typeFilter === t ? 'var(--primary)' : 'var(--bg-2)', color: typeFilter === t ? 'var(--bg)' : 'var(--text-3)', transition: 'all 0.15s' }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATES.map(s => (
            <button key={s} onClick={() => setStateFilter(s)} style={{ padding: '8px 10px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', background: stateFilter === s ? 'rgba(139,117,87,0.15)' : 'var(--bg-2)', color: stateFilter === s ? 'var(--text)' : 'var(--text-3)', transition: 'all 0.15s' }}>{s}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginLeft: 'auto' }}>{filtered.length} venues</span>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading venues...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text-3)', marginBottom: 8 }}>No venues found</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(venue => {
            const color = TYPE_COLORS[venue.type] || '#c8943a'
            return (
              <Link key={venue.id} href={`/vendor/claim/${venue.slug}`}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, textDecoration: 'none', transition: 'all 0.15s ease', opacity: venue.is_claimed ? 0.5 : 1, pointerEvents: venue.is_claimed ? 'none' : 'auto' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}44` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{venue.sub_region && `${venue.sub_region}, `}{venue.state}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>{TYPE_LABELS[venue.type] || venue.type}</div>
                {venue.is_claimed ? (
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Claimed</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>Claim →</span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 32, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Can't find your venue?</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>If your maker or studio isn't listed yet, get in touch and we'll add it.</p>
        <a href="mailto:hello@craftatlas.com.au?subject=Add my venue to Craft Atlas" style={{ display: 'inline-block', padding: '10px 24px', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 2, fontSize: 11, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Contact Us</a>
      </div>
    </div>
  )
}
