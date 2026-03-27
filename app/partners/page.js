'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'


const TIER_LABEL = {
  standard: 'Partner',
  premium: 'Premium Partner',
  founding: 'Founding Partner',
}

export default function PartnersPage() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await getSupabase()
        .from('partners')
        .select('id, org_name, slug, description, website, logo_url, tier, verticals')
        .eq('active', true)
        .order('created_at', { ascending: true })
      setPartners(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 120px' }}>

      {/* Header */}
      <div style={{ marginBottom: '72px' }}>
        <p style={{
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--amber)',
          fontFamily: 'var(--font-sans)',
          marginBottom: '20px',
        }}>
          Partners
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: '400',
          lineHeight: '1.2',
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          margin: '0 0 28px 0',
        }}>
          Working with the people<br />who know these places best.
        </h1>
        <p style={{
          fontSize: '16px',
          lineHeight: '1.75',
          color: 'var(--text-2)',
          fontFamily: 'var(--font-sans)',
          maxWidth: '580px',
          margin: 0,
        }}>
          Small Batch Atlas works with a small number of regional tourism bodies and industry
          organisations to bring curated editorial content to the Journal. Our partners are
          chosen for their knowledge of place and their commitment to the producers we cover.
          All partner content is clearly labelled and held to the same editorial standards
          as our own work.
        </p>
      </div>

      {/* Partner list */}
      {!loading && partners.length > 0 && (
        <div style={{ marginBottom: '80px' }}>
          <div style={{
            borderTop: '1px solid var(--border)',
          }}>
            {partners.map(p => (
              <div key={p.id} style={{
                padding: '32px 0',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start',
              }}>
                {p.logo_url && (
                  <div style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: '3px',
                    overflow: 'hidden',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                  }}>
                    <img src={p.logo_url} alt={p.org_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--text)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}>
                      {p.website ? (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                          {p.org_name}
                        </a>
                      ) : p.org_name}
                    </h2>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--amber)',
                      fontFamily: 'var(--font-sans)',
                      opacity: 0.8,
                    }}>
                      {TIER_LABEL[p.tier] || 'Partner'}
                    </span>
                  </div>
                  {p.description && (
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.65',
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-sans)',
                      margin: '0 0 12px 0',
                    }}>
                      {p.description}
                    </p>
                  )}
                  {p.slug && (
                    <Link href={`/partners/${p.slug}`} style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.06em',
                      color: 'var(--amber)',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-sans)',
                    }}>
                      View content →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: '56px' }} />

      {/* Partner with us */}
      <div>
        <p style={{
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-sans)',
          marginBottom: '16px',
        }}>
          Work with us
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '24px',
          fontWeight: '400',
          color: 'var(--text)',
          margin: '0 0 16px 0',
          letterSpacing: '-0.01em',
          lineHeight: '1.3',
        }}>
          Partner with Small Batch Atlas
        </h2>
        <p style={{
          fontSize: '15px',
          lineHeight: '1.75',
          color: 'var(--text-2)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 12px 0',
          maxWidth: '520px',
        }}>
          We work with regional tourism bodies, industry associations, and organisations
          with a genuine connection to Australia's craft drinks producers. Partners contribute
          editorial content to the Journal under our standard disclosure framework.
        </p>
        <p style={{
          fontSize: '15px',
          lineHeight: '1.75',
          color: 'var(--text-2)',
          fontFamily: 'var(--font-sans)',
          margin: '0 0 32px 0',
          maxWidth: '520px',
        }}>
          Partnerships are annual and available in Standard, Premium, and Founding tiers.
          We keep the number of partners small by design.
        </p>
        <a
          href="mailto:matt@smallbatchatlas.com.au?subject=Partnership enquiry — Small Batch Atlas"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--amber)',
            color: 'var(--bg)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            borderRadius: '2px',
          }}
        >
          Get in touch
        </a>
      </div>

    </div>
  )
}
