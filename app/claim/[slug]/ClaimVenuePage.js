'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function ClaimVenuePage({ venue }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier')
  const isStandard = tier === 'standard'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [existingUser, setExistingUser] = useState(null)

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => setExistingUser(user || false))
  }, [])

  async function handleFreeClaim(e) {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      const res = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, venueId: venue.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      await getSupabase().auth.signInWithPassword({ email, password })
      router.push('/claim/pending')
    } catch (err) { setError(err.message); setLoading(false) }
  }

  async function handleStandardClaim(e) {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, venueId: venue.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      await getSupabase().auth.signInWithPassword({ email, password })
      window.location.href = data.url
    } catch (err) { setError(err.message); setLoading(false) }
  }

  async function handleExistingFree() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/claim-existing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: venue.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push('/claim/pending')
    } catch (err) { setError(err.message); setLoading(false) }
  }

  async function handleExistingStandard() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/checkout-existing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: venue.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      window.location.href = data.url
    } catch (err) { setError(err.message); setLoading(false) }
  }

  const typeLabel = venue.type ? venue.type.charAt(0).toUpperCase() + venue.type.slice(1) : 'Institution'
  const location = [venue.sub_region, venue.state].filter(Boolean).join(', ')
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const btn = (dis) => ({ background: dis ? 'var(--border)' : 'var(--amber)', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: dis ? 'not-allowed' : 'pointer', width: '100%', marginTop: 4 })
  const freeFeats = ['Edit your institution description and details','Update opening hours and contact info','Manage your public listing','Upgrade anytime to add photos and events']
  const stdFeats = ['Everything in Free','Unlimited photos','Opening hours & institution features','Events calendar & seasonal highlights','Special offers & promotions','Analytics — page views and visitor trends','Priority placement in search results','Featured in regional guides & discovery trails']

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <section style={{ background: '#1c1a17', padding: '56px 24px 48px', borderBottom: '1px solid #333' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <a href="/claim" style={{ fontSize: 12, color: 'var(--amber)', textDecoration: 'none', letterSpacing: '0.08em', fontFamily: 'var(--font-sans)' }}>
            {String.fromCharCode(8592)} Back to search
          </a>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, color: '#f5f0e8', marginTop: 20, marginBottom: 8, lineHeight: 1.2 }}>Claim {venue.name}</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#b0a090' }}>{typeLabel}{location ? ` · ${location}` : ''}</p>
          {isStandard && <div style={{ marginTop: 16, display: 'inline-block', background: 'rgba(95,138,126,0.2)', border: '1px solid rgba(95,138,126,0.4)', borderRadius: 3, padding: '6px 14px' }}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5F8A7E', fontFamily: 'var(--font-sans)' }}>Standard — $99/yr</span></div>}
        </div>
      </section>
      <section style={{ padding: '48px 24px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 3, padding: '20px 24px', marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{isStandard ? 'Standard includes:' : 'Free account includes:'}</p>
          {(isStandard ? stdFeats : freeFeats).map(item => (
            <p key={item} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', marginBottom: 6, paddingLeft: 18, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: 'var(--amber)' }}>&#10003;</span>{item}</p>
          ))}
        </div>

        {existingUser === null && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-3)' }}>Loading...</p>}

        {existingUser && (
          <div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '16px 20px', marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Signed in as <strong style={{ color: 'var(--text)' }}>{existingUser.email}</strong></p>
            </div>
            {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 2, padding: '10px 14px', marginBottom: 16 }}>{error}</p>}
            <button onClick={isStandard ? handleExistingStandard : handleExistingFree} disabled={loading} style={btn(loading)}>
              {loading ? (isStandard ? 'Redirecting to payment…' : 'Submitting…') : (isStandard ? 'Continue to payment — $99/yr →' : `Claim ${venue.name} — it\'s free`)}
            </button>
            {isStandard && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>You'll be taken to Stripe to complete payment. Billed annually, cancel any time.</p>}
          </div>
        )}

        {existingUser === false && (
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 20 }}>
              {isStandard ? 'Create your account to continue' : 'Create your free account'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Your name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inp} /></div>
              <div><label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@yourvenue.com.au" style={inp} /></div>
              <div><label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={inp} /></div>
              {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 2, padding: '10px 14px' }}>{error}</p>}
              <button onClick={isStandard ? handleStandardClaim : handleFreeClaim} disabled={loading || !name || !email || !password} style={btn(loading || !name || !email || !password)}>
                {loading ? (isStandard ? 'Redirecting to payment…' : 'Setting up your account…') : (isStandard ? 'Continue to payment — $99/yr →' : "List this institution — it\'s free")}
              </button>
            </div>
            {isStandard && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.6 }}>You'll be taken to Stripe to complete payment. Billed annually, cancel any time.</p>}
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginTop: 16, lineHeight: 1.6 }}>By claiming this institution you confirm you are authorised to represent this organisation.{' '}Already have an account?{' '}<a href="/auth/login" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Sign in</a></p>
            {isStandard && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Want free first? <a href={`/claim/${venue.slug}`} style={{ color: 'var(--amber)', textDecoration: 'none' }}>Claim for free instead</a></p>}
          </div>
        )}
      </section>
    </div>
  )
}
