'use client'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'
import { isApprovedImageSource } from '@/lib/image-utils'

// Craft's dark typographic ground (matches TypographicCard's `craft` token).
const GROUND = '#2a1f14'

/**
 * The selected-maker card — replaces the stock Mapbox popup on /map.
 *
 * variant 'anchored': rendered into a Mapbox marker element (portal), so the
 *   map engine keeps it glued to the pin through pan/zoom. A small diamond
 *   tip points back at the pin.
 * variant 'docked': fixed to the bottom of the viewport on mobile — the
 *   Google Maps pattern; the map stays pannable behind it.
 */
export default function MapPreviewCard({ listing, variant = 'anchored', onClose, onVisit }) {
  const color = TYPE_COLORS[listing.category] || 'var(--primary)'
  const label = TYPE_LABELS[listing.category] || listing.category
  const locality = [listing.suburb || listing.sub_region, listing.state].filter(Boolean).join(', ')
  const desc = listing.description
    ? (listing.description.length > 130 ? listing.description.slice(0, 130).trimEnd() + '…' : listing.description)
    : ''
  const image = listing.hero_image_url && isApprovedImageSource(listing.hero_image_url) ? listing.hero_image_url : null

  return (
    <div
      role="dialog"
      aria-label={listing.name}
      style={{
        width: variant === 'anchored' ? 296 : '100%',
        background: '#FAF7F2',
        borderRadius: 12,
        border: '1px solid rgba(30,26,23,0.10)',
        boxShadow: '0 10px 34px rgba(30,26,23,0.18)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-sans)',
        pointerEvents: 'auto',
      }}
    >
      {/* Image, or a typographic ground band in Craft's dark studio brown */}
      {image ? (
        <div style={{ height: 128, background: '#EFE9E1' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{
          height: 44, background: GROUND, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F2EBE0', opacity: 0.92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label || 'Craft Atlas'}
          </span>
        </div>
      )}

      <button onClick={onClose} aria-label="Close" style={{
        position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(250,247,242,0.94)', border: '1px solid rgba(30,26,23,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: '0 1px 5px rgba(0,0,0,0.12)',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B6560" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <div style={{ padding: '11px 14px 13px' }}>
        {image && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, background: `${color}18`,
              border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 3,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>
                {label}
              </span>
            </span>
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          {listing.name}
        </div>
        {locality && (
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>
            {locality}
          </div>
        )}
        {desc && (
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)', marginTop: 7 }}>{desc}</div>
        )}
        <a
          href={`/venue/${listing.slug}`}
          onClick={() => onVisit?.(listing)}
          style={{
            display: 'block', marginTop: 11, padding: '8px 0', textAlign: 'center',
            background: 'var(--text)', color: 'var(--bg)', textDecoration: 'none',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', borderRadius: 6,
          }}
        >
          View listing →
        </a>
      </div>

      {variant === 'anchored' && (
        <span aria-hidden="true" style={{
          position: 'absolute', left: '50%', bottom: -6, width: 12, height: 12,
          transform: 'translateX(-50%) rotate(45deg)',
          background: '#FAF7F2', borderRight: '1px solid rgba(30,26,23,0.10)', borderBottom: '1px solid rgba(30,26,23,0.10)',
          boxShadow: '3px 3px 6px rgba(30,26,23,0.06)',
        }} />
      )}
    </div>
  )
}
