import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      {/* The ten grounds as a woven hairline — the network's signature thread. */}
      <div className="spectrum-hairline" aria-hidden="true" />
      {/* Ghost wordmark — the site signs off at full display scale, barely
          above the ground. Decorative only. */}
      <p
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontWeight: 380,
          fontSize: 'clamp(64px, 11vw, 168px)',
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          color: 'rgba(30, 26, 23, 0.045)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          userSelect: 'none',
          textAlign: 'center',
          margin: 0,
          padding: '30px 8px 0',
        }}
      >
        Craft Atlas
      </p>
      <div style={{ padding: '18px 24px 32px', textAlign: 'center' }}>
        {/* Brand line — compass-star emblem beside the two-part wordmark. */}
        <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6L12 0z" />
          </svg>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>Craft</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text)' }}>Atlas</span>
          </span>
        </p>
        <p style={{
          fontSize: 12,
          color: 'var(--text-3)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 300,
          marginBottom: 8,
        }}>
          Part of the{' '}
          <a href="https://www.australianatlas.com.au" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            Australian Atlas network
          </a>
        </p>
        <div style={{
          fontSize: 11,
          color: 'var(--text-3)',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.04em',
        }}>
          © {new Date().getFullYear()} Craft Atlas · Australian makers & studios
        </div>
      </div>
    </footer>
  )
}
