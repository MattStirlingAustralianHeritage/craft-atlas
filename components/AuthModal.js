'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { getSupabase } from '@/lib/supabase'

export default function AuthModal({ isOpen, onClose, redirectTo }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [done, setDone] = useState(null) // null | 'verify' | 'signin'
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const redirect = redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/account`

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message)
    } else {
      onClose()
      window.location.reload()
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: { full_name: name },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone('verify')
    }
  }

  async function handleForgot() {
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/account`,
    })
    setLoading(false)
    if (error) { setError(error.message) } else { setDone('reset') }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid var(--border-2)', borderRadius: 2,
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
    outline: 'none', marginBottom: 12,
  }

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)',
  }

  function reset() { setDone(null); setError(''); setPassword('') }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.45)',
      }}
    >
      <div style={{
        background: 'var(--bg)', borderRadius: 8, width: '100%', maxWidth: 360,
        padding: 32, position: 'relative', boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
          fontSize: 20, cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1,
        }}>×</button>

        {done === 'verify' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>
              Verify your email
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Click it to activate your account.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, fontFamily: 'var(--font-sans)' }}>
              Already confirmed?{' '}
              <button onClick={() => { reset(); setMode('signin') }} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                Sign in
              </button>
            </p>
          </div>
        )}

        {done === 'reset' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
              We sent a password reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            </p>
            <button onClick={reset} style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
              ← Back
            </button>
          </div>
        )}

        {!done && (
          <>
            {/* Tab toggle */}
            <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
              {['signin', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                  flex: 1, padding: '10px 0', background: 'none', border: 'none',
                  borderBottom: mode === m ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1, fontSize: 13, fontWeight: mode === m ? 600 : 400,
                  color: mode === m ? 'var(--text)' : 'var(--text-3)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.02em',
                }}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              {mode === 'signin' ? 'Save makers and track your favourites.' : 'Join to save makers, build trails, and more.'}
            </p>

            {/* Google */}
            <button onClick={handleGoogle} disabled={googleLoading} style={{
              width: '100%', padding: '11px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: '#fff', border: '1px solid var(--border-2)', borderRadius: 2,
              fontSize: 13, fontWeight: 600, color: '#3c4043', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', opacity: googleLoading ? 0.6 : 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Email/password form */}
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
              {mode === 'signup' && (
                <>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                </>
              )}
              <label style={labelStyle}>Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              <label style={labelStyle}>Password</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={inputStyle} />

              {error && <p style={{ fontSize: 13, color: '#c04b4b', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '11px 24px', background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>

              {mode === 'signin' && (
                <button type="button" onClick={handleForgot} style={{
                  marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)',
                  textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center',
                }}>
                  Forgot password?
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
