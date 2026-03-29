'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const TYPE_COLORS = {
  ceramics: '#4a7c59',
  woodwork: '#6b4f2a',
  jewellery: '#4a3d6b',
  textiles: '#7a5c2e',
  glass: '#6b5a1a',
}

const TYPE_LABELS = {
  ceramics: 'Ceramics',
  woodwork: 'Woodwork',
  jewellery: 'Jewellery',
  textiles: 'Textiles',
  glass: 'Glass',
}

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

export default function ClaimClient({ venues }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')

  const filtered = useMemo(() => {
    return venues.filter(v => {
      const matchSearch = !search ||
        v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.sub_region?.toLowerCase().includes(search.toLowerCase()) ||
        v.state?.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || v.type === typeFilter
      const matchState = stateFilter === 'all' || v.state === stateFilter
      return matchSearch && matchType && matchState
    })
  }, [venues, search, typeFilter, stateFilter])

  const unclaimedCount = venues.filter(v => !v.is_claimed).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* PAGE HEADER */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '48px 48px 40px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            For Makers & Studios
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 16 }}>
            Find & Claim Your Listing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 560, fontFamily: 'var(--font-sans)', marginBottom: 0 }}>
            Search for your studio below. Claiming is free — it lets you update your details, add photos, and respond to visitors.{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{unclaimedCount.toLocaleString()} listings</strong> are still unclaimed.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '12px 48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search makers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 14px', fontSize: 13, border: '1px solid var(--border)',
              borderRadius: 2, background: 'var(--bg)', color: 'var(--text)',
              fontFamily: 'var(--font-sans)', width: 200, outline: 'none'
            }}
          />

          {/* Type filters */}
          {['all', 'ceramics', 'woodwork', 'jewellery', 'textiles', 'glass'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '7px 14px', fontSize: 12, border: '1px solid var(--border)',
                borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                letterSpacing: '0.05em', textTransform: 'capitalize',
                background: typeFilter === t ? 'var(--text)' : 'var(--bg)',
                color: typeFilter === t ? 'var(--bg)' : 'var(--text-2)',
                transition: 'all 0.15s'
              }}
            >
              {t === 'all' ? 'All' : TYPE_LABELS[t]}
            </button>
          ))}

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            style={{
              padding: '7px 14px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 2, background: 'var(--bg)', color: 'var(--text-2)',
              fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="all">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
            {filtered.length.toLocaleString()} listings
          </span>
        </div>
      </div>

      {/* VENUE GRID */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 48px 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 1,
          border: '1px solid var(--border)',
        }}>
          {filtered.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No listings found</div>
            <div style={{ fontSize: 13 }}>Try a different search or filter</div>
          </div>
        )}
      </div>

      {/* BOTTOM CTA */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '48px 24px', background: 'var(--bg-2)', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
            Can&apos;t find your listing?
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
            If your studio isn&apos;t listed yet, get in touch and we&apos;ll add it.
          </p>
          <a
            href="mailto:hello@craftatlas.com.au?subject=Add my listing"
            style={{
              display: 'inline-block', padding: '12px 28px', background: 'var(--primary)',
              color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
              borderRadius: 2
            }}
          >
            Request to be listed →
          </a>
        </div>
      </div>

    </div>
  )
}

function VenueCard({ venue }) {
  const color = TYPE_COLORS[venue.type] || 'var(--text-3)'
  const label = TYPE_LABELS[venue.type] || venue.type

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      padding: '20px 20px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      position: 'relative',
    }}>
      {/* Claimed badge */}
      {venue.is_claimed && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#4a7c59', background: '#f0f7f2', border: '1px solid #c8e6d0',
          padding: '2px 7px', borderRadius: 2, fontFamily: 'var(--font-sans)'
        }}>
          ✓ Claimed
        </div>
      )}

      {/* Type badge */}
      <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color, fontFamily: 'var(--font-sans)', marginBottom: 8, fontWeight: 600 }}>
        ● {label}
      </div>

      {/* Name */}
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>
        {venue.name}
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
        {[venue.sub_region, venue.state].filter(Boolean).join(', ')}
      </div>

      {/* Description */}
      {venue.description && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontFamily: 'var(--font-sans)', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {venue.description}
        </div>
      )}

      {/* Action */}
      <div style={{ marginTop: 'auto' }}>
        {venue.is_claimed ? (
          <Link
            href={`/venue/${venue.slug}`}
            style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}
          >
            View listing →
          </Link>
        ) : (
          <Link
            href={`/claim/${venue.slug}`} onClick={e => { const t = new URLSearchParams(window.location.search).get("tier"); if (t) { e.preventDefault(); window.location.href = `/claim/${venue.slug}?tier=${t}`; } }}
            style={{
              display: 'inline-block', padding: '7px 16px',
              background: 'var(--primary)', color: 'var(--bg)',
              textDecoration: 'none', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)', borderRadius: 2
            }}
          >
            Claim this listing
          </Link>
        )}
      </div>
    </div>
  )
}
