'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Do I need to pay to be listed?',
    a: 'No. Every venue in the directory has a free Basic listing. You only pay if you want to take control of your listing and unlock additional features. If your venue is already in the directory, claiming it is free.',
  },
  {
    q: 'How do I claim my listing?',
    a: "Search for your venue on Small Batch Atlas. On your venue page, click 'Claim this listing' and follow the prompts. Once verified, you'll have access to your vendor dashboard.",
  },
  {
    q: 'What types of venues are included?',
    a: 'Small Batch Atlas covers breweries, distilleries, wineries, cideries, and meaderies — any craft beverage producer with a physical venue that welcomes visitors.',
  },
  {
    q: 'Can I manage multiple venues?',
    a: 'Yes. Your dashboard supports multiple venue listings under a single account, each managed independently. Useful for groups or operators running more than one site.',
  },
  {
    q: 'How does the enlarged map pin work?',
    a: "Every venue appears as a pin on the Small Batch Atlas map. Premium listings get an enlarged, tier-marked pin that stands out — particularly useful in regions with dense listings where you want to be the venue that catches the eye first.",
  },
  {
    q: "What is 'Currently Pouring'?",
    a: "A Premium feature that lets you display what's on right now — new releases, seasonal specials, what's on tap this week. It sits prominently on your listing page and gives visitors a reason to check back regularly.",
  },
  {
    q: 'Can I cancel or change my tier?',
    a: 'Yes. You can upgrade, downgrade, or cancel at any time through your dashboard. No lock-in contracts.',
  },
  {
    q: 'How is Small Batch Atlas different from social media?',
    a: "Social posts disappear within hours and rely on algorithms you don't control. Your SBA listing is permanent, searchable, and compounds over time — building SEO value and appearing in AI-generated recommendations that social media simply can't touch.",
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState(null)

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 32px' }}>
      {FAQS.map((faq, i) => (
        <div key={faq.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', textAlign: 'left', padding: '20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, fontWeight: 500 }}>{faq.q}</span>
            <span style={{ color: 'var(--amber)', fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2, fontWeight: 300 }}>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.7, paddingBottom: 20, paddingRight: 32, margin: 0 }}>{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  )
}
