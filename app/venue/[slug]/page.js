import { getDefaultImage } from '@/lib/defaultImages'
import { createServerSupabase } from '@/lib/supabase'
import { venueJsonLd } from '@/lib/jsonLd'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'
import VenueMap from '@/components/VenueMap'
import FavouriteButton from '@/components/FavouriteButton'
import CrossVerticalNearby from '@/components/CrossVerticalNearby'
import RegionalBacklink from '@/components/RegionalBacklink'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600  // 1 hour — events are time-sensitive

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function cleanWebsite(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createServerSupabase()
  const { data: venue } = await supabase.from('venues').select('id, name, category, subcategories, suburb, state, description, hero_image_url, slug').eq('slug', slug).eq('published', true).single()
  if (!venue) return { title: 'Venue not found' }
  const label = venue.subcategories || TYPE_LABELS[venue.category] || venue.category
  return {
    title: `${venue.name} — ${label} in ${venue.suburb || venue.state}`,
    description: venue.description || `Visit ${venue.name}, a ${label} in ${venue.suburb || venue.state}, Australia.`,
    openGraph: { images: venue.hero_image_url ? [venue.hero_image_url] : [] },
  }
}

export default async function VenuePage({ params }) {
  const { slug } = await params
  const supabase = await createServerSupabase()

  const { data: venue, error } = await supabase.from('venues').select('*').eq('slug', slug).eq('published', true).single()
  if (error || !venue) notFound()

  // Check if venue is already claimed
  const { data: claimProfile } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('status', 'approved')
    .single()
  const isClaimed = !!claimProfile

  // Nearby venues
  const { data: nearbyRaw } = await supabase.from('venues')
    .select('name, slug, category, suburb, state, latitude, longitude, address')
    .eq('published', true).neq('address', '').not('address', 'is', null).eq('state', venue.state).neq('slug', slug).limit(100)

  const nearby = (nearbyRaw || [])
    .map(v => ({ ...v, distance: haversineKm(venue.latitude, venue.longitude, v.latitude, v.longitude) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6)

  // Upcoming events — future only, ordered by date
  const now = new Date().toISOString()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venue.id)
    .gte('event_date', now)
    .order('event_date', { ascending: true })
    .limit(6)

  const color = TYPE_COLORS[venue.category] || '#5F8A7E'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(venue)) }} />
      <style>{`
        .venue-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; max-width: 900px; margin: 0 auto; padding: 0 24px 48px; }
        .venue-map-container { height: 360px; }
        .venue-nearby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
        .venue-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 40; }
        @media (max-width: 720px) {
          .venue-grid { grid-template-columns: 1fr !important; padding: 0 16px 32px; gap: 24px; }
          .venue-map-container { height: 240px !important; }
          .venue-nearby-grid { grid-template-columns: 1fr !important; }
          .venue-actions { flex-direction: column; }
          .venue-actions a { text-align: center; }
        }
      `}</style>

      {/* HERO IMAGE — full width above header */}
      {(venue.hero_image_url || getDefaultImage(venue.category, venue.id)) && (
        <div style={{ width: '100%', maxHeight: 480, overflow: 'hidden', marginBottom: 0, position: 'relative' }}>
          <Image
            src={venue.hero_image_url || getDefaultImage(venue.category, venue.id)}
            alt={venue.name}
            width={1200}
            height={480}
            priority
            style={{ width: '100%', height: 480, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* BREADCRUMB */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', flexWrap: 'wrap' }}>
          <Link href="/map" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Map</Link>
          <span>›</span>
          {venue.state && <Link href={`/map?state=${venue.state}`} style={{ color: 'var(--text-3)', textDecoration: 'none' }}>{venue.state}</Link>}
          {venue.suburb && <><span>›</span><span>{venue.suburb}</span></>}
        </div>
      </div>

      {/* HEADER */}
      <header style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{
          display: 'inline-block', padding: '4px 12px', background: `${color}18`, border: `1px solid ${color}33`,
          borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
          color: color, marginBottom: 16, fontFamily: 'var(--font-sans)',
        }}>
          {TYPE_LABELS[venue.category] || venue.category}
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 8 }}>
          {venue.name}
        </h1>

        {venue.suburb && (
          <div style={{ fontSize: 16, color: 'var(--text-2)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginBottom: 16 }}>
            {venue.suburb}, {venue.state}
          </div>
        )}

        {isClaimed && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
            padding: '4px 10px', borderRadius: 2,
            background: 'rgba(193,96,58,0.08)', border: '1px solid rgba(193,96,58,0.25)' }}>
            <span style={{ color: '#5F8A7E', fontSize: 12 }}>✓</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#5F8A7E', fontFamily: 'var(--font-sans)' }}>Verified Listing</span>
          </div>
        )}


        {venue.description && (
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 640, fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
            {venue.description}
          </p>
        )}

        <div className="venue-actions" style={{ marginBottom: 40 }}>
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: color, color: '#fff',
              padding: '12px 24px', borderRadius: 2, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
            }}>Visit Website</a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text-2)',
            border: '1px solid var(--border-2)', padding: '12px 24px', borderRadius: 2, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
          }}>Get Directions</a>
          {venue.phone && (
            <a href={`tel:${venue.phone}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text-2)',
              border: '1px solid var(--border-2)', padding: '12px 24px', borderRadius: 2, fontSize: 12, fontWeight: 600,
              textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
            }}>Call</a>
          )}
          <FavouriteButton venueId={venue.id} venueName={venue.name} />
        </div>

        {!isClaimed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Own this studio?</span>
            <Link href={`/claim/${venue.slug}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
              Claim this listing →
            </Link>
          </div>
        )}
      </header>

      {/* Custom Tags */}
      {venue.custom_tags && venue.custom_tags.length > 0 && (
        <div style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 24px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>Features</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {venue.custom_tags.map(tag => (
              <span key={tag} style={{ display: 'inline-block', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', backgroundColor: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: '999px', fontFamily: 'var(--font-sans)' }}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {venue.social_links && Object.values(venue.social_links).some(v => v) && (
        <div style={{ maxWidth: 900, margin: '0 auto 1.5rem', padding: '0 24px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>Follow</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {venue.social_links.instagram && <a href={venue.social_links.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Instagram ↗</a>}
            {venue.social_links.facebook && <a href={venue.social_links.facebook} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Facebook ↗</a>}
            {venue.social_links.tiktok && <a href={venue.social_links.tiktok} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>TikTok ↗</a>}
          </div>
        </div>
      )}

      {/* TWO COLUMN: MAP + DETAILS */}
      <div className="venue-grid">
        <div>
          <div className="venue-map-container" style={{ marginBottom: 32 }}>
            <VenueMap venue={venue} nearby={nearby} />
          </div>

          {venue.materials && venue.materials.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                Materials
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {venue.materials.map(s => (
                  <span key={s} style={{ background: `${color}12`, border: `1px solid ${color}30`, padding: '6px 14px', borderRadius: 2, fontSize: 13, color: color, fontFamily: 'var(--font-sans)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {venue.practice_description && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                Practice Description
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: 'var(--font-sans)' }}>
                {venue.practice_description}
              </p>
            </div>
          )}

        </div>

        {/* DETAILS SIDEBAR */}
        <div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>Details</div>

            {venue.address && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>Address</div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{venue.address}</div>
              </div>
            )}

            {venue.phone && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>Phone</div>
                <a href={`tel:${venue.phone}`} style={{ fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>{venue.phone}</a>
              </div>
            )}

            {venue.website && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>Website</div>
                <a href={venue.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                  {cleanWebsite(venue.website)}
                </a>
              </div>
            )}

            {venue.opening_hours && typeof venue.opening_hours === 'object' && ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].some(d => venue.opening_hours[d] && venue.opening_hours[d] !== '') && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Opening Hours</div>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                    const hours = venue.opening_hours[day]
                    const hasHours = hours && hours !== ''
                    const isClosed = hours === 'Closed' || hours === 'closed'
                    return (
                      <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-2)' }}>{day}</span>
                        <span style={{ color: hasHours && !isClosed ? 'var(--text-2)' : 'var(--text-3)', opacity: !hasHours ? 0.5 : 1 }}>
                          {isClosed ? 'Closed' : (hasHours ? hours : '—')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {venue.google_maps_url && (
              <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
                View on Google Maps →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* GALLERY */}
      {venue.gallery_images && venue.gallery_images.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto 40px', padding: '0 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>Gallery</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {venue.gallery_images.map((url, i) => (
              <Image key={i} src={url} alt={`${venue.name} ${i + 1}`}
                width={400} height={400}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, display: 'block' }} />
            ))}
          </div>
        </div>
      )}

      {/* EVENTS */}
      {events && events.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto 56px', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>Upcoming Workshops & Events</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                {events.length} event{events.length !== 1 ? 's' : ''} coming up
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((event, idx) => {
              const date = new Date(event.event_date)
              const endDate = event.end_date ? new Date(event.end_date) : null
              const now2 = new Date()
              const isToday = now2.toDateString() === date.toDateString()
              const isTomorrow = new Date(now2.getTime() + 86400000).toDateString() === date.toDateString()
              const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-AU', { weekday: 'short' })
              const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              const timeStr = date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
              const typeLabels = { release: 'Release', workshop: 'Workshop', tour: 'Tour', open_day: 'Open Day', collaboration: 'Collab', exhibition: 'Exhibition', other: 'Event' }
              const typeLabel = typeLabels[event.event_type] || 'Event'
              const isFirst = idx === 0
              const isLast = idx === events.length - 1

              const gcalStart = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
              const gcalEnd = endDate
                ? endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
                : new Date(date.getTime() + 2 * 3600 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
              const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(venue.address || venue.name)}`

              return (
                <div key={event.id} style={{
                  display: 'flex', gap: 0, overflow: 'hidden',
                  background: isFirst ? `${color}06` : 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderTop: idx > 0 ? 'none' : '1px solid var(--border)',
                  borderRadius: isFirst && isLast ? 4 : isFirst ? '4px 4px 0 0' : isLast ? '0 0 4px 4px' : 0,
                }}>
                  <div style={{
                    width: 76, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 0', borderRight: '1px solid var(--border)',
                    background: isFirst ? `${color}10` : 'transparent',
                  }}>
                    <div style={{
                      fontSize: 30, fontWeight: 400, lineHeight: 1,
                      color: isFirst ? color : 'var(--text)',
                      fontFamily: 'var(--font-serif)',
                    }}>
                      {date.getDate()}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: isFirst ? color : 'var(--text-3)',
                      fontFamily: 'var(--font-sans)', marginTop: 3,
                    }}>
                      {date.toLocaleDateString('en-AU', { month: 'short' })}
                    </div>
                    {(isToday || isTomorrow) && (
                      <div style={{
                        marginTop: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                        color: isToday ? '#c04b4b' : color,
                        background: isToday ? 'rgba(192,75,75,0.1)' : `${color}15`,
                        padding: '2px 6px', borderRadius: 2,
                      }}>
                        {dayLabel}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)', lineHeight: 1.2 }}>
                        {event.title}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 2,
                        background: `${color}15`, color: color, border: `1px solid ${color}30`, flexShrink: 0,
                      }}>
                        {typeLabel}
                      </span>
                      {event.is_free && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 2,
                          background: 'rgba(74,124,89,0.08)', color: '#4a7c59', border: '1px solid rgba(74,124,89,0.2)', flexShrink: 0,
                        }}>
                          Free
                        </span>
                      )}
                    </div>

                    <div style={{
                      fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)',
                      marginBottom: event.description ? 8 : 10,
                      display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                    }}>
                      <span>{isToday || isTomorrow ? dayLabel : `${dayLabel},`} {dateStr}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span>{timeStr}</span>
                      {endDate && (
                        <>
                          <span style={{ opacity: 0.35 }}>–</span>
                          <span>{endDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        </>
                      )}
                    </div>

                    {event.description && (
                      <div style={{
                        fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)',
                        lineHeight: 1.6, marginBottom: 12,
                      }}>
                        {event.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      {event.ticket_url && (
                        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: '#fff', background: color, padding: '7px 14px', borderRadius: 2,
                          textDecoration: 'none', fontFamily: 'var(--font-sans)',
                        }}>
                          Book / RSVP →
                        </a>
                      )}
                      <a href={gcalUrl} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, color: 'var(--text-3)', textDecoration: 'none',
                        fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        + Add to calendar
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CROSS-VERTICAL NEARBY */}
      <CrossVerticalNearby
        lat={venue.latitude}
        lng={venue.longitude}
        currentVertical="craft"
        listingName={venue.name}
      />

      {/* REGIONAL BACKLINK */}
      <RegionalBacklink
        regionName={venue.suburb}
        regionSlug={venue.suburb ? venue.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null}
        regionDescription={null}
        venueName={venue.name}
      />
    </div>
  )
}
