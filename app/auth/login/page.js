'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/vendor/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // If already logged in, redirect
  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(redirect)
    })
  }, [redirect, router])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(redirect)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <section style={{ background: '#1c1a17', padding: '72px 24px 56px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>Venue portal</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 400, color: '#f5f0e8', lineHeight: 1.2 }}>
            Sign in to your account
          </h1>
        </div>
      </section>

      <section style={{ padding: '48px 24px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.04em' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@yourvenue.com.au"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.04em' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: 2, padding: '10px 14px' }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              background: loading ? 'var(--border)' : 'var(--primary)',
              color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 2,
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', width: '100%', marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)', marginTop: 24, lineHeight: 1.7 }}>
          Don't have an account?{' '}
          <a href="/claim" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Find and claim your listing →</a>
        </p>
      </section>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
