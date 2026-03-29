'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
          Craft Atlas
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 32, textAlign: 'center' }}>
          Admin Access
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 2, fontSize: 14, fontFamily: 'var(--font-sans)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
          />
          {error && (
            <div style={{ fontSize: 13, color: '#8b4a4a', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{ width: '100%', padding: '13px', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: loading ? 'wait' : 'pointer', opacity: loading || !password ? 0.7 : 1 }}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
