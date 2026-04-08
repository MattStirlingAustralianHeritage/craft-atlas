import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import TrailMap from '../../trails/[slug]/TrailMap'
import TypographicCard from '@/components/TypographicCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const supabase = await createServerSupabase()
  const { data: trail } = await supabase.from('user_trails').select('name, description').eq('short_code', params.shortcode).single()
  if (!trail) return {}
  return {
    title: `${trail.name} | Craft Atlas`,
    description: trail.description || `A user-curated maker trail on Craft Atlas.`,
  }
}

export default async function SharedTrailPage({ params }) {
  const supabase = await createServerSupabase()

  const { data: trail } = await supabase
    .from('user_trails')
    .select('*')
    .eq('short_code', params.shortcode)
    .in('visibility', ['public', 'link', 'private'])
    .single()

  if (!trail) notFound()

  const { data: stops } = await supabase
    .from('user_trail_venues')
    .select('id, position, note, venues(id, name, slug, type, address, latitude, longitude, hero_image_url, description)')
    .eq('trail_id', trail.id)
    .order('position', { ascending: true })

  const validStops = (stops || []).map(s => ({
    ...s,
    venues: Array.isArray(s.venues) ? s.venues[0] : s.venues
  })).filter(s => s.venues?.latitude && s.venues?.longitude)

  const coordinates = validStops.map(s => [parseFloat(s.venues.longitude), parseFloat(s.venues.latitude)])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ background: '#1c1a17', padding: '64px 24px 48px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Community trail
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, marginBottom: 16 }}>
            {trail.name}
          </h1>
          {trail.description && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontFamily: 'var(--font-sans)', marginBottom: 20, maxWidth: 560 }}>
              {trail.description}
            </p>
          )}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>
            {validStops.length} stops
          </div>
        </div>
      </section>

      {/* Body — two column like curated trails */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 48, alignItems: 'start' }}>

          {/* Stops */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {validStops.map((stop, i) => {
              const venue = stop.venues
              return (
                <div key={stop.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  {i < validStops.length - 1 && (
                    <div style={{ position: 'absolute', left: 17, top: 40, width: 1, height: 'calc(100% + 8px)', background: 'var(--border)' }} />
                  )}
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginTop: 2, fontFamily: 'var(--font-sans)', zIndex: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <TypographicCard name={venue.name} vertical="craft" aspectRatio="16/6" imageUrl={venue.hero_image_url} />
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <a href={`/venue/${venue.slug}`} style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', textDecoration: 'none' }}>{venue.name}</a>
                        {venue.type && <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', marginTop: 4 }}>{venue.type}</span>}
                      </div>
                      {stop.note && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, fontFamily: 'var(--font-sans)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>{stop.note}</p>}
                      <a href={`/venue/${venue.slug}`} style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>View listing →</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Map — sticky */}
          <div style={{ position: 'sticky', top: 24 }}>
            <TrailMap coordinates={coordinates} stops={validStops} />
          </div>
        </div>
      </div>

      {/* What to know before you go */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Plan your visit
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 400, color: 'var(--text)', marginBottom: 36, lineHeight: 1.2 }}>
            What to know before you go
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 48 }}>
            {[
              { label: 'Stops', value: `${validStops.length} venues`, sub: 'All independently operated' },
              { label: 'Duration', value: 'Allow a full day', sub: 'Adjust pace between stops' },
              { label: 'Getting there', value: 'Car recommended', sub: 'Check venue hours before going' },
              { label: 'Best visited', value: 'Year round', sub: 'Weather varies by region' },
            ].map(item => (
              <div key={item.label} style={{ padding: '20px 24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, padding: '32px 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>Build your own trail</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                Plan a custom route across Australia's craft makers.<br />
                Save and share with anyone.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/trails" style={{ display: 'inline-block', padding: '11px 24px', border: '1px solid var(--border)', color: 'var(--text-2)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
                All Trails
              </Link>
              <Link href="/trails/builder" style={{ display: 'inline-block', padding: '11px 24px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
                Build a trail →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
