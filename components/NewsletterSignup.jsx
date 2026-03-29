'use client'
import { useState } from 'react'

export default function NewsletterSignup({ source = 'website' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('Check your inbox to confirm your subscription.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ padding: '24px', background: 'var(--card-bg, #f5f2ed)', borderTop: '2px solid var(--primary, #C1603A)' }}>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--text, #1a1a1a)', fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px', background: 'var(--card-bg, #f5f2ed)', borderTop: '2px solid var(--primary, #C1603A)' }}>
      <p style={{ margin: '0 0 6px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted, #888)', fontFamily: 'Georgia, serif' }}>
        The Monthly Edit
      </p>
      <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 'normal', color: 'var(--text, #1a1a1a)', fontFamily: 'Georgia, serif' }}>
        Craft Atlas Newsletter
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--muted-text, #555)', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
        A monthly edit of the best Australian makers. No noise, no filler.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: '1 1 220px',
            padding: '10px 14px',
            fontSize: '14px',
            border: '1px solid var(--border, #ddd)',
            background: 'var(--bg, #fff)',
            color: 'var(--text, #1a1a1a)',
            outline: 'none',
            fontFamily: 'Georgia, serif',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '10px 20px',
            background: 'var(--primary, #C1603A)',
            color: '#fff',
            border: 'none',
            fontSize: '13px',
            letterSpacing: '0.04em',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
            fontFamily: 'Georgia, serif',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && (
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#c0392b', fontFamily: 'Georgia, serif' }}>
          {message}
        </p>
      )}
    </div>
  )
}
