'use client'
// app/vendor/claim/[slug]/page.js

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'

const TIERS = [
  {
    id: 'basic',
    name: 'Free Listing',
    price: 0,
    description: 'Claim and verify your venue with basic details',
    features: ['Verify ownership', 'Update basic info', 'Appear in search'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 99,
    description: 'Enhanced listing with more visibility',
    features: ['Everything in Free', 'Add photos & practice description', 'Extended description', 'Booking & social links', 'QR code'],
    recommended: true,
  },
]

export default function VendorClaimPage() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fatalError, setFatalError] = useState(null)
  const [formError, setFormError] = useState(cancelled === 'true' ? 'Payment was cancelled — you can try again below.' : null)
  const [selectedTier, setSelectedTier] = useState('basic')
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    message: '',
  })

  useEffect(() => {
    async function loadVenue() {
      const supabase = getSupabase()

      // Pre-fill from existing session if signed in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        setForm(p => ({
          ...p,
          contact_email: currentUser.email || '',
          contact_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        }))
      }

      const { data, error } = await supabase
        .from('venues')
        .select('id, name, slug, category, state, suburb')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setFatalError('Venue not found')
      } else if (data.is_claimed) {
        setFatalError('This venue has already been claimed')
      } else {
        setVenue(data)
      }
      setLoading(false)
    }
    if (slug) loadVenue()
  }, [slug])

  async function handleSubmit() {
    if (!venue || !form.contact_name || !form.contact_email) return
    setSubmitting(true)
    setFormError(null)

    try {
      if (selectedTier === 'basic') {
        // Free tier — write directly to DB
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()

        const { error: insertError } = await supabase
          .from('claims')
          .insert({
            venue_id: venue.id,
            venue_name: venue.name,
            contact_name: form.contact_name,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone || null,
            message: form.message || null,
            status: 'pending',
            user_id: user?.id || null,
            selected_tier: 'basic',
          })

        if (insertError) throw insertError
        setSubmitted(true)
        return
      }

      // Paid tier — create pending claim + Stripe session
      const res = await fetch('/api/stripe/claim-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          venueName: venue.name,
          venueSlug: slug,
          tier: selectedTier,
          contactName: form.contact_name,
          contactEmail: form.contact_email,
          contactPhone: form.contact_phone || null,
          message: form.message || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      // Hard redirect to Stripe Checkout
      window.location.href = data.url

    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 2,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-2)',
    fontFamily: 'var(--font-sans)',
    marginBottom: 6,
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
      </div>
    )
  }

  // ── Fatal error (venue not found / already claimed) ──────────────────────
  if (fatalError) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--text)', marginBottom: 12 }}>{fatalError}</div>
          <Link href="/claim" style={{ fontSize: 13, color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>← Back to venue directory</Link>
        </div>
      </div>
    )
  }

  // ── Success (free tier submitted) ────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text)', marginBottom: 12 }}>Claim submitted</div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
            Thanks {form.contact_name}. We&apos;ll review your claim for <strong>{venue?.name}</strong> and be in touch at {form.contact_email}.
          </p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 24px', background: 'var(--primary)',
            color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2,
          }}>
            Back to Atlas →
          </Link>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '48px 48px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link href="/claim" style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.05em' }}>
            ← Back to venue directory
          </Link>
          <div style={{ marginTop: 20, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Claim Your Venue
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 8 }}>
            {venue?.name}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
            {[venue?.suburb, venue?.state].filter(Boolean).join(', ')} · {venue?.category}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Tier selection */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>Choose your listing tier</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 20, lineHeight: 1.5 }}>
            Start with a free listing and upgrade anytime. The Standard tier is an annual subscription.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {TIERS.map(tier => (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                style={{
                  border: `1px solid ${selectedTier === tier.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 2,
                  padding: '20px 16px',
                  cursor: 'pointer',
                  background: selectedTier === tier.id ? 'rgba(193, 96, 58, 0.04)' : 'var(--bg)',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {tier.recommended && (
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: 'var(--bg)', fontSize: 9,
                    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 10px',
                    fontFamily: 'var(--font-sans)', fontWeight: 600, borderRadius: 2,
                    whiteSpace: 'nowrap',
                  }}>
                    Recommended
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{tier.name}</div>
                <div style={{ fontSize: 20, fontFamily: 'var(--font-sans)', color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>
                  {tier.price === 0 ? 'Free' : `$${tier.price}/yr`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 12, lineHeight: 1.4 }}>
                  {tier.description}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', padding: '2px 0' }}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 36 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>Your details</div>
          {user && (
            <div style={{ padding: '10px 14px', background: 'rgba(74, 124, 89, 0.08)', border: '1px solid rgba(74, 124, 89, 0.3)', borderRadius: 2, fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
              Signed in as <strong>{user.email}</strong>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 24, lineHeight: 1.5 }}>
            We&apos;ll use these to verify your claim and get back to you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {formError && (
              <div style={{ padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 2, fontSize: 13, color: '#cf1322', fontFamily: 'var(--font-sans)' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.contact_name}
                  onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Phone (optional)</label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Message (optional)</label>
              <textarea
                value={form.message}
                rows={3}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Tell us about your role at the venue…"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !form.contact_name || !form.contact_email}
                style={{
                  padding: '14px 32px',
                  background: submitting ? 'var(--text-3)' : 'var(--primary)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting
                  ? (selectedTier === 'basic' ? 'Submitting…' : 'Redirecting to payment…')
                  : (selectedTier === 'basic'
                    ? 'Submit Claim →'
                    : `Pay $${TIERS.find(t => t.id === selectedTier)?.price}/yr & Claim →`)}
              </button>

              {selectedTier !== 'basic' && !submitting && (
                <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                  You&apos;ll be redirected to Stripe to complete payment securely. Your claim is saved before checkout — if you cancel, you can return and try again.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
