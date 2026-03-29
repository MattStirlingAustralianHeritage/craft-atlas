export const metadata = {
  title: 'About | Craft Atlas',
  description: 'Craft Atlas is an independent, place-based directory of Australian makers, artists, and studios — built for people who value handmade craft and want to discover creative spaces across the country.',
}

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <section style={{ background: '#1c1a17', padding: '100px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>About</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 400, color: '#f5f0e8', lineHeight: 1.15, marginBottom: 32, letterSpacing: '-0.01em' }}>
            A directory built for people who seek out handmade craft
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#b0a090', lineHeight: 1.8, maxWidth: 600 }}>
            Craft Atlas maps Australia's independent makers, artists and studios — the ceramicists, jewellers, woodworkers and textile artists worth going out of your way for.
          </p>
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>How it started</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Australia has one of the most vibrant small-scale craft scenes in the world. Over the past two decades, hundreds of independent makers have opened studios across the country — from ceramicists in the Blue Mountains to jewellers in the Adelaide Hills to furniture makers working from converted warehouses in every major city.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Most of them are hard to find. A Google search turns up review aggregators, tourism sites with outdated listings, and promotional content that tells you nothing useful. There was no single place to go if you wanted to plan a weekend around a studio trail, or find out which makers near Hobart were actually worth the detour.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            Craft Atlas exists to fix that. It is an independent, editorially curated directory of Australian makers and studios — built not by an algorithm, but by someone who cares about the craft community and thinks good makers deserve better infrastructure.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>What is in the directory</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 32 }}>
            The atlas currently covers makers and studios across Australia, spanning seven categories:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
            {[
              { label: 'Ceramics & Clay', desc: 'Potters, ceramic artists and clay studios' },
              { label: 'Visual Art', desc: 'Painters, sculptors and mixed-media artists' },
              { label: 'Jewellery & Metalwork', desc: 'Fine jewellers and metal artisans' },
              { label: 'Textile & Fibre', desc: 'Weavers, dyers and textile designers' },
              { label: 'Wood & Furniture', desc: 'Woodworkers and furniture makers' },
              { label: 'Glass', desc: 'Glassblowers and stained-glass artists' },
              { label: 'Printmaking', desc: 'Letterpress, screen print and relief artists' },
            ].map(cat => (
              <div key={cat.label} style={{ background: 'var(--bg)', padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{cat.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-2)' }}>{cat.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            Every listing includes location, contact details, and studio type. Makers can claim and manage their own listings through the maker portal, adding descriptions, opening hours, images, and upcoming events.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>Editorial approach</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            The directory is editorially curated. Inclusion is based on a simple standard: is this a genuine independent maker with a real presence in the Australian craft landscape? Studios that do not meet that bar — retail-only operations, resellers, or businesses that do not create their own work — are not listed.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 24 }}>
            Listings are not paid placements. Every maker appears on their own merits. Makers can claim their listing and enhance it with additional detail, but payment never influences inclusion or ranking.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85 }}>
            The maker trails — editorially curated routes connecting studios in a region — are selected for their quality, coherence, and usefulness as actual day-trip itineraries. Not every maker makes the cut.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 72 }} />

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: 3, padding: '36px 40px', marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>For makers</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: 24 }}>
            If your studio is listed, you can claim it and take control of your listing — update your description, add photos, post upcoming events, and make sure visitors have accurate information before they arrive.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 28 }}>
            Basic claiming is free. Standard listings include additional features for makers that want more visibility on the platform.
          </p>
          <a href="/claim" style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 2, textDecoration: 'none' }}>
            Claim your listing →
          </a>
        </div>

        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>Get in touch</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.85, marginBottom: 16 }}>
            For questions about listings, editorial enquiries, or anything else — reach out at{' '}
            <a href="mailto:hello@craftatlas.com.au" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '1px solid var(--primary)' }}>hello@craftatlas.com.au</a>
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.85 }}>
            Craft Atlas is an independent Australian publication, not affiliated with any industry body, maker association, or government tourism authority.
          </p>
        </div>

      </section>
    </div>
  )
}
