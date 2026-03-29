import Link from 'next/link'
export const revalidate = 60
import { getSupabase } from '@/lib/supabase'
import RegionCarousel from '@/components/RegionCarousel'
import { HeroMap, NewsletterForm, NewsletterToast } from '@/components/HomeClient'
import SemanticSearchBar from '@/components/SemanticSearchBar'


const TYPE_COLORS = {
  ceramics: '#C1603A',
  visual_art: '#4a7c59',
  jewellery: '#6b4f2a',
  textile: '#4a3d6b',
  wood: '#7a5c2e',
  glass: '#6b5a1a',
}

const TYPE_LABELS_PLURAL = {
  ceramics: 'Ceramics',
  visual_art: 'Visual Art',
  jewellery: 'Jewellery',
  textile: 'Textile',
  wood: 'Wood & Furniture',
  glass: 'Glass',
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

export default async function HomePage() {
  const supabase = getSupabase()
  const { count: venueCount } = await supabase.from('venues').select('*', { count: 'exact', head: true }).eq('published', true)
  const { data: venues } = await supabase.from('venues').select('category, longitude, latitude, suburb, state')
  const { data: latestArticles } = await supabase.from('articles').select('id, title, slug, deck, hero_image_url, category, reading_time').eq('status', 'published').order('published_at', { ascending: false }).limit(6)
  const { data: featuredVenues } = await supabase.from('venues').select('id, name, slug, category, suburb, state, hero_image_url, description').eq('published', true).in('tier', ['standard', 'premium']).order('tier', { ascending: false }).limit(8)
  const REGION_ORDER = [
    { name: 'Blue Mountains', state: 'NSW' },{ name: 'Byron Hinterland', state: 'NSW' },
    { name: 'Yarra Valley', state: 'VIC' },{ name: 'Central Victoria', state: 'VIC' },
    { name: 'Tamar Valley', state: 'TAS' },{ name: 'Adelaide Hills', state: 'SA' },
    { name: 'Mornington Peninsula', state: 'VIC' },{ name: 'Sunshine Coast Hinterland', state: 'QLD' },
  ]
  const rc=(venues||[]).reduce((a,v)=>{if(v.suburb)a[v.suburb]=(a[v.suburb]||0)+1;return a},{})
  const regions=REGION_ORDER.map(r=>({...r,count:rc[r.name]||0}))
  const tc=(venues||[]).reduce((a,v)=>{if(v.category)a[v.category]=(a[v.category]||0)+1;return a},{})
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
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Australian Makers &amp; Studios
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: 20 }}>
            Discover {(venueCount || (venues || []).length).toLocaleString()} makers,<br />
            artists <span style={{ fontStyle: 'italic', color: 'var(--primary)' }}>&</span> studios
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 32, fontFamily: 'var(--font-sans)' }}>
            From the Blue Mountains to the Tamar — every studio, workshop and gallery on one beautiful map.
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
                const typeColor = { ceramics: '#C1603A', visual_art: '#4a7c59', jewellery: '#6b4f2a', textile: '#4a3d6b', wood: '#7a5c2e', glass: '#6b5a1a' }[venue.category] || '#6b4f2a'
                const typeLabel = { ceramics: 'Ceramics', visual_art: 'Visual Art', jewellery: 'Jewellery', textile: 'Textile', wood: 'Wood & Furniture', glass: 'Glass' }[venue.category] || venue.category
                return (
                  <Link key={venue.id} href={`/venue/${venue.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ aspectRatio: '3/2', background: 'var(--bg-2)', overflow: 'hidden' }}>
                        {venue.hero_image_url
                          ? <img src={venue.hero_image_url} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: `${typeColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, opacity: 0.4 }}>🎨</span></div>
                        }
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor, marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{typeLabel}</div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{venue.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{[venue.suburb, venue.state].filter(Boolean).join(', ')}</div>
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
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 48 }}>
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


      {/* JOURNAL */}
      {latestArticles && latestArticles.length > 0 && <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                From the Journal
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
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
          <Link href="/claim" style={{ display: 'inline-block', padding: '14px 36px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
            Claim your free listing →
          </Link>
        </div>
      </section>

      <NewsletterToast />
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
