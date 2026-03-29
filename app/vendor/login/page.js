'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '../layout'

export default function VendorLoginPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/vendor/dashboard')
    }
  }, [user, authLoading])

  async function handleEmailAuth(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getSupabase()

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/vendor/login`,
      })
      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setError(null)
        // Show a message to check email
        setResetSent(true)
      }
      setLoading(false)
      return
    }

    // Login
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, useEffect above will redirect
  }

  async function handleGoogleAuth() {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/vendor/dashboard` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Loading...</div>
      </div>
    )
  }

  const title = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Maker sign in'
  const submitLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'

  if (resetSent) {
    return (
      <div style={{ padding: '80px 24px', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 20 }}>✉️</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 12 }}>
          {mode === 'signup' ? 'Check your email' : 'Reset link sent'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.7, marginBottom: 28 }}>
          {mode === 'signup'
            ? `We've sent a confirmation link to ${email}. Click it to activate your account.`
            : `We've sent a password reset link to ${email}.`}
        </p>
        <button onClick={() => { setMode('login'); setResetSent(false) }} style={{
          fontSize: 13, color: 'var(--primary)', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'underline',
        }}>
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '80px 24px', maxWidth: 420, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          For Makers
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 10 }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
          {mode === 'login' && 'Sign in to manage your studio listing.'}
          {mode === 'signup' && 'Create an account to claim and manage your venue.'}
          {mode === 'reset' && 'Enter your email and we\'ll send you a reset link.'}
        </p>
      </div>

      {/* Google OAuth */}
      {mode !== 'reset' && (
        <>
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px',
              background: 'var(--bg-2)', border: '1px solid var(--border-2)',
              borderRadius: 2, fontSize: 13, fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'border-color 0.15s',
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>or</div>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        </>
      )}

      {/* Email/password form */}
      <form onSubmit={handleEmailAuth}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@yourvenue.com.au"
            required
            style={inputStyle}
          />
        </div>

        {mode !== 'reset' && (
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>
        )}

        {mode === 'login' && (
          <div style={{ marginBottom: 20, textAlign: 'right' }}>
            <button type="button" onClick={() => setMode('reset')} style={{
              fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'rgba(192,75,75,0.1)', border: '1px solid rgba(192,75,75,0.25)',
            borderRadius: 2, fontSize: 13, color: '#c04b4b', fontFamily: 'var(--font-sans)',
          }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '13px 20px',
            background: 'var(--primary)', color: 'var(--bg)',
            border: 'none', borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)',
            opacity: loading ? 0.7 : 1,
            marginBottom: 20,
          }}
        >
          {loading ? 'Please wait...' : submitLabel}
        </button>
      </form>

      {/* Mode switcher */}
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
        {mode === 'login' && (
          <>Don't have an account?{' '}
            <button onClick={() => { setMode('signup'); setError(null) }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600 }}>
              Sign up
            </button>
          </>
        )}
        {(mode === 'signup' || mode === 'reset') && (
          <>Already have an account?{' '}
            <button onClick={() => { setMode('login'); setError(null) }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600 }}>
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  marginBottom: 8,
  fontFamily: 'var(--font-sans)',
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  borderRadius: 2,
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
}
