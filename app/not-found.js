import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      background: 'var(--bg)',
    }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="var(--primary)" aria-hidden="true" style={{ margin: '0 auto 18px', display: 'block', opacity: 0.9 }}>
        <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6L12 0z" />
      </svg>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--primary)',
        marginBottom: 12,
      }}>
        Error 404
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontWeight: 400,
        fontSize: 'clamp(34px, 6vw, 48px)',
        letterSpacing: '-0.015em',
        color: 'var(--text)',
        lineHeight: 1.08,
        marginBottom: 10,
      }}>
        Off the map, <em>for now</em>.
      </h1>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 300,
        fontSize: 15,
        color: 'var(--text-2)',
        marginBottom: 32,
        maxWidth: 440,
        lineHeight: 1.6,
      }}>
        The page you&apos;re looking for may have moved or no longer exists.
        Every maker we do list is curated and mapped — try one of these.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {[
          { href: '/map', label: 'Explore the map' },
          { href: '/explore', label: 'Explore makers' },
          { href: '/events', label: 'Events' },
          { href: '/', label: 'Home' },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              fontSize: 14,
              color: 'var(--primary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 16px',
              textDecoration: 'none',
              transition: 'border-color 0.15s ease',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
