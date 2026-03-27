'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function UpgradePage() {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  async function handleUpgrade(tier) {
    setLoading(tier)
    setError(null)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const priceId = 'price_1TCT8qCYUnk0uJIYnV0i9ovZ'

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ priceId, tier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Could not start checkout')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <section style={{ background: '#1c1a17', padding: '72px 24px 56px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <a href="/vendor/dashboard" style={{ fontSize: 12, color: 'var(--amber)', textDecoration: 'none', letterSpacing: '0.08em', fontFamily: 'var(--font-sans)' }}>← Back to dashboard</a>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, color: '#f5f0e8', marginTop: 20, marginBottom: 12, lineHeight: 1.2 }}>
            Upgrade your listing
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: '#b0a090', lineHeight: 1.7 }}>
            Unlock photos, events, and more visibility for visitors planning their next visit.
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 24px', maxWidth: 680, margin: '0 auto' }}>
        {error && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 2, padding: '10px 14px', marginBottom: 24 }}>{error}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              tier: 'standard',
              price: '$99/year',
              label: 'Standard',
              features: ['Full venue description', 'Opening hours', 'Contact details', 'Up to 5 photos', 'Priority placement in search'],
            },
            {
              tier: 'standard',
              price: '$499/year',
              label: 'Standard',
              highlight: true,
              features: ['Everything in Standard', 'Unlimited photos', 'Events & specials', 'Featured in tasting trails', 'Analytics dashboard', 'Newsletter features'],
            },
          ].map(plan => (
            <div key={plan.tier} style={{
              background: plan.highlight ? '#1c1a17' : 'var(--bg-2)',
              border: `1px solid ${plan.highlight ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 4,
              padding: '32px 28px',
            }}>
              {plan.highlight && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12 }}>Most popular</p>
              )}
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: plan.highlight ? '#f5f0e8' : 'var(--text)', marginBottom: 4 }}>{plan.label}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, color: plan.highlight ? '#f5f0e8' : 'var(--text)', marginBottom: 24 }}>{plan.price}</p>
              {plan.features.map(f => (
                <p key={f} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: plan.highlight ? '#b0a090' : 'var(--text-2)', marginBottom: 8, paddingLeft: 16, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--amber)' }}>✓</span>{f}
                </p>
              ))}
              <button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={!!loading}
                style={{
                  width: '100%', marginTop: 24, padding: '12px 0',
                  background: plan.highlight ? 'var(--amber)' : 'transparent',
                  border: `1px solid ${plan.highlight ? 'var(--amber)' : 'var(--border)'}`,
                  color: plan.highlight ? '#fff' : 'var(--text)',
                  borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 13,
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading === plan.tier ? 'Redirecting…' : `Upgrade to ${plan.label}`}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginTop: 32, lineHeight: 1.7 }}>
          Billed annually. Cancel any time — your free listing remains active. Payments processed securely via Stripe.
        </p>
      </section>
    </div>
  )
}
