'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import NavAuth from './NavAuth'

const AMBER = '#b8862b'

export default function Nav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const links = [
    { href: '/map', label: 'Map' },
    { href: '/explore', label: 'Explore' },
    { href: '/trails', label: 'Trails' },
    { href: '/journal', label: 'Journal' },
    { href: '/about', label: 'About' },
    { href: '/partners', label: 'Partners' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(245,240,232,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 200,
        boxSizing: 'border-box',
      }}>
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Small Batch
          </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--text)', letterSpacing: '0.01em' }}>
            Atlas
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {links.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: pathname === link.href ? 'var(--amber)' : 'var(--text-2)',
              textDecoration: 'none', fontFamily: 'var(--font-sans)', transition: 'color 0.15s ease',
            }}>
              {link.label.toUpperCase()}
            </Link>
          ))}
          <Link href="/for-vendors" style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-3)', textDecoration: 'none', fontFamily: 'var(--font-sans)',
            padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 2,
          }}>
            For Venues
          </Link>
          <NavAuth />
        </div>

        {/* Mobile right side — auth + hamburger */}
        <div className="nav-mobile" style={{ display: 'none', alignItems: 'center', gap: 12 }}>
          <NavAuth />
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
              width: 32, height: 32,
            }}
          >
            {menuOpen ? (
              // X icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            ) : (
              // Hamburger icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="nav-mobile" style={{
          display: 'flex',
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          background: 'rgba(245,240,232,0.99)',
          flexDirection: 'column',
          zIndex: 199,
          overflowY: 'auto',
          padding: '8px 0 32px',
        }}>
          {links.map(link => (
            <Link key={link.href} href={link.href} style={{
              display: 'block', padding: '16px 28px',
              fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
              color: pathname === link.href ? AMBER : 'var(--text)',
              borderBottom: '1px solid var(--border)',
            }}>
              {link.label}
            </Link>
          ))}
          <Link href="/for-vendors" style={{
            display: 'block', padding: '16px 28px',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
            color: 'var(--text-3)', borderBottom: '1px solid var(--border)',
          }}>
            For Venues
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
      `}</style>
    </>
  )
}
