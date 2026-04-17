'use client'

import { isApprovedImageSource } from '@/lib/image-utils'

const VERTICAL_TOKENS = {
  sba:          { bg: '#1a2e1f', text: '#e8f0e9', label: 'Small Batch Atlas' },
  collection:   { bg: '#1e1a35', text: '#e9e7f5', label: 'Culture Atlas' },
  craft:        { bg: '#2a1f14', text: '#f2ebe0', label: 'Craft Atlas' },
  fine_grounds: { bg: '#141210', text: '#f0ebe3', label: 'Fine Grounds Atlas' },
  rest:         { bg: '#162233', text: '#e4edf5', label: 'Rest Atlas' },
  field:        { bg: '#2b2010', text: '#f5edda', label: 'Field Atlas' },
  corner:       { bg: '#191919', text: '#eeeeee', label: 'Corner Atlas' },
  found:        { bg: '#2a1a1f', text: '#f5e8ec', label: 'Found Atlas' },
  table:        { bg: '#1c2415', text: '#eaf0e2', label: 'Table Atlas' },
  portal:       { bg: '#0f0e0c', text: '#f0ece4', label: 'Australian Atlas' },
}

function splitName(name) {
  if (!name) return ['', '']
  const words = name.split(' ')
  if (words.length <= 2) return [name, '']
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function TopoLines({ color }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.07 }} viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" fill="none">
      <path d="M-20 180 Q80 120 200 160 Q320 200 420 140" stroke={color} strokeWidth="1.2" />
      <path d="M-20 220 Q100 170 220 200 Q340 230 420 180" stroke={color} strokeWidth="1" />
      <path d="M-20 260 Q120 210 240 240 Q360 270 420 220" stroke={color} strokeWidth="0.8" />
    </svg>
  )
}

export default function TypographicCard({ name, vertical = 'craft', category, region, state, aspectRatio = '3/2', imageUrl, showVerticalTag = false }) {
  const tokens = VERTICAL_TOKENS[vertical] || VERTICAL_TOKENS.sba
  const isField = vertical === 'field'
  if (imageUrl && isApprovedImageSource(imageUrl)) {
    return (<div style={{ position: 'relative', aspectRatio, borderRadius: 8, overflow: 'hidden', background: tokens.bg }}><img src={imageUrl} alt={name || ''} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /></div>)
  }
  const topLine = showVerticalTag ? `${tokens.label}${category ? '  \u00B7  ' + category : ''}`.toUpperCase() : category ? category.toUpperCase() : null
  const [line1, line2] = splitName(name)
  const bottomLine = [region, state].filter(Boolean).join(', ').toUpperCase()
  return (
    <div style={{ position: 'relative', aspectRatio, borderRadius: 8, overflow: 'hidden', background: tokens.bg, color: tokens.text, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1.25rem', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${tokens.text} 1px, transparent 1px)`, backgroundSize: '16px 16px', opacity: 0.1, pointerEvents: 'none' }} />
      {isField && <TopoLines color={tokens.text} />}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        {topLine && <p style={{ fontFamily: 'var(--font-body, var(--font-sans, "DM Sans", system-ui))', fontSize: 8, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55, margin: '0 0 1rem', lineHeight: 1.4 }}>{topLine}</p>}
        {!topLine && <div style={{ height: '0.5rem' }} />}
        <div style={{ width: 20, height: 1, background: tokens.text, opacity: 0.35, margin: '0 auto 0.75rem' }} />
        <p style={{ fontFamily: 'var(--font-display, var(--font-serif, "Playfair Display", Georgia))', fontSize: 17, fontWeight: 400, margin: 0, lineHeight: 1.3, letterSpacing: '0.01em' }}>{line1}</p>
        {line2 && <p style={{ fontFamily: 'var(--font-display, var(--font-serif, "Playfair Display", Georgia))', fontSize: 17, fontWeight: 400, fontStyle: 'italic', margin: '0.15rem 0 0', lineHeight: 1.3, letterSpacing: '0.01em' }}>{line2}</p>}
        <div style={{ height: '1rem' }} />
        {bottomLine && <p style={{ fontFamily: 'var(--font-body, var(--font-sans, "DM Sans", system-ui))', fontSize: 9, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.45, margin: 0, lineHeight: 1.4 }}>{bottomLine}</p>}
      </div>
    </div>
  )
}
export { VERTICAL_TOKENS }
