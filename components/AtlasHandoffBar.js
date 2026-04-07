'use client'
import { useState, useEffect } from 'react'

// ============================================================
// Atlas Handoff Bar
// Shows a slim persistent bar when a user arrives from
// australianatlas.com.au, linking back to the portal.
// Persists via cookie so it shows on subsequent page views.
// Dismissible per session.
// ============================================================

const VERTICAL_NAMES = {
  'smallbatchatlas.com.au': 'Small Batch Atlas',
  'collectionatlas.com.au': 'Collection Atlas',
  'craftatlas.com.au': 'Craft Atlas',
  'finegroundsatlas.com.au': 'Fine Grounds Atlas',
  'restatlas.com.au': 'Rest Atlas',
  'fieldatlas.com.au': 'Field Atlas',
  'corneratlas.com.au': 'Corner Atlas',
  'foundatlas.com.au': 'Found Atlas',
  'tableatlas.com.au': 'Table Atlas',
}

const BAR_HEIGHT = 36

export default function AtlasHandoffBar() {
  const [visible, setVisible] = useState(false)
  const [verticalName, setVerticalName] = useState('')

  useEffect(() => {
    // Already dismissed this session
    try { if (sessionStorage.getItem('atlas_bar_dismissed')) return } catch {}

    // Check referrer or cookie
    const fromAtlas = document.referrer.includes('australianatlas.com.au')
    const hasCookie = document.cookie.includes('atlas_referral=1')

    if (!fromAtlas && !hasCookie) return

    // Set/refresh cookie (7 days)
    if (!hasCookie) {
      document.cookie = 'atlas_referral=1; path=/; max-age=604800; SameSite=Lax'
    }

    // Detect vertical name from hostname
    const host = window.location.hostname.replace(/^www\./, '')
    const name = VERTICAL_NAMES[host] || 'this site'
    setVerticalName(name)
    setVisible(true)
  }, [])

  // Shift nav and main content down when bar is visible
  useEffect(() => {
    if (!visible) return
    const nav = document.querySelector('nav')
    const main = document.querySelector('main')
    if (nav) nav.style.top = `${BAR_HEIGHT}px`
    if (main) main.style.paddingTop = `${64 + BAR_HEIGHT}px`
    return () => {
      if (nav) nav.style.top = ''
      if (main) main.style.paddingTop = ''
    }
  }, [visible])

  function dismiss() {
    setVisible(false)
    try { sessionStorage.setItem('atlas_bar_dismissed', '1') } catch {}
    // Revert layout shifts
    const nav = document.querySelector('nav')
    const main = document.querySelector('main')
    if (nav) nav.style.top = ''
    if (main) main.style.paddingTop = ''
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        height: BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        background: '#1a1614',
        color: '#e8e0d8',
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.01em',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ opacity: 0.7 }}>You&rsquo;re browsing</span>
      <span style={{ fontWeight: 600 }}>{verticalName}</span>
      <span style={{ opacity: 0.4 }}>&mdash;</span>
      <span style={{ opacity: 0.7 }}>part of</span>
      <a
        href="https://australianatlas.com.au"
        style={{
          color: '#c8943a',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Australian Atlas
      </a>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#e8e0d8',
          opacity: 0.4,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '4px 6px',
        }}
      >
        &times;
      </button>
    </div>
  )
}
