'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import AuthModal from './AuthModal'

export default function NavAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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

  useEffect(() => {
    function handleOpenAuth() { setAuthOpen(true) }
    window.addEventListener('sba:openauth', handleOpenAuth)
    return () => window.removeEventListener('sba:openauth', handleOpenAuth)
  }, [])

  async function handleSignOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setMenuOpen(false)
    setUser(null)
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => !loading && setAuthOpen(true)}
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
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? '??'

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

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Account menu"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--amber)',
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
          width: 210,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Email header */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
              {user.email}
            </p>
          </div>

          {/* My account */}
          <Link href="/account" onClick={() => setMenuOpen(false)} style={menuLinkStyle}>
            My account
          </Link>

          {/* Saved venues */}
          <Link href="/account?tab=venues" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>♡</span>
            Saved venues
          </Link>

          {/* My trails */}
          <Link href="/account?tab=trails" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, fontSize: 12, color: 'var(--text-2)', borderBottom: 'none' }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>🗺</span>
            My trails
          </Link>

          {/* Sign out */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleSignOut}
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
