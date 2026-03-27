'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

const TIER_LABEL = {
  standard: 'Partner',
  premium: 'Premium Partner',
  founding: 'Founding Partner',
}

export default function PartnerPage() {
  const { slug } = useParams()
  const [partner, setPartner] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = getSupabase()

      const { data: p } = await supabase
        .from('partners')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single()

      if (!p) { setNotFound(true); setLoading(false); return }
      setPartner(p)

      const { data: subs } = await supabase
        .from('partner_submissions')
        .select('id, title, excerpt, vertical, region, slug, hero_image_url, tags, submitted_at, reviewed_at')
        .eq('partner_id', p.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })

      setSubmissions(subs || [])
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Loading…</span>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontSize: 15, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>Partner not found.</p>
      <Link href="/partners" style={{ fontSize: 13, color: 'var(--amber)', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}>← Back to Partners</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 120px' }}>

      {/* Breadcrumb */}
      <Link href="/partners" style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 40 }}>
        ← Partners
      </Link>

      {/* Partner header */}
      <div style={{ marginBottom: 64 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
          {partner.logo_url && (
            <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <img src={partner.logo_url} alt={partner.org_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', margin: '0 0 6px 0' }}>
              {TIER_LABEL[partner.tier] || 'Partner'}
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 400, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {partner.org_name}
            </h1>
          </div>
        </div>

        {partner.description && (
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', margin: '0 0 16px 0', maxWidth: 560 }}>
            {partner.description}
          </p>
        )}

        {partner.website && (
          <a href={partner.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.04em' }}>
            {partner.website.replace(/^https?:\/\//, '')} ↗
          </a>
        )}
      </div>

      {/* Disclosure statement */}
      <div style={{ padding: '16px 20px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 56 }}>
        <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Partner content.</span>{' '}
          The articles below were produced in partnership with {partner.org_name}. All content
          is clearly labelled and held to the same editorial standards as our own work.
        </p>
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>No published content yet.</p>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {submissions.map(sub => (
            <div key={sub.id} style={{ padding: '36px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {sub.hero_image_url && (
                  <div style={{ width: 120, height: 80, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-2)' }}>
                    <img src={sub.hero_image_url} alt={sub.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    {sub.vertical && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)' }}>
                        {sub.vertical}
                      </span>
                    )}
                    {sub.region && (
                      <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                        {sub.region}
                      </span>
                    )}
                    {sub.reviewed_at && (
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                        {formatDate(sub.reviewed_at)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', margin: '0 0 10px 0', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                    {sub.slug ? (
                      <Link href={`/journal/${sub.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>
                        {sub.title}
                      </Link>
                    ) : sub.title}
                  </h2>

                  {/* Excerpt */}
                  {sub.excerpt && (
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', margin: '0 0 14px 0' }}>
                      {sub.excerpt}
                    </p>
                  )}

                  {/* Tags */}
                  {(sub.tags || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {sub.tags.map(t => (
                        <span key={t} style={{ padding: '2px 8px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {sub.slug && (
                    <Link href={`/journal/${sub.slug}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--amber)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
                      Read in Journal →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
