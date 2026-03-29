import Link from 'next/link'
import VendorAgent from '@/components/VendorAgent'

export const metadata = {
  title: 'For Makers | Craft Atlas',
  description: 'Why claim your listing on Craft Atlas — and what you get with a free or paid listing.',
}

export default function ForVendorsPage() {

  const faqs = [
    {
      q: 'What is Craft Atlas?',
      a: 'Craft Atlas is an Australian directory of makers, artists and studios — ceramicists, jewellers, woodworkers, textile artists, glass artists, printmakers and more. Visitors use it to discover studios to visit, plan day trips, and follow curated maker trails. Think of it as a dedicated, experience-focused guide to independent Australian makers.',
    },
    {
      q: 'My studio is already listed. How did that happen?',
      a: 'We built the directory from public sources to give visitors a comprehensive starting point. Your listing exists, but it is unverified — which means details may be incomplete or outdated. Claiming it takes a few minutes and puts you in control of what visitors see.',
    },
    {
      q: 'What do I get with a free listing?',
      a: 'A free claimed listing lets you update your core details: name, description, address, opening hours, contact info, website, and one photo. It also marks your listing as verified, which builds trust with visitors browsing the directory.',
    },
    {
      q: 'Why would I pay for a Standard listing?',
      a: 'Standard ($99/yr) unlocks everything you need to stand out and convert browsers into visitors — unlimited photos, opening hours, practice description, experiences & classes, commissions available, events calendar, seasonal highlights, special offers, analytics, priority placement in search results, and featured placement in regional guides and maker trails.',
    },
    {
      q: 'How many people actually use the directory?',
      a: 'Craft Atlas is building an audience of craft enthusiasts — people actively planning studio visits, not passive scrollers. Visitor numbers grow as we publish editorial content, maker trails, and regional guides.',
    },
    {
      q: 'I am a small maker. Is this worth it for me?',
      a: 'Yes — especially the free tier. Even if you never upgrade, a complete verified listing costs nothing and means visitors searching your region will find accurate information. Standard is worth it once you want photos, events, and better placement working for you.',
    },
    {
      q: 'What does a Standard listing include?',
      a: 'Everything you need to be found and convert visitors: unlimited photos, opening hours, practice description, experiences & classes, commissions available, events calendar, seasonal highlights, special offers, analytics, and priority placement in search results and maker trails.',
    },
    {
      q: 'Can I cancel a paid subscription?',
      a: 'Yes, at any time. If you cancel, your listing reverts to a free claimed listing — your details stay live, you just lose the paid features. Nothing gets deleted.',
    },
    {
      q: 'Is my information shared with third parties?',
      a: 'No. Your listing details are displayed on Craft Atlas for visitors to find you. We do not sell or share your data.',
    },
    {
      q: 'How do I get started?',
      a: null,
      cta: true,
    },
  ]

  const plans = [
    {
      tier: 'Free',
      price: 'Free',
      sub: 'Always',
      color: 'var(--border)',
      textColor: 'var(--text)',
      features: [
        'Claim and verify your listing',
        'Update name, description, address',
        'Add opening hours and contact details',
        'Link to your website',
        '1 photo',
        'Verified badge on your listing',
      ],
      cta: 'Claim for free',
      href: '/claim',
      highlight: false,
    },
    {
      tier: 'Standard',
      price: '$99',
      sub: 'per year',
      color: '#4a7c59',
      textColor: '#fff',
      features: [
        'Everything in Free',
        'Unlimited photos',
        'Opening hours & studio features',
        'Practice description',
        'Experiences & classes',
        'Commissions available',
        'Events calendar & seasonal highlights',
        'Special offers & promotions',
        'Analytics — page views and visitor trends',
        'Priority placement in search results',
        'Featured in regional guides & maker trails',
        'Enlarged map pin',
        'Featured on homepage',
      ],
      cta: 'Start with Standard',
      href: '/claim?tier=standard',
      highlight: true,
    },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <section style={{ background: '#1c1a17', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '72px 24px 60px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C1603A', marginBottom: 14, fontFamily: 'var(--font-sans)' }}>
            For makers
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, marginBottom: 20 }}>
            Why list your studio on Craft Atlas
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 580, fontFamily: 'var(--font-sans)', marginBottom: 32 }}>
            Australian makers and studios are already in the directory. Claiming yours is free, takes five minutes, and means visitors find the right information when planning a visit.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/claim" style={{ display: 'inline-block', padding: '12px 28px', background: '#C1603A', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
              Claim your free listing
            </Link>
            <Link href="#pricing" style={{ display: 'inline-block', padding: '12px 28px', background: 'transparent', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.2)' }}>
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>What is included</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 12 }}>Two tiers, no lock-in</h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', textAlign: 'center', marginBottom: 48, fontFamily: 'var(--font-sans)' }}>Billed annually. Cancel any time — your free listing remains active. Payments via Stripe.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {plans.map(plan => (
              <div key={plan.tier} style={{ padding: '36px 32px', background: plan.highlight ? 'var(--text)' : 'var(--bg)', border: plan.highlight ? 'none' : '1px solid var(--border)', borderRadius: 3, position: 'relative' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'var(--bg)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '4px 14px', fontFamily: 'var(--font-sans)', fontWeight: 600, borderRadius: '0 0 3px 3px' }}>Most Popular</div>
                )}
                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>{plan.tier}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 400, color: plan.highlight ? '#fff' : 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 12, color: plan.highlight ? 'rgba(255,255,255,0.45)' : 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>{plan.sub}</div>
                <div style={{ marginBottom: 32 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: 'var(--primary)', fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.75)' : 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={plan.href} style={{ display: 'block', padding: '12px 24px', background: plan.highlight ? 'var(--primary)' : 'transparent', color: plan.highlight ? '#fff' : 'var(--text)', textDecoration: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2, border: plan.highlight ? 'none' : '1px solid var(--border)', textAlign: 'center' }}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 14, fontFamily: 'var(--font-sans)', textAlign: 'center' }}>FAQ</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400, color: 'var(--text)', textAlign: 'center', marginBottom: 48 }}>Common questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: faq.a || faq.cta ? 10 : 0 }}>{faq.q}</div>
                {faq.a && <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: 'var(--font-sans)', margin: 0 }}>{faq.a}</p>}
                {faq.cta && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <Link href="/claim" style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>Claim your listing</Link>
                    <Link href="/vendor/login" style={{ display: 'inline-block', padding: '10px 24px', background: 'transparent', color: 'var(--text)', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2, border: '1px solid var(--border)' }}>Maker login</Link>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 32 }}>
            Still have questions? <a href="mailto:hello@craftatlas.com.au" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Get in touch</a> — we actually reply.
          </p>
        </div>
      </section>

      <section style={{ padding: '48px 24px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <VendorAgent />
        </div>
      </section>

    </div>
  )
}
