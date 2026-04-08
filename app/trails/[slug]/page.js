import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import TrailMap from './TrailMap'
import TypographicCard from '@/components/TypographicCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const supabase = await createServerSupabase()
  const { data: trail } = await supabase.from('trails').select('name, description').eq('slug', params.slug).eq('published', true).single()
  if (!trail) return {}
  return {
    title: `${trail.name} | Craft Atlas`,
    description: trail.description || `A curated Australian maker trail — ${trail.name}.`,
  }
}

export default async function TrailPage({ params }) {
  const supabase = await createServerSupabase()
  const { data: trail } = await supabase.from('trails').select('*').eq('slug', params.slug).eq('published', true).single()
  if (!trail) notFound()

  const { data: stops } = await supabase
    .from('trail_venues')
    .select('id,position,stop_note,venues(id,name,slug,address,type,latitude,longitude,hero_image_url,description)')
    .eq('trail_id', trail.id)
    .order('position', { ascending: true })

  const validStops = (stops || []).map(s => ({
    ...s,
    venues: Array.isArray(s.venues) ? s.venues[0] : s.venues
  })).filter(s => s.venues?.latitude && s.venues?.longitude)

  const coordinates = validStops.map(s => [parseFloat(s.venues.longitude), parseFloat(s.venues.latitude)])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* HERO */}
      <section style={{ background: '#1c1a17', padding: '72px 24px 56px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
          <TypographicCard name={trail.name} vertical="craft" category={trail.region} aspectRatio="" imageUrl={trail.hero_image_url} />
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 14, fontFamily: 'var(--font-sans)' }}>
            {trail.region ? `${trail.region} · ` : ''}Maker Trail
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, marginBottom: 16 }}>{trail.name}</h1>
          {trail.description && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 620, fontFamily: 'var(--font-sans)', marginBottom: 20 }}>{trail.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)' }}>
            <span>{validStops.length} stops</span>
            {trail.duration_hours && <><span>·</span><span>{trail.duration_hours}</span></>}
            {trail.curator_name && <><span>·</span><span>Curated by {trail.curator_name}</span></>}
          </div>
        </div>
      </section>

      {/* BODY */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 48, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {trail.curator_note && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: 3, padding: '20px 24px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>Curator's note</div>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: 'var(--font-sans)' }}>{trail.curator_note}</p>
              </div>
            )}
            {validStops.map((stop, index) => (
              <StopCard key={stop.id} stop={stop} index={index} isLast={index === validStops.length - 1} />
            ))}
          </div>
          <div style={{ position: 'sticky', top: 24 }}>
            <TrailMap coordinates={coordinates} stops={validStops} />
          </div>
        </div>
      </div>

      {/* PLAN YOUR VISIT */}
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
              { label: 'Duration', value: trail.duration_hours || 'Full day', sub: 'Allow time between stops' },
              { label: 'Best visited', value: trail.best_season || 'Year round', sub: 'Check venue hours before going' },
              { label: 'Getting there', value: trail.region || 'Regional Victoria', sub: 'A car is recommended' },
              { label: 'Stops', value: `${validStops.length} venues`, sub: 'All independently operated' },
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
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>More trails coming</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                We're building trails across Australia's great Australian maker regions.<br />
                New routes added regularly.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/trails" style={{ display: 'inline-block', padding: '11px 24px', border: '1px solid var(--border)', color: 'var(--text-2)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
                All Trails
              </Link>
              <Link href="/map" style={{ display: 'inline-block', padding: '11px 24px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
                Explore the Map →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

function StopCard({ stop, index, isLast }) {
  const venue = stop.venues
  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      {!isLast && <div style={{ position: 'absolute', left: 19, top: 48, width: 1, height: 'calc(100% + 8px)', background: 'var(--border)' }} />}
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, zIndex: 1, marginTop: 4, fontFamily: 'var(--font-sans)' }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <TypographicCard name={venue.name} vertical="craft" region={venue.address} aspectRatio="16/7" imageUrl={venue.hero_image_url} />
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <a href={`/venue/${venue.slug}`} style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, color: 'var(--text)', textDecoration: 'none' }}>{venue.name}</a>
            {venue.type && <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', marginTop: 4 }}>{venue.type}</span>}
          </div>
          {stop.stop_note && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, fontFamily: 'var(--font-sans)', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 10 }}>{stop.stop_note}</p>}
          <a href={`/venue/${venue.slug}`} style={{ display: 'inline-block', marginTop: 12, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>View listing →</a>
        </div>
      </div>
    </div>
  )
}
