'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

const STATUS_META = {
  draft:              { label: 'Draft',              color: '#888',    bg: 'rgba(136,136,136,0.08)' },
  under_review:       { label: 'Under Review',       color: 'var(--primary)', bg: 'rgba(200,148,58,0.08)' },
  revision_requested: { label: 'Revision Requested', color: '#c8943a', bg: 'rgba(200,148,58,0.08)' },
  approved:           { label: 'Approved',           color: '#4a7c59', bg: 'rgba(74,124,89,0.08)'   },
  rejected:           { label: 'Rejected',           color: '#8b4a4a', bg: 'rgba(139,74,74,0.08)'   },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`, fontFamily: 'var(--font-sans)' }}>
      {meta.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PartnerDashboard() {
  const router = useRouter()
  const supabase = getSupabase()

  const [partner, setPartner] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: partnerData, error: pErr } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pErr || !partnerData) {
        setError('No partner account found for this user.')
        setLoading(false)
        return
      }

      setPartner(partnerData)

      const { data: subs } = await supabase
        .from('partner_submissions')
        .select('id, title, vertical, region, status, submitted_at, created_at')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })

      setSubmissions(subs || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Loading…</span>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#8b4a4a', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>{error}</span>
    </div>
  )

  const tierLabel = partner.tier === 'premium' ? 'Premium Partner' : partner.tier === 'founding' ? 'Founding Partner' : 'Standard Partner'
  const draftCount = submissions.filter(s => s.status === 'draft').length
  const reviewCount = submissions.filter(s => s.status === 'under_review').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '8px', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>
                {tierLabel}
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: '400', color: 'var(--text)', margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>
                {partner.org_name}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-sans)' }}>{partner.contact_email}</p>
            </div>
            <Link href="/partner/submit" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'var(--primary)', color: 'var(--bg)', border: 'none', padding: '11px 24px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px', fontFamily: 'var(--font-sans)' }}>
                + New Submission
              </button>
            </Link>
          </div>
        </div>

        {/* Verticals */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>
            Active Verticals
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(partner.verticals || []).map(v => (
              <span key={v} style={{ padding: '4px 12px', border: '1px solid var(--border)', borderRadius: '2px', fontSize: '12px', color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>{v}</span>
            ))}
            {(!partner.verticals || partner.verticals.length === 0) && (
              <span style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>No verticals assigned yet</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '3px', marginBottom: '48px', overflow: 'hidden' }}>
          {[['Drafts', draftCount], ['Under Review', reviewCount], ['Approved', approvedCount]].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg)', padding: '20px 24px' }}>
              <div style={{ fontSize: '28px', fontWeight: '300', color: 'var(--text)', marginBottom: '4px', fontFamily: 'var(--font-serif)' }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Submissions list */}
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '16px', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>
            Submissions
          </p>

          {submissions.length === 0 ? (
            <div style={{ padding: '60px 40px', border: '1px solid var(--border)', borderRadius: '3px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '20px', fontFamily: 'var(--font-sans)' }}>No submissions yet.</p>
              <Link href="/partner/submit" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '9px 20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px', fontFamily: 'var(--font-sans)' }}>
                  Write your first piece
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
              {submissions.map((sub, i) => (
                <div key={sub.id} style={{ padding: '16px 20px', borderBottom: i < submissions.length - 1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '16px', background: 'var(--bg)' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 4px 0', fontWeight: '500', fontFamily: 'var(--font-sans)' }}>
                      {sub.title || <em style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Untitled draft</em>}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                      {[sub.vertical, sub.region].filter(Boolean).join(' · ')}
                      {sub.submitted_at && ` · Submitted ${formatDate(sub.submitted_at)}`}
                      {!sub.submitted_at && ` · Created ${formatDate(sub.created_at)}`}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                  {(sub.status === 'draft' || sub.status === 'revision_requested') && (
                    <Link href={`/partner/submit?id=${sub.id}`} style={{ textDecoration: 'none' }}>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>Edit →</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function PartnerDashboardWrapper() {
  return <Suspense fallback={null}><PartnerDashboard /></Suspense>
}
