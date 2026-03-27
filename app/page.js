import Link from 'next/link'
export const revalidate = 60
import { getSupabase } from '@/lib/supabase'
import RegionCarousel from '@/components/RegionCarousel'
import { HeroMap, NewsletterForm, NewsletterToast } from '@/components/HomeClient'
import SemanticSearchBar from '@/components/SemanticSearchBar'


const TYPE_COLORS = {
  winery: '#4a7c59',
  brewery: '#6b4f2a',
  distillery: '#4a3d6b',
  cidery: '#7a5c2e',
  meadery: '#6b5a1a',
}

const TYPE_LABELS_PLURAL = {
  winery: 'Wineries',
  brewery: 'Breweries',
  distillery: 'Distilleries',
  cidery: 'Cideries',
  meadery: 'Meaderies',
}

const REGION_DESCRIPTORS = {
  'barossa-valley': { badge: 'Wine Region', desc: "Australia's most iconic Shiraz country — old vines, world-class producers." },
  'margaret-river': { badge: 'Wine Region', desc: 'Bordeaux-style Cabernet at the edge of the Indian Ocean.' },
  'yarra-valley': { badge: 'Wine & Beer', desc: 'Cool-climate Pinot and Chardonnay an hour from Melbourne.' },
  'hunter-valley': { badge: 'Wine Region', desc: "Australia's oldest wine region — age-worthy Semillon and earthy Shiraz." },
  'tamar-valley': { badge: 'Wine & Whisky', desc: 'Tasmanian precision — world-class Pinot and boutique distilleries.' },
  'mclaren-vale': { badge: 'Wine Region', desc: 'Mediterranean warmth, ancient soils, and full-bodied Grenache.' },
  'mornington-peninsula': { badge: 'Wine & Cider', desc: 'Elegant Pinot Noir on a stunning coastal peninsula south of Melbourne.' },
  'granite-belt': { badge: 'Wine Region', desc: "Queensland's cool-climate highland secret — bold reds and crisp whites." },
}

export default async function HomePage() {
  const supabase = getSupabase()
  const { data: venues } = await supabase.from('venues').select('type, longitude, latitude, sub_region, state')
  const { data: latestArticles } = await supabase.from('articles').select('id, title, slug, deck, hero_image_url, category, reading_time').eq('status', 'published').order('published_at', { ascending: false }).limit(6)
  const { data: featuredVenues } = await supabase.from('venues').select('id, name, slug, type, sub_region, state, hero_image_url, description').eq('status', 'published').in('listing_tier', ['standard', 'premium']).order('listing_tier', { ascending: false }).limit(8)
  const REGION_ORDER = [
    { name: 'Barossa Valley', state: 'SA' },{ name: 'Margaret River', state: 'WA' },
    { name: 'Yarra Valley', state: 'VIC' },{ name: 'Hunter Valley', state: 'NSW' },
    { name: 'Tamar Valley', state: 'TAS' },{ name: 'McLaren Vale', state: 'SA' },
    { name: 'Mornington Peninsula', state: 'VIC' },{ name: 'Granite Belt', state: 'QLD' },
  ]
  const rc=(venues||[]).reduce((a,v)=>{if(v.sub_region)a[v.sub_region]=(a[v.sub_region]||0)+1;return a},{})
  const regions=REGION_ORDER.map(r=>({...r,count:rc[r.name]||0}))
  const tc=(venues||[]).reduce((a,v)=>{if(v.type)a[v.type]=(a[v.type]||0)+1;return a},{})
  const types=Object.entries(tc).sort(([,a],[,b])=>b-a).slice(0,5)
  const total=(venues||[]).length
  return (

    <div>
      {/* HERO */}
      <section style={{ position: 'relative', height: 520 }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <HeroMap venues={venues || []} />
        </div>
        <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, width: '100%', maxWidth: 620, padding: '0 48px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Australia&apos;s Craft Drinks Directory
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 20 }}>
            Discover {(venues || []).length.toLocaleString()} distilleries,<br />
            breweries <span style={{ fontStyle: 'italic', color: 'var(--amber)' }}>&</span> wineries
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 32, fontFamily: 'var(--font-sans)' }}>
            From the Barossa to the Tamar — every cellar door, taproom and tasting room on one beautiful map.
          </p>
          <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
            <SemanticSearchBar />
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/map" style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
              or browse the map →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '28px 24px', background: 'var(--bg-2)' }}>
        <div className="home-stats-bar">
          {types.map(([type, count]) => (
            <div key={type} style={{ textAlign: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', color: TYPE_COLORS[type] || 'var(--text)', fontWeight: 400, lineHeight: 1, marginBottom: 4 }}>
                {count}
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                {TYPE_LABELS_PLURAL[type] || type}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCERS */}
      {featuredVenues && featuredVenues.length >= 3 && (
        <section style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '48px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Featured Producers</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 400, color: 'var(--text)', margin: 0 }}>Worth seeking out</h2>
              </div>
              <Link href="/explore" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>View all →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {featuredVenues.map(venue => {
                const typeColor = { winery: '#4a7c59', brewery: '#6b4f2a', distillery: '#4a3d6b', cidery: '#7a5c2e', meadery: '#6b5a1a' }[venue.type] || '#6b4f2a'
                const typeLabel = { winery: 'Winery', brewery: 'Brewery', distillery: 'Distillery', cidery: 'Cidery', meadery: 'Meadery' }[venue.type] || venue.type
                return (
                  <Link key={venue.id} href={`/venue/${venue.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ aspectRatio: '3/2', background: 'var(--bg-2)', overflow: 'hidden' }}>
                        {venue.hero_image_url
                          ? <img src={venue.hero_image_url} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: `${typeColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, opacity: 0.4 }}>🍷</span></div>
                        }
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor, marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{typeLabel}</div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{venue.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{[venue.sub_region, venue.state].filter(Boolean).join(', ')}</div>
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
            const meta = REGION_DESCRIPTORS[region.name.toLowerCase().replace(/ /g, '-')] || { badge: 'Region', desc: '' }
            return (
              <Link key={region.name} href={`/explore?region=${region.name.toLowerCase().replace(/ /g, '-')}`}
                className="region-card"
              >
                <div className="region-card-image" style={{ backgroundImage: `url(/images/regions/${region.name.toLowerCase().replace(/ /g, '-')}.jpg)` }} />
                <div className="region-card-overlay" />
                <div className="region-card-badge">{meta.badge}</div>
                <div className="region-card-body">
                  <div className="region-card-state">{region.state}</div>
                  <div className="region-card-name">{region.name}</div>
                  <div className="region-card-desc">{meta.desc}</div>
                  <div className="region-card-footer">
                    <span className="region-card-count"><strong>{region.count}</strong> venues</span>
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
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Plan Your Trip
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 48 }}>
            Every cellar door, taproom <span style={{ fontStyle: 'italic', color: 'var(--amber)' }}>&</span> tasting room
          </h2>
          <div className="home-steps-grid">
            {[
              { num: '01', title: 'Search & Filter', desc: 'Find venues by type, state, or region. Search by name or browse the map.' },
              { num: '02', title: 'Discover Details', desc: 'Opening hours, ratings, directions, websites — everything you need to plan a visit.' },
              { num: '03', title: 'Explore Tasting Trails', desc: 'Follow our curated trails through Australia\'s best craft drink regions.', href: '/trails' },
            ].map(step => (
              <div key={step.num} style={{ padding: '32px 28px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2 }}>
                <div style={{ fontSize: 32, fontFamily: 'var(--font-serif)', color: 'var(--amber)', marginBottom: 12, lineHeight: 1, opacity: 0.7 }}>{step.num}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* JOURNAL */}
      {latestArticles && latestArticles.length > 0 && <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                From the Journal
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
                Guides, stories <span style={{ fontStyle: 'italic', color: 'var(--amber)' }}>&</span> itineraries
              </h2>
            </div>
            <Link href="/journal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', textDecoration: 'none', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
              All Articles →
            </Link>
          </div>
          <div className="home-journal-carousel">
            {(latestArticles || []).map(article => (
              <Link key={article.id} href={`/journal/${article.slug}`} className="home-journal-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', background: '#1a1a1a', overflow: 'hidden', display: 'block' }}>
                  {article.hero_image_url ? (
                    <img src={article.hero_image_url} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} className="journal-card-img" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-2)' }} />
                  )}
                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.85) 100%)' }} />
                  {/* Content over image */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 24px 24px' }}>
                    {article.category && (
                      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', marginBottom: 10, fontWeight: 600 }}>
                        {article.category}
                      </div>
                    )}
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 400, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                      {article.title}
                    </div>
                    {article.deck && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontFamily: 'var(--font-sans)', marginTop: 8 }}>
                        {article.deck}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* FOR VENUES CTA */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>For Venues</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16 }}>
            Get your venue on the map
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 36, fontFamily: 'var(--font-sans)' }}>
            Small Batch Atlas is building Australia&apos;s most comprehensive craft drinks directory. Claim your free listing or upgrade to a premium profile with photos, featured placement, and direct booking links.
          </p>
          <Link href="/claim" style={{ display: 'inline-block', padding: '14px 36px', background: 'var(--amber)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
            Claim your free listing →
          </Link>
        </div>
      </section>

      <NewsletterToast />
      <NewsletterToast />
      {/* NEWSLETTER */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>Stay Updated</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }}>
            The atlas is always growing
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
            New venues added weekly, region guides, and tasting trail itineraries — straight to your inbox.
          </p>
          <NewsletterForm />
        </div>
      </section>

    </div>
  )
}