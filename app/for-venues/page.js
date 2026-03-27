import Link from 'next/link'
import FaqAccordion from './FaqAccordion'

export const metadata = {
  title: 'List Your Venue — Small Batch Atlas',
  description: "Get your brewery, distillery, winery or cellar door on Australia's most comprehensive craft drinks directory.",
}

const TIERS = [
  {
    name: 'Free',
    price: '0',
    period: 'forever',
    description: 'Get listed and be found.',
    features: ['Basic venue listing', 'Pin on the map', 'Venue type & location', 'Claim your listing'],
    cta: 'Claim Free Listing',
    href: '/claim',
    highlight: false,
  },
  {
    name: 'Standard',
    price: '99',
    period: 'per year',
    description: 'Everything you need to stand out and convert visitors.',
    features: ['Everything in Free', 'Unlimited photos', 'Opening hours & contact details', 'Venue features & drinks menu', 'Awards & accolades', 'Events calendar', 'Seasonal highlights', 'Special offers & promotions', 'Enlarged map pin', 'Featured on homepage', 'Priority placement in search', 'Analytics dashboard', 'Featured in regional guides & tasting trails'],
    cta: 'Get Started',
    href: '/vendor/login',
    highlight: true,
  },
]

const ALL_FEATURES = [
  { label: 'Listed in the directory', basic: true, standard: true },
  { label: 'Pin on the map', basic: true, standard: true },
  { label: 'Searchable by type, state & region', basic: true, standard: true },
  { label: 'Venue name & location', basic: true, standard: true },
  { label: 'Unlimited photos', basic: false, standard: true },
  { label: 'Opening hours', basic: false, standard: true },
  { label: 'Venue features & facilities', basic: false, standard: true },
  { label: 'Drinks menu', basic: false, standard: true },
  { label: 'Awards & accolades', basic: false, standard: true },
  { label: 'Events calendar', basic: false, standard: true },
  { label: 'Seasonal highlights', basic: false, standard: true },
  { label: 'Special offers & promotions', basic: false, standard: true },
  { label: 'Enlarged map pin', basic: false, standard: true },
  { label: 'Featured on homepage', basic: false, standard: true },
  { label: 'Priority placement in search', basic: false, standard: true },
  { label: 'Analytics dashboard', basic: false, standard: true },
  { label: 'Featured in regional guides & tasting trails', basic: false, standard: true },
]

function Check({ included }) {
  if (included) return <span style={{ color: 'var(--amber)', fontSize: 15 }}>✓</span>
  return <span style={{ color: 'var(--border)', fontSize: 15 }}>–</span>
}

export default function ForVenuesPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <section style={{ padding: '90px 24px 80px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>For Venues</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.15, marginBottom: 24 }}>
            Put your venue on Australia&apos;s craft drinks map
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 40, fontFamily: 'var(--font-sans)' }}>
            Small Batch Atlas is the most comprehensive directory of breweries, distilleries, wineries, cideries and meaderies in Australia — with 2,600+ venues and growing. Claim your free listing or upgrade for photos, featured placement, and more.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/claim" style={{ display: 'inline-block', padding: '14px 32px', background: 'var(--amber)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>Claim Your Venue</Link>
            <Link href="/vendor/login" style={{ display: 'inline-block', padding: '14px 32px', background: 'transparent', color: 'var(--text)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2, border: '1px solid var(--border)' }}>Venue Login</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>Pricing</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', textAlign: 'center', marginBottom: 52, fontFamily: 'var(--font-sans)' }}>No lock-in contracts. Cancel anytime.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {TIERS.map(tier => (
              <div key={tier.name} style={{ padding: '36px 32px', background: tier.highlight ? 'var(--text)' : 'var(--bg)', border: tier.highlight ? 'none' : '1px solid var(--border)', borderRadius: 3, position: 'relative' }}>
                {tier.highlight && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'var(--amber)', color: 'var(--bg)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '4px 14px', fontFamily: 'var(--font-sans)', fontWeight: 600, borderRadius: '0 0 3px 3px' }}>Most Popular</div>
                )}
                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>{tier.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  {tier.price !== '0' && <span style={{ fontSize: 15, color: tier.highlight ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>$</span>}
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 400, color: tier.highlight ? '#fff' : 'var(--text)', lineHeight: 1 }}>{tier.price === '0' ? 'Free' : tier.price}</span>
                </div>
                <div style={{ fontSize: 12, color: tier.highlight ? 'rgba(255,255,255,0.45)' : 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>{tier.period}</div>
                <div style={{ fontSize: 13, color: tier.highlight ? 'rgba(255,255,255,0.7)' : 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 28, lineHeight: 1.5 }}>{tier.description}</div>
                <div style={{ marginBottom: 32 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: 'var(--amber)', fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: tier.highlight ? 'rgba(255,255,255,0.75)' : 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={tier.href} style={{ display: 'block', padding: '13px 24px', background: tier.highlight ? 'var(--amber)' : 'transparent', color: tier.highlight ? 'var(--bg)' : 'var(--text)', textDecoration: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2, border: tier.highlight ? 'none' : '1px solid var(--border)', textAlign: 'center' }}>{tier.cta}</Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 20 }}>Billed annually. Cancel any time. Payments via Stripe.</p>
        </div>
      </section>

      <section style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>What&apos;s Included</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 48 }}>Every tier, in full</h2>
          <div style={{ border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden', background: 'var(--bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(2, 140px)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
              <div style={{ padding: '16px 24px' }} />
              {['Basic', 'Standard'].map(t => (
                <div key={t} style={{ padding: '16px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)' }}>{t}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(2, 140px)', borderBottom: '2px solid var(--border)', background: 'var(--bg-2)' }}>
              <div style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>per year</div>
              {['Free', '$99'].map(p => (
                <div key={p} style={{ padding: '12px 8px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', fontWeight: 400 }}>{p}</div>
              ))}
            </div>
            {ALL_FEATURES.map((f, i) => (
              <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(2, 140px)', borderBottom: i < ALL_FEATURES.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-2)' }}>
                <div style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>{f.label}</div>
                <div style={{ padding: '14px 8px', textAlign: 'center' }}><Check included={f.basic} /></div>
                <div style={{ padding: '14px 8px', textAlign: 'center' }}><Check included={f.standard} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>How It Works</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 52 }}>Listed in minutes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {[
              { n: '01', title: 'Find your venue', desc: 'Search for your brewery, distillery or winery in the directory.' },
              { n: '02', title: 'Claim it', desc: 'Submit a claim request. We verify and hand you control.' },
              { n: '03', title: 'Enhance your profile', desc: 'Add photos, hours, links — and optionally upgrade for more visibility.' },
            ].map(step => (
              <div key={step.n} style={{ padding: '28px 24px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg)' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--amber)', opacity: 0.6, marginBottom: 12, lineHeight: 1 }}>{step.n}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>FAQ</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 48 }}>Common questions</h2>
          <FaqAccordion />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 28 }}>
            Still have questions? <a href="mailto:hello@smallbatchatlas.com.au" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Get in touch</a> — we actually reply.
          </p>
        </div>
      </section>

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 400, color: 'var(--text)', marginBottom: 20 }}>Ready to get on the map?</h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 36, fontFamily: 'var(--font-sans)' }}>Claim your free listing today. No credit card required.</p>
          <Link href="/claim" style={{ display: 'inline-block', padding: '16px 40px', background: 'var(--amber)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>Claim Your Free Listing</Link>
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
            Already have an account? <Link href="/vendor/login" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
