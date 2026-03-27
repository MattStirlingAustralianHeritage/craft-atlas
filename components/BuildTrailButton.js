'use client'
import { useState } from 'react'

const AMBER = '#b8862b'

function TrailAuthModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,16,12,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '40px 36px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>🗺️</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>Create an account to build trails</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>Plan and save curated routes across Australia's best craft beverage makers. Free to join.</p>
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('sba:openauth')); onClose() }}
          style={{ display: 'block', width: '100%', padding: '12px 0', background: AMBER, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: 'pointer', marginBottom: 10 }}
        >
          Sign up — it's free
        </button>
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('sba:openauth')); onClose() }}
          style={{ display: 'block', width: '100%', padding: '11px 0', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
        >
          Sign in
        </button>
        <button onClick={onClose} style={{ marginTop: 16, background: 'none', border: 'none', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Maybe later</button>
      </div>
    </div>
  )
}

export default function BuildTrailButton({ style, children }) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      {showModal && <TrailAuthModal onClose={() => setShowModal(false)} />}
      <button
        onClick={() => setShowModal(true)}
        style={{ ...style, cursor: 'pointer', border: 'none' }}
      >
        {children}
      </button>
    </>
  )
}
