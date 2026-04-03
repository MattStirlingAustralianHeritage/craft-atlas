'use client'

import { useState, useEffect } from 'react'

const ATLAS_API = process.env.NEXT_PUBLIC_ATLAS_API_URL || 'https://australianatlas.com.au'

const VERTICAL_STYLES = {
  sba:          { bg: '#EEEDFE', text: '#3C3489', label: 'Small Batch' },
  collection:   { bg: '#E6F1FB', text: '#185FA5', label: 'Collections' },
  craft:        { bg: '#E1F5EE', text: '#0F6E56', label: 'Craft' },
  fine_grounds: { bg: '#FAEEDA', text: '#854F0B', label: 'Fine Grounds' },
  rest:         { bg: '#FAECE7', text: '#993C1D', label: 'Rest' },
  field:        { bg: '#EAF3DE', text: '#3B6D11', label: 'Field' },
  table:        { bg: '#FCEBEB', text: '#A32D2D', label: 'Table' },
  corner:       { bg: '#FBEAF0', text: '#993556', label: 'Corner' },
  found:        { bg: '#F1EFE8', text: '#5F5E5A', label: 'Found' },
}

export default function CrossVerticalNearby({ lat, lng, currentVertical, listingName }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lat || !lng) { setLoading(false); return }

    fetch(`${ATLAS_API}/api/nearby?lat=${lat}&lng=${lng}&exclude_vertical=${currentVertical}&limit=6`)
      .then(r => r.json())
      .then(data => {
        setListings(data.listings || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lat, lng, currentVertical])

  if (loading) {
    return (
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem' }}>
          <div className="cross-vertical-grid">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 200, background: 'var(--bg-2)', borderRadius: 4, animation: 'cvPulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <style>{`
          .cross-vertical-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          @keyframes cvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @media (max-width: 768px) { .cross-vertical-grid { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 480px) { .cross-vertical-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>
    )
  }

  if (listings.length < 3) return null

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 48px' }}>
      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
          Also nearby
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
          From across the Atlas network
        </div>

        <div className="cross-vertical-grid">
          {listings.map(item => {
            const vs = VERTICAL_STYLES[item.vertical] || { bg: '#f0f0f0', text: '#666', label: item.vertical }
            return (
              <a
                key={item.id}
                href={item.venue_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ aspectRatio: '3/2', background: vs.bg, overflow: 'hidden' }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 36, fontWeight: 300, color: vs.text, opacity: 0.4, fontFamily: 'var(--font-serif)' }}>
                        {item.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 12px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                    fontSize: 10, fontWeight: 500, backgroundColor: vs.bg, color: vs.text,
                    marginBottom: 6, fontFamily: 'var(--font-sans)',
                  }}>
                    {vs.label}
                  </span>

                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
                    {item.name}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-3)' }}>
                      {item.region || item.state}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-3)' }}>
                      {item.distance_km < 1 ? '<1' : item.distance_km} km
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      <style>{`
        .cross-vertical-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @keyframes cvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 768px) { .cross-vertical-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .cross-vertical-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  )
}
