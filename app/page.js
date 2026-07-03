import Link from 'next/link'
export const revalidate = 60
import { getSupabase } from '@/lib/supabase'
import { listPortalListings, listPortalFeatured, getPortalVerticalEvents, listPortalRecent } from '@/lib/portal-data'
import RegionCarousel from '@/components/RegionCarousel'
import { HeroMap, NewsletterForm, NewsletterToast } from '@/components/HomeClient'
import SemanticSearchBar from '@/components/SemanticSearchBar'
import TrailPromptSection from '@/components/TrailPromptSection'
import { TYPE_COLORS, TYPE_LABELS_PLURAL } from '@/lib/constants'
import TypographicCard from '@/components/TypographicCard'

const HERO_SEARCHES = ['ceramic studio in the Blue Mountains', 'woodworker near Byron Bay', 'jeweller in Hobart', 'textile studio in Melbourne']

// Region definitions with center coordinates and radius (km) for geo-matching
const REGION_DEFS = [
  { name: 'Blue Mountains', slug: 'blue-mountains', state: 'NSW', lat: -33.72, lng: 150.31, radius: 35 },
  { name: 'Byron Hinterland', slug: 'byron-hinterland', state: 'NSW', lat: -28.64, lng: 153.44, radius: 35 },
  { name: 'Yarra Valley', slug: 'yarra-valley', state: 'VIC', lat: -37.75, lng: 145.50, radius: 30 },
  { name: 'Central Victoria', slug: 'central-victoria', state: 'VIC', lat: -37.05, lng: 144.28, radius: 40 },
  { name: 'Tamar Valley', slug: 'tamar-valley', state: 'TAS', lat: -41.20, lng: 146.95, radius: 30 },
  { name: 'Adelaide Hills', slug: 'adelaide-hills', state: 'SA', lat: -35.02, lng: 138.72, radius: 30 },
  { name: 'Mornington Peninsula', slug: 'mornington-peninsula', state: 'VIC', lat: -38.35, lng: 145.05, radius: 25 },
  { name: 'Sunshine Coast Hinterland', slug: 'sunshine-coast-hinterland', state: 'QLD', lat: -26.70, lng: 152.90, radius: 30 },
]

// Grounded one-line descriptors for the "Browse by craft" decoder grid. Each
// line is derived from the real SUBCATEGORIES in lib/constants.js — definitional,
// not invented (no venue claims). Mirrors the portal's dual-label comprehension fix.
const TYPE_DESCRIPTORS = {
  ceramics_clay: 'Potters and clay artists — functional ware, porcelain, and sculpture.',
  visual_art: 'Painters, sculptors, and mixed-media artists working from the studio.',
  jewellery_metalwork: 'Fine jewellers, silversmiths, and blacksmiths working in metal.',
  textile_fibre: 'Weavers, dyers, and fibre artists — tapestry, basketry, and embroidery.',
  wood_furniture: 'Furniture makers, woodturners, and carvers working in timber.',
  glass: 'Glassblowers and cast, kiln-formed, and stained-glass artists.',
  printmaking: 'Printmakers — relief, screen print, etching, and lithography.',
  leathermaker: 'Leatherworkers and makers — bags, belts, saddlery, and hand-stitched goods.',
  shoemaker: 'Shoemakers and cobblers — bespoke footwear and boots, made and repaired by hand.',
}

const REGION_DESCRIPTORS = {
  'blue-mountains': { badge: 'Craft Region', desc: 'Mountain studios, open-air galleries, and a deep tradition of making.' },
  'byron-hinterland': { badge: 'Craft Region', desc: 'A creative heartland of ceramics, textiles and handmade design.' },
  'yarra-valley': { badge: 'Craft Region', desc: 'Studios, workshops and galleries scattered through green rolling hills.' },
  'central-victoria': { badge: 'Craft Region', desc: 'Goldfields towns with thriving maker communities and heritage studios.' },
  'tamar-valley': { badge: 'Craft Region', desc: 'Tasmanian artisans working in glass, wood, and fine metals.' },
  'adelaide-hills': { badge: 'Craft Region', desc: 'A creative corridor of studios and workshops in the hills above Adelaide.' },
  'mornington-peninsula': { badge: 'Craft Region', desc: 'Coastal makers and galleries on a stunning peninsula south of Melbourne.' },
  'sunshine-coast-hinterland': { badge: 'Craft Region', desc: 'Subtropical studios, ceramicists, and furniture makers in the hinterland.' },
}

// Haversine distance in km
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default async function HomePage() {
  const supabase = getSupabase()
  // Venues, map stats and featured makers now come LIVE from the Australian
  // Atlas master portal (single source of truth) — matching the detail pages,
  // search, explore and map. Articles (the Journal) stay on local Supabase.
  const [venues, { data: latestArticles }, featuredVenues, upcomingEvents, recentListings] = await Promise.all([
    listPortalListings(),
    supabase.from('articles').select('id, title, slug, deck, hero_image_url, category, reading_time').eq('status', 'published').order('published_at', { ascending: false }).limit(6),
    listPortalFeatured(8),
    getPortalVerticalEvents(4),
    listPortalRecent(20),
  ])
  const venueCount = (venues || []).length

  // Count venues per region using geographic proximity
  const regionCounts = {}
  REGION_DEFS.forEach(r => { regionCounts[r.slug] = 0 })
  ;(venues || []).forEach(v => {
    if (!v.latitude || !v.longitude) return
    for (const r of REGION_DEFS) {
      if (distKm(v.latitude, v.longitude, r.lat, r.lng) <= r.radius) {
        regionCounts[r.slug]++
        break
      }
    }
  })
  const regions = REGION_DEFS.map(r => ({ ...r, count: regionCounts[r.slug] || 0 }))

  const tc = (venues||[]).reduce((a,v) => { if(v.category) a[v.category]=(a[v.category]||0)+1; return a }, {})
  const types = Object.entries(tc).filter(([type]) => TYPE_LABELS_PLURAL[type]).sort(([,a],[,b]) => b-a).slice(0,7)
  const total = (venues||[]).length
  return (

    <div>
      {/* HERO */}
      <section style={{ position: 'relative', height: 520 }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <HeroMap venues={venues || []} />
        </div>
        <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, width: '100%', maxWidth: 640, padding: '0 48px', textAlign: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)" aria-hidden="true" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.92 }}>
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6L12 0z" />
          </svg>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Australian Makers &amp; Studios
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 6.4vw, 68px)', fontWeight: 380, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.06, marginBottom: 20, textWrap: 'balance' }}>
            Discover {(venueCount || (venues || []).length).toLocaleString()} makers,<br />
            artists <span className="hero-em">&amp; studios</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 32, fontFamily: 'var(--font-sans)' }}>
            From the Blue Mountains to the Tamar — every studio, workshop and gallery on one beautiful map.
          </p>
          <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
            <SemanticSearchBar accent="var(--primary)" examples={HERO_SEARCHES} searchPath="/search" />
            <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, margin: '14px auto 0', maxWidth: 460 }}>Ask in plain English — name a craft, a maker, or a place, and we&apos;ll search every studio and gallery.</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/map" style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
              or browse the map →
            </Link>
          </div>
        </div>
      </section>

      {/* THE LIVING INDEX TICKER — newest makers drifting past, proof the atlas
          is alive. Real names, newest first; every item links to its listing.
          Star bullet coloured by craft category. Duplicated track = seamless
          loop; the copy row is aria-hidden + untabbable. Pauses on hover;
          reduced-motion collapses to a static scrollable row. */}
      {recentListings.length >= 8 && (
        <section className="atlas-ticker" aria-label="Recently added to Craft Atlas">
          <span className="atlas-ticker-label">Recently added</span>
          <div className="atlas-ticker-viewport">
            <div className="atlas-ticker-track">
              {[0, 1].map(copy => (
                <span key={copy} aria-hidden={copy === 1 ? 'true' : undefined} style={{ display: 'inline-flex' }}>
                  {recentListings.map(l => (
                    <Link
                      key={`${copy}-${l.id}`}
                      href={`/venue/${l.slug}`}
                      className="atlas-ticker-item"
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true" fill={TYPE_COLORS[l.category] || 'var(--primary)'}>
                        <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6L12 0z" />
                      </svg>
                      {l.name}
                      {(l.region || l.state) && (
                        <span className="atlas-ticker-meta">{l.region || l.state}</span>
                      )}
                    </Link>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHAT YOU'LL FIND — browse by craft (dual-label decoder grid) */}
      {types.length > 0 && (
        <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '64px 24px', background: 'var(--bg-2)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>What You&apos;ll Find</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 12 }}>
                Browse by craft
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', maxWidth: 520, margin: '0 auto' }}>
                From the wheel to the forge — find makers by what they make, then plan a visit.
              </p>
            </div>
            <div className="type-grid">
              {types.map(([type, count]) => {
                const color = TYPE_COLORS[type] || 'var(--primary)'
                return (
                  <Link key={type} href={`/map?type=${type}`} className="type-card" style={{ '--tc': color }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color, fontFamily: 'var(--font-sans)' }}>
                          {count} {count === 1 ? 'maker' : 'makers'}
                        </span>
                      </span>
                      <span className="type-card-arrow" aria-hidden="true" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1 }}>&rarr;</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', lineHeight: 1.25, marginBottom: 7 }}>
                      {TYPE_LABELS_PLURAL[type] || type}
                    </h3>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, fontFamily: 'var(--font-sans)', margin: 0 }}>
                      {TYPE_DESCRIPTORS[type] || ''}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <TrailPromptSection />

      {/* FEATURED MAKERS */}
      {featuredVenues && featuredVenues.length >= 3 && (
        <section style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '48px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Featured Makers</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 400, color: 'var(--text)', margin: 0 }}>Worth seeking out</h2>
              </div>
              <Link href="/explore" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>View all →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {featuredVenues.map(venue => {
                const typeColor = TYPE_COLORS[venue.category] || '#6b4f2a'
                const typeLabel = TYPE_LABELS_PLURAL[venue.category] || venue.category
                return (
                  <Link key={venue.id} href={`/venue/${venue.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <TypographicCard name={venue.name} vertical="craft" category={typeLabel} region={venue.sub_region || venue.suburb} state={venue.state} aspectRatio="3/2" imageUrl={venue.hero_image_url} />
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor, marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{typeLabel}</div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{venue.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{[venue.sub_region || venue.suburb, venue.state].filter(Boolean).join(', ')}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)', paddingBottom: 40 }}>
        <div id="regionsTrack" style={{ overflowX: 'auto', scrollbarWidth: 'none', display: 'flex', gap: 16, padding: '32px 60px' }}>
          {regions.map(region => {
            const meta = REGION_DESCRIPTORS[region.slug] || { badge: 'Region', desc: '' }
            return (
              <Link key={region.slug} href={`/explore?region=${region.slug}`}
                className="region-card"
              >
                <div className="region-card-image" style={{ background: '#2a1f14' }} />
                <div className="region-card-overlay" />
                <div className="region-card-badge">{meta.badge}</div>
                <div className="region-card-body">
                  <div className="region-card-state">{region.state}</div>
                  <div className="region-card-name">{region.name}</div>
                  <div className="region-card-desc">{meta.desc}</div>
                  <div className="region-card-footer">
                    <span className="region-card-count"><strong>{region.count}</strong> listings</span>
                    <span className="region-card-arrow">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 6h7M6.5 3l3 3-3 3"/></svg>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <div style={{ padding: '0 60px', maxWidth: 1400, margin: '0 auto' }}>
          <div className="regions-carousel-nav">
            <button className="carousel-btn" id="regionsPrev" aria-label="Previous regions">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2L4 7l5 5"/></svg>
            </button>
            <button className="carousel-btn" id="regionsNext" aria-label="Next regions">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 2l5 5-5 5"/></svg>
            </button>
          </div>
        </div>
        <RegionCarousel />
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Plan Your Visit
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 48 }}>
            Every studio, workshop <span style={{ fontStyle: 'italic', color: 'var(--primary)' }}>&</span> gallery
          </h2>
          <div className="home-steps-grid">
            {[
              { num: '01', title: 'Search & Filter', desc: 'Find makers by craft, state, or region. Search by name or browse the map.' },
              { num: '02', title: 'Discover Details', desc: 'Opening hours, directions, websites, and practice descriptions — everything you need to plan a visit.' },
              { num: '03', title: 'Explore Maker Trails', desc: 'Follow our curated trails through Australia\'s best craft regions.', href: '/trails' },
            ].map(step => (
              <div key={step.num} style={{ padding: '32px 28px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2 }}>
                <div style={{ fontSize: 32, fontFamily: 'var(--font-serif)', color: 'var(--primary)', marginBottom: 12, lineHeight: 1, opacity: 0.7 }}>{step.num}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* WHAT'S ON — live event feed from the portal (vertical-tagged) */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>What&apos;s On</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
                  Markets, open studios <span className="hero-em">&amp; maker events</span>
                </h2>
              </div>
              <Link href="/events" className="link-quiet" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                All events →
              </Link>
            </div>
            {/* With a thin calendar (1–2 events) a multi-col grid strands cards
                on the left; a centred flex row keeps the section composed. */}
            <div
              style={upcomingEvents.length < 3
                ? { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }
                : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}
            >
              {upcomingEvents.map(ev => {
                const start = new Date(ev.start_date + 'T00:00:00')
                const dateLabel = ev.end_date
                  ? `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(ev.end_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                const place = [ev.suburb, ev.state].filter(Boolean).join(', ')
                return (
                  <Link key={ev.id} href="/events" style={{
                    display: 'block', padding: '24px 26px', textDecoration: 'none',
                    background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6,
                    ...(upcomingEvents.length < 3 ? { width: 'min(100%, 340px)' } : {}),
                  }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 10 }}>
                      {dateLabel}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, color: 'var(--text)', lineHeight: 1.25, marginBottom: 8 }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                      {[ev.category_label, place].filter(Boolean).join(' · ')}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* JOURNAL */}
      {latestArticles && latestArticles.length > 0 && <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                From the Journal
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
                Guides, stories <span style={{ fontStyle: 'italic', color: 'var(--primary)' }}>&</span> itineraries
              </h2>
            </div>
            <Link href="/journal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
              All Articles →
            </Link>
          </div>
          <div className="home-journal-carousel">
            {(latestArticles || []).map(article => (
              <Link key={article.id} href={`/journal/${article.slug}`} className="home-journal-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', flexShrink: 0, position: 'relative' }}>
                <TypographicCard name={article.title} vertical="craft" category={article.category} aspectRatio="4/3" imageUrl={article.hero_image_url} />
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* FOR MAKERS CTA */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>For Makers</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16 }}>
            Get your studio on the map
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 36, fontFamily: 'var(--font-sans)' }}>
            Craft Atlas is building Australia&apos;s most comprehensive directory of makers and studios. Claim your free listing or upgrade to a standard profile with photos, featured placement, and direct booking links.
          </p>
          <a href="https://www.australianatlas.com.au/for-venues?vertical=craft" style={{ display: 'inline-block', padding: '14px 36px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
            Claim your listing →
          </a>
        </div>
      </section>

      <NewsletterToast />
      {/* NEWSLETTER */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>Stay Updated</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }}>
            The atlas is always growing
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
            New makers added weekly, region guides, and maker trail itineraries — straight to your inbox.
          </p>
          <NewsletterForm />
        </div>
      </section>

    </div>
  )
}
