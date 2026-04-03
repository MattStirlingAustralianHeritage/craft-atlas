'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const ATLAS_AUTH_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'
const TOKEN_KEY = 'atlas_auth_token'
const VERTICAL = 'Craft Atlas'

export default function NavAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    // Check URL for incoming token (redirect back from auth)
    const params = new URLSearchParams(window.location.search)
    const token = params.get('atlas_token')
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      // Clean URL
      const url = new URL(window.location)
      url.searchParams.delete('atlas_token')
      window.history.replaceState({}, '', url.toString())
    }

    // Check stored token
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      verifyToken(stored)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function verifyToken(token) {
    try {
      const res = await fetch(`${ATLAS_AUTH_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    } catch {
      // Offline or error — keep token, try again later
    }
    setLoading(false)
  }

  function signIn() {
    const returnUrl = window.location.href
    window.location.href = `${ATLAS_AUTH_URL}/api/auth/shared?return_url=${encodeURIComponent(returnUrl)}&vertical=${encodeURIComponent(VERTICAL)}`
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setMenuOpen(false)
  }

  if (!user) {
    return (
      <button
        onClick={() => !loading && signIn()}
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: loading ? 'var(--text-3)' : 'var(--text-2)',
          background: 'none',
          border: 'none',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)',
          padding: 0,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        Sign in
      </button>
    )
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? '??'
  const isVendor = user.role === 'vendor' || user.role === 'admin'
  const isAdmin = user.role === 'admin'

  const menuLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 16px',
    fontSize: 13,
    color: 'var(--text)',
    textDecoration: 'none',
    fontFamily: 'var(--font-sans)',
    borderBottom: '1px solid var(--border)',
  }

  // Vendor/admin get a sage-coloured avatar; regular users get the vertical primary
  const avatarBg = isVendor ? 'var(--sage, #6B7F5E)' : 'var(--primary, #C1603A)'

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Account menu"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: avatarBg,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {initials}
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 220,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Email header with role badge */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
              {user.email}
            </p>
            {isVendor && (
              <span style={{
                display: 'inline-block',
                marginTop: 4,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isAdmin ? '#B45309' : 'var(--sage, #6B7F5E)',
                fontFamily: 'var(--font-sans)',
              }}>
                {isAdmin ? 'Admin' : 'Vendor'}
              </span>
            )}
          </div>

          {/* My account */}
          <Link href="/account" onClick={() => setMenuOpen(false)} style={menuLinkStyle}>
            My account
          </Link>

          {/* Saved makers */}
          <Link href="/account?tab=venues" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, fontSize: 12, color: 'var(--text-2)' }}>
            Saved makers
          </Link>

          {/* Vendor Dashboard — only shown for vendors and admins */}
          {isVendor && (
            <Link href="/vendor/dashboard" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, color: 'var(--sage, #6B7F5E)', fontWeight: 500 }}>
              Vendor Dashboard
            </Link>
          )}

          {/* Admin — only shown for admin role */}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, color: '#B45309', fontWeight: 500, borderBottom: 'none' }}>
              Admin
            </Link>
          )}

          {/* Sign out */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={signOut}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
