import Link from 'next/link'
import { getPortalVerticalEvents } from '@/lib/portal-data'
import { isApprovedImageSource } from '@/lib/image-utils'

// Events are managed centrally on the Australian Atlas portal. This page reads
// the live vertical feed (every approved + published event tagged `craft`) so an
// event published on the portal appears here automatically.
export const revalidate = 300

const PORTAL_BASE = 'https://www.australianatlas.com.au'
const ACCENT = 'var(--primary)'

export const metadata = {
  title: "What's On — Maker Markets, Open Studios & Craft Events",
  description:
    'Markets, open studios, workshops and exhibitions from independent makers, artists and studios across the Craft Atlas network.',
  alternates: { canonical: '/events' },
}

function eventDateLabel(ev) {
  const start = new Date(ev.start_date + 'T00:00:00')
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  if (!ev.end_date) return start.toLocaleDateString('en-AU', opts)
  const end = new Date(ev.end_date + 'T00:00:00')
  return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-AU', opts)}`
}

function placeLabel(ev) {
  return [ev.location_name, ev.suburb, ev.state].filter(Boolean).join(' · ')
}

export default async function EventsPage() {
  const events = await getPortalVerticalEvents(48)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px 96px' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, marginBottom: 14, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
          What&apos;s On
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 16 }}>
          Markets, open studios <span style={{ fontStyle: 'italic', color: ACCENT }}>&</span> maker events
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', maxWidth: 540, margin: '0 auto' }}>
          Upcoming markets, open studios, workshops and exhibitions from independent makers and studios across the network.
        </p>
      </div>

      {/* EVENTS LIST */}
      {events.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map(ev => (
            <a
              key={ev.id}
              href={ev.ticket_url || `${PORTAL_BASE}/events/${ev.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', overflow: 'hidden', textDecoration: 'none',
                background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6,
              }}
            >
              {ev.image_url && isApprovedImageSource(ev.image_url) && (
                <div style={{ width: 150, flexShrink: 0, position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.image_url} alt={ev.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', marginBottom: 6 }}>
                  {eventDateLabel(ev)}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21, color: 'var(--text)', lineHeight: 1.2, marginBottom: 8 }}>
                  {ev.title}
                </div>
                {placeLabel(ev) && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                    {placeLabel(ev)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 999, background: 'rgba(193,96,58,0.12)', color: ACCENT, border: '1px solid rgba(193,96,58,0.25)', fontFamily: 'var(--font-sans)' }}>
                    {ev.category_label}
                  </span>
                  {ev.is_free && (
                    <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 999, background: 'rgba(74,124,89,0.1)', color: '#4a7c59', fontFamily: 'var(--font-sans)' }}>
                      Free
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: '10px 0 0' }}>
                    {ev.description.length > 220 ? ev.description.slice(0, 217).trimEnd() + '…' : ev.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg-2)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
            No events on the calendar just yet.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Hosting a market, open studio or workshop? List it and it&apos;ll appear here.
          </p>
        </div>
      )}

      {/* SUBMIT CTA */}
      <div style={{ textAlign: 'center', marginTop: 44, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 14 }}>
          Running a maker market or open studio?
        </p>
        <a
          href={`${PORTAL_BASE}/events/submit?vertical=craft`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--font-sans)',
            padding: '12px 24px', border: '1px solid var(--border)', borderRadius: 3,
          }}
        >
          Submit an event →
        </a>
        <div style={{ marginTop: 18 }}>
          <Link href="/map" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
            or explore the map →
          </Link>
        </div>
      </div>
    </div>
  )
}
