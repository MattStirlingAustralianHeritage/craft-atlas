// OperatorTrailSection — renders an operator's published "suggested trail" on
// their detail page, read live off the canonical portal record
// (getPortalListingTrail in lib/portal-data). Stops link to the canonical
// aggregator place page (s.place_href) so they resolve from this vertical.
// Styled in the vertical's dark register (matches the events / picks blocks).
// Renders nothing without a trail of two or more stops.

const VERTICAL_LABELS = {
  fine_grounds: 'Coffee', sba: 'Small Batch', table: 'Table', rest: 'Rest',
  craft: 'Craft', collection: 'Culture', corner: 'Corner', found: 'Found',
  field: 'Field', way: 'Way',
}

export default function OperatorTrailSection({ trail, operatorName, color = 'var(--amber)' }) {
  if (!trail || !Array.isArray(trail.stops) || trail.stops.length < 2) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto 48px', padding: '0 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: color, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
        {trail.region ? `A day out · ${trail.region}` : 'A day out'}
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--text)', lineHeight: 1.2, marginBottom: trail.intro ? 8 : 14 }}>
        {trail.title}
      </div>

      {trail.intro ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 6px', maxWidth: '46rem' }}>
          {trail.intro}
        </p>
      ) : null}

      <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 18 }}>
        Suggested by {operatorName}
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {trail.stops.map((s, i) => {
          const last = i === trail.stops.length - 1
          const label = VERTICAL_LABELS[s.vertical] || s.vertical
          return (
            <li key={`${s.listing_id}-${i}`} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: color, color: '#1a1a1a',
                  fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</span>
                {!last && <span style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 4, minHeight: 16 }} />}
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
                <a href={s.place_href} style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', textDecoration: 'none', display: 'inline-block' }}>
                  {s.venue_name}
                </a>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                  {label}{s.sub_type ? ` · ${s.sub_type}` : ''}
                </div>
                {s.editorial_copy ? (
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: '6px 0 0', maxWidth: '42rem' }}>
                    {s.editorial_copy}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
