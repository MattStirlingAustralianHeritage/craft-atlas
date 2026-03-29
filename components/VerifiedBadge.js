'use client'

export default function VerifiedBadge({ tier = 'standard', size = 'default' }) {
  const sizes = {
    small: { icon: 14, font: 10, padding: '2px 6px' },
    default: { icon: 16, font: 12, padding: '3px 8px' },
    large: { icon: 20, font: 14, padding: '4px 10px' },
  }
  const s = sizes[size] || sizes.default

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: '#C1603A', color: '#fff',
      borderRadius: '4px', padding: s.padding,
      fontSize: `${s.font}px`, fontWeight: '600',
      letterSpacing: '0.03em', textTransform: 'uppercase',
      lineHeight: 1, whiteSpace: 'nowrap',
    }} title="Verified Listing">
      <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      Verified
    </span>
  )
}
