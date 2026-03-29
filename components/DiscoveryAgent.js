'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const CHIPS = [
  'Plan a day in the Yarra Valley',
  'Best ceramics studios in Victoria',
  'Maker trail in Tasmania',
  'Studios near Margaret River',
  'Workshops in Brisbane',
]

function VenueCard({ venue }) {
  return (
    <Link href={`/venue/${venue.slug}`} style={{
      display: 'block', marginTop: 8, padding: '10px 12px',
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 6, textDecoration: 'none', color: 'inherit'
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}>
        {venue.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>
        {venue.type} · {venue.sub_region || venue.state}
        {venue.google_rating ? ` · ★ ${venue.google_rating}` : ''}
      </div>
    </Link>
  )
}

const GREETING = 'Where are you headed? Tell me a region, a type of craft, or what kind of day you are planning and I will find somewhere worth visiting.'

function renderMessage(text) {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      const label = part.includes('/venue/') ? part.split('/venue/')[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'View';
      return <a key={i} href={part} style={{color:'#4a7c59', textDecoration:'underline', fontWeight:'600'}}>{label}</a>;
    }
    return part;
  });
}

export default function DiscoveryAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [venues, setVenues] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')
    const updated = [...messages, { role: 'user', content: userMsg }]
    setMessages(updated)
    setLoading(true)
    setVenues([])
    try {
      const res = await fetch('/api/discovery-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      if (data.venues?.length) setVenues(data.venues)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, left: 24, zIndex: 9999,
          width: 48, height: 48, borderRadius: '50%',
          background: '#7A8C7E', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
        }}
        title="Discover makers"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 84, left: 24, zIndex: 9999,
          width: 340, maxHeight: 520,
          background: '#faf7f2', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px', background: '#7A8C7E',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d4ddd6', fontFamily: 'var(--font-sans)' }}>
                CRAFT ATLAS
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-sans)' }}>
                Discover places
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#d4ddd6', fontSize: 18, lineHeight: 1
            }}>x</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'inline-block', maxWidth: '85%',
                  padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  lineHeight: 1.45, fontFamily: 'var(--font-sans)',
                  background: m.role === 'user' ? '#7A8C7E' : 'var(--bg-2)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                  float: m.role === 'user' ? 'right' : 'left', clear: 'both'
                }}>
                  {renderMessage(m.content)}
                </div>
                <div style={{ clear: 'both' }} />
              </div>
            ))}
            {loading && (
              <div style={{
                display: 'inline-block', padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg-2)', fontSize: 13, color: 'var(--text-3)',
                fontFamily: 'var(--font-sans)'
              }}>
                Finding makers...
              </div>
            )}
            {venues.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {venues.map(v => <VenueCard key={v.id} venue={v} />)}
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHIPS.map(chip => (
                  <button key={chip} onClick={() => send(chip)} style={{
                    padding: '5px 10px', fontSize: 11, fontFamily: 'var(--font-sans)',
                    background: 'var(--bg-3, #f0ede8)', border: '1px solid var(--border)',
                    borderRadius: 20, cursor: 'pointer', color: 'var(--text-2)'
                  }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: '10px 12px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, background: 'var(--bg-1)'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Where do you want to go?"
              style={{
                flex: 1, padding: '7px 10px', fontSize: 12,
                border: '1px solid var(--border)', borderRadius: 4,
                background: 'var(--bg-2)', color: 'var(--text-1)',
                fontFamily: 'var(--font-sans)', outline: 'none'
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                background: loading || !input.trim() ? 'var(--border)' : '#7A8C7E',
                color: loading || !input.trim() ? 'var(--text-3)' : '#fff',
                border: 'none', borderRadius: 4,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </>
  )
}
