// app/claim/success/page.js
// Shown after Stripe checkout completes for a paid claim

import Link from 'next/link'

export default function ClaimSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✓</div>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
          Payment Received
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 16 }}>
          Your venue is claimed
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 32, fontFamily: 'var(--font-sans)' }}>
          Thanks for subscribing. Your claim has been received and your subscription is now active.
          We&apos;ll be in touch shortly to complete verification and give you access to your vendor dashboard.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: 'inline-block', padding: '11px 28px', background: 'var(--amber)',
            color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2,
          }}>
            Back to Atlas →
          </Link>
          <Link href="/vendor/dashboard" style={{
            display: 'inline-block', padding: '11px 28px', border: '1px solid var(--border)',
            color: 'var(--text)', textDecoration: 'none', fontSize: 12, fontWeight: 400,
            letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2,
          }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
