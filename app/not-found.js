import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>Page not found</div>
      <Link href="/" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>← Back to Home</Link>
    </div>
  )
}
