import { createServerSupabase } from '@/lib/supabase'
import { venueListJsonLd } from '@/lib/jsonLd'
import { TYPE_COLORS, TYPE_LABELS, REGION_INFO } from '@/lib/constants'
import RegionMap from '@/components/RegionMap'
import RegionFilters from '@/components/RegionFilters'
import Link from 'next/link'

export const revalidate = 86400

// Region centers for geographic matching
const REGION_GEO = {
  'blue-mountains': { lat: -33.72, lng: 150.31, radius: 35 },
  'byron-bay-hinterland': { lat: -28.64, lng: 153.44, radius: 35 },
  'byron-hinterland': { lat: -28.64, lng: 153.44, radius: 35 },
  'yarra-valley': { lat: -37.75, lng: 145.50, radius: 30 },
  'central-victoria': { lat: -37.05, lng: 144.28, radius: 40 },
  'daylesford': { lat: -37.34, lng: 144.15, radius: 25 },
  'tamar-valley': { lat: -41.20, lng: 146.95, radius: 30 },
  'adelaide-hills': { lat: -35.02, lng: 138.72, radius: 30 },
  'huon-valley': { lat: -43.10, lng: 147.05, radius: 30 },
  'mornington-peninsula': { lat: -38.35, lng: 145.05, radius: 25 },
  'margaret-river': { lat: -33.95, lng: 115.07, radius: 30 },
  'sunshine-coast-hinterland': { lat: -26.70, lng: 152.90, radius: 30 },
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const region = REGION_INFO[slug]
  const regionName = region ? region.name : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return {
    title: `${regionName} — Makers & Studios`,
    description: region ? region.description : `Explore makers and studios in ${regionName}, Australia.`,
  }
}

export default async function RegionPage({ params }) {
  const { slug } = await params
  const region = REGION_INFO[slug]
  const regionName = region ? region.name : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const supabase = await createServerSupabase()
  const geo = REGION_GEO[slug]

  let venues = []
  if (geo) {
    // Fetch all published venues with addresses, then filter by distance
    const { data: allVenues } = await supabase.from('venues').select('*').eq('published', true).neq('address', '').not('address', 'is', null)
    venues = (allVenues || []).filter(v =>
      v.latitude && v.longitude && distKm(v.latitude, v.longitude, geo.lat, geo.lng) <= geo.radius
    )
  } else {
    // Fallback: try matching by suburb or address text
    const { data } = await supabase.from('venues').select('*').eq('published', true).neq('address', '').not('address', 'is', null).ilike('address', `%${regionName}%`)
    venues = data || []
  }
  const typeCounts = {}
  ;(venues || []).forEach(v => { typeCounts[v.category] = (typeCounts[v.category] || 0) + 1 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(venueListJsonLd(venues || [], {
        name: `${regionName} — Australian Makers Venues`,
        description: `${(venues || []).length} makers and studios in ${regionName}`,
        path: `/region/${slug}`,
      })) }} />
      <style>{`
        .region-map-container { height: 340px; }
        .region-stats { display: flex; gap: 24px; flex-wrap: wrap; }
        @media (max-width: 640px) { .region-map-container { height: 220px !important; } }
      `}</style>

      <header style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 20, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/explore" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Explore</Link>
          <span>›</span>
          <span>{regionName}</span>
        </div>
        <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(139,117,87,0.08)', border: '1px solid rgba(139,117,87,0.15)', borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
          {region ? region.state : ''} · {(venues || []).length} venues
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 20 }}>{regionName}</h1>
        {region && region.description && (
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 700, fontFamily: 'var(--font-sans)', marginBottom: 32 }}>{region.description}</p>
        )}
        <div className="region-stats" style={{ marginBottom: 32 }}>
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-serif)', color: TYPE_COLORS[type] || 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{TYPE_LABELS[type] || type}</div>
            </div>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
        <div className="region-map-container"><RegionMap venues={venues || []} /></div>
      </div>

      <RegionFilters venues={venues || []} regionName={regionName} />

      <section style={{ borderTop: '1px solid var(--border)', padding: '48px 24px', background: 'var(--bg-2)', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', marginBottom: 12 }}>Explore {regionName} on the map</div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', marginBottom: 24 }}>See all {(venues || []).length} venues plotted on an interactive map.</p>
          <Link href={`/map?region=${encodeURIComponent(regionName)}`} style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--primary)', color: 'var(--bg)', borderRadius: 2, fontSize: 12, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Open in Map View</Link>
        </div>
      </section>
    </div>
  )
}
