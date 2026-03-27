export const metadata = {
  title: 'About | Small Batch Atlas',
  description: 'Small Batch Atlas is an independent directory of Australian craft breweries, distilleries, wineries, and cideries — built for people who want to drink well and travel with purpose.',
}

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <section style={{ background: '#1c1a17', padding: '100px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>About</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, color: '#f5f0e8', lineHeight: 1.15, marginBottom: 32, letterSpacing: '-0.01em' }}>
            A directory built for people who drink with curiosity
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#b0a090', lineHeight: 1.8, maxWidth: 600 }}>
            Small Batch Atlas maps Australia's independent craft beverage producers — the breweries, distilleries, wineries, and cideries worth going out of your way for.
          </p>
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>How it started</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Australia has one of the most interesting small-scale drinks scenes in the world. Over the past two decades, hundreds of independent producers have opened across the country — from single-barrel whisky distillers in the Tasmanian highlands to natural wine makers on the Mornington Peninsula to craft breweries tucked into suburban warehouses in every major city.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Most of them are hard to find. A Google search turns up review aggregators, tourism sites with outdated listings, and promotional content that tells you nothing useful. There was no single place to go if you wanted to plan a weekend around a distillery trail, or find out which breweries near Hobart were actually worth the detour.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            Small Batch Atlas exists to fix that. It is an independent, editorially curated directory of Australian craft producers — built not by an algorithm, but by someone who cares about the industry and thinks good drinks deserve better infrastructure.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>What is in the directory</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 32 }}>
            The atlas currently covers over 2,600 venues across Australia, spanning six categories:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
            {[
              { label: 'Breweries', desc: 'Craft beer, lager and ale producers' },
              { label: 'Distilleries', desc: 'Whisky, gin, rum and spirits' },
              { label: 'Wineries', desc: 'Estate and cellar door producers' },
              { label: 'Cideries', desc: 'Cider and perry makers' },
              { label: 'Meaderies', desc: 'Honey wine producers' },
              { label: 'Sake breweries', desc: 'Australian-made sake' },
            ].map(cat => (
              <div key={cat.label} style={{ background: 'var(--bg)', padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{cat.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)' }}>{cat.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            Every listing includes location, contact details, and venue type. Producers can claim and manage their own listings through the venue portal, adding descriptions, opening hours, images, and upcoming events.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>Editorial approach</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            The directory is editorially curated. Inclusion is based on a simple standard: is this a genuine small-batch producer with a real presence in the Australian drinks landscape? Venues that do not meet that bar — hospitality-only operations, resellers, or businesses that do not produce their own product — are not listed.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Listings are not paid placements. Every venue appears on its own merits. Producers can claim their listing and enhance it with additional detail, but payment never influences inclusion or ranking.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            The tasting trails — editorially curated routes connecting producers in a region — are selected for their quality, coherence, and usefulness as actual day-trip itineraries. Not every producer makes the cut.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 3, padding: '36px 40px', marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>For producers</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: 24 }}>
            If your venue is listed, you can claim it and take control of your listing — update your description, add photos, post upcoming events, and make sure visitors have accurate information before they arrive.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 28 }}>
            Basic claiming is free. Premium listings include additional features for venues that want more visibility on the platform.
          </p>
          <a href="/claim" style={{ display: 'inline-block', background: 'var(--amber)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 2, textDecoration: 'none' }}>
            Claim your listing →
          </a>
        </div>

        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>Get in touch</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 16 }}>
            For questions about listings, editorial enquiries, or anything else — reach out at{' '}
            <a href="mailto:hello@smallbatchatlas.com.au" style={{ color: 'var(--amber)', textDecoration: 'none', borderBottom: '1px solid var(--amber)' }}>hello@smallbatchatlas.com.au</a>
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.85 }}>
            Small Batch Atlas is an independent Australian publication, not affiliated with any industry body, producer association, or government tourism authority.
          </p>
        </div>

      </section>
    </div>
  )
}
