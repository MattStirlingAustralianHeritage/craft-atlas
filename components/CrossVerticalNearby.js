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

const VERTICAL_CARD_COLORS = {
  sba:          { bg: '#2D1F14', text: '#E8D5C4' },
  collection:   { bg: '#1A2C28', text: '#C4D8D0' },
  craft:        { bg: '#3D2318', text: '#E0C8B8' },
  fine_grounds: { bg: '#1C1A10', text: '#D4D0B8' },
  rest:         { bg: '#1E2535', text: '#C4CCD8' },
  field:        { bg: '#162418', text: '#C0D4C4' },
  table:        { bg: '#1A2410', text: '#C8D4B8' },
  corner:       { bg: '#2A1F30', text: '#D0C4D8' },
  found:        { bg: '#2C2010', text: '#D8CCB4' },
}

export default function CrossVerticalNearby({ lat, lng, currentVertical, listingName, subRegion }) {
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

  const heading = subRegion ? `More in ${subRegion}` : 'Also nearby'

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 48px' }}>
      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
          {heading}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
          From across the Atlas network
        </div>

        <div className="cross-vertical-grid">
          {listings.map(item => {
            const vs = VERTICAL_STYLES[item.vertical] || { bg: '#f0f0f0', text: '#666', label: item.vertical }
            const dark = VERTICAL_CARD_COLORS[item.vertical] || { bg: '#1a1a1a', text: '#ccc' }
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
                <div style={{ aspectRatio: '3/2', background: item.image_url ? vs.bg : dark.bg, overflow: 'hidden' }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 14px', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 400, color: dark.text, fontFamily: 'var(--font-serif)', lineHeight: 1.3, textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: dark.text, opacity: 0.4, fontFamily: 'var(--font-sans)' }}>
                        {vs.label}
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
