'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Do I need to pay to be listed?',
    a: 'No. Every maker in the directory has a free listing with one photo. You only pay if you want to unlock additional features like unlimited photos and priority placement. If your studio is already in the directory, claiming it is free.',
  },
  {
    q: 'How do I claim my listing?',
    a: "Search for your studio on Craft Atlas. On your listing page, click 'Claim this listing' and follow the prompts. Once verified, you'll have access to your maker dashboard.",
  },
  {
    q: 'What types of makers are included?',
    a: 'Craft Atlas covers ceramicists, visual artists, jewellers, textile artists, woodworkers, glass artists, printmakers, and more — any independent maker or studio with a physical space that welcomes visitors.',
  },
  {
    q: 'Can I manage multiple listings?',
    a: 'Yes. Your dashboard supports multiple studio listings under a single account, each managed independently. Useful for collectives or makers running more than one space.',
  },
  {
    q: 'How does the enlarged map pin work?',
    a: "Every maker appears as a pin on the Craft Atlas map. Standard listings get an enlarged, tier-marked pin that stands out — particularly useful in regions with dense listings where you want to be the studio that catches the eye first.",
  },
  {
    q: "What is 'Experiences & Classes'?",
    a: "A Standard feature that lets you highlight workshops, classes, or studio experiences you offer. It sits prominently on your listing page and gives visitors a reason to check back regularly.",
  },
  {
    q: 'Can I cancel or change my tier?',
    a: 'Yes. You can upgrade or cancel at any time through your dashboard. No lock-in contracts.',
  },
  {
    q: 'How is Craft Atlas different from social media?',
    a: "Social posts disappear within hours and rely on algorithms you don't control. Your Craft Atlas listing is permanent, searchable, and compounds over time — building SEO value and appearing in recommendations that social media simply can't touch.",
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
            <span style={{ color: 'var(--primary)', fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2, fontWeight: 300 }}>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.7, paddingBottom: 20, paddingRight: 32, margin: 0 }}>{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  )
}
