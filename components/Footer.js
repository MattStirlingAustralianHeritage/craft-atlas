import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      padding: '32px 24px',
      borderTop: '1px solid var(--border)',
      textAlign: 'center',
    }}>
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
