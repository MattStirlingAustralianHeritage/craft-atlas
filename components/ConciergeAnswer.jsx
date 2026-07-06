'use client'

// components/ConciergeAnswer.jsx
// "Ask the Atlas" concierge answer panel — the vertical-side render of the
// portal's plain-language search answer. Self-contained (imports only React)
// and themed entirely through the site's CSS variables so it drops into any
// vertical unchanged. Shown above the results when a query reads as a plain-
// language inquiry and the portal returned a written, grounded answer.
//
// Props:
//   answer   the grounded reply string (required to render anything)
//   intent   short label chip (e.g. "gift shopping") — optional
//   accent   accent colour (default var(--accent))
//   loading  true while the concierge is still thinking
//   onExact  optional — called when the user opts out to a plain lookup

export default function ConciergeAnswer({ answer, intent, accent = 'var(--accent)', loading = false, onExact }) {
  if (!answer && !loading) return null
  return (
    <div
      style={{
        margin: '0 0 22px',
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--bg-2, #f5f0e8)',
        border: '1px solid var(--border, #e3ddd1)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent }} aria-hidden="true">
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        </svg>
        <span style={{ fontFamily: 'var(--font-sans, inherit)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>
          Atlas concierge
        </span>
        {intent && (
          <span style={{ fontFamily: 'var(--font-sans, inherit)', fontSize: 11, fontWeight: 600, color: 'var(--text-2, #8a7d6b)', background: 'var(--bg, #fff)', border: '1px solid var(--border, #e3ddd1)', borderRadius: 999, padding: '2px 10px', textTransform: 'lowercase' }}>
            {intent}
          </span>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontWeight: 400, fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', lineHeight: 1.5, color: 'var(--text, #2a2218)', margin: '10px 0 0' }}>
        {loading && !answer
          ? 'Reading your request and choosing places…'
          : answer}
      </p>
      {onExact && !loading && (
        <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-sans, inherit)', fontSize: 12, color: 'var(--text-2, #8a7d6b)' }}>
          Answering in plain English.{' '}
          <button
            type="button"
            onClick={onExact}
            style={{ color: accent, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, fontFamily: 'inherit', fontSize: 12 }}
          >
            Search names &amp; categories instead
          </button>
        </p>
      )}
    </div>
  )
}
