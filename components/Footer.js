import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      padding: '32px 24px',
      borderTop: '1px solid var(--border)',
      textAlign: 'center',
    }}>
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
    </footer>
  )
}
