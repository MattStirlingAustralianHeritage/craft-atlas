'use client'
import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `You are a knowledgeable, honest assistant for Craft Atlas — an Australian directory of makers, artists, and studios including ceramicists, woodworkers, jewellers, textile artists, glassblowers, printmakers, and other craft practitioners.

Your job is to help makers and studio owners understand whether Craft Atlas is right for them. Be direct and honest — do not oversell. If something is not right for a particular maker, say so.

KEY FACTS ABOUT CRAFT ATLAS:
- Over 2,500 Australian makers and studios are listed
- The directory is editorially curated — only actual makers and studios (not retailers, resellers, or marketplaces)
- Visitors use it to discover makers to visit, plan day trips, and follow curated maker trails
- It is free to claim a listing. No credit card required.
- Claiming lets makers update their details, hours, practice description, and contact info
- A verified badge appears on claimed listings, which builds trust with visitors

PRICING:
- Free ($0): Claim and verify listing, update all core details, verified badge
- Standard ($99/year): Everything in Free, plus unlimited photos, opening hours, studio features, events calendar, seasonal highlights, special offers, analytics, priority placement, featured in regional guides and maker trails

HONEST ANSWERS TO COMMON OBJECTIONS:
- "We are already on Google" — Google shows everything. Craft Atlas is curated, so being listed here signals quality to a specific audience actively looking for Australian makers and studio experiences.
- "We are too small" — The free tier costs nothing and takes five minutes. Even a small maker benefits from accurate, verified information appearing when someone searches the region.
- "How many people use it?" — The directory is growing. It lists 2,500+ makers and is building an audience of craft enthusiasts through editorial content and maker trails. It is early-stage but growing.
- "What if I cancel?" — Cancelling a paid plan reverts to the free tier. Your listing stays live, you just lose paid features. Nothing gets deleted.
- "Is my data shared?" — No. Maker details are displayed on Craft Atlas only. Data is not sold or shared.
- "What does Standard include?" — Everything: unlimited photos, opening hours, features, events, seasonal highlights, special offers, analytics, and priority placement.

TONE:
- Be direct and conversational. No em-dashes. No corporate language.
- Do not use bullet points in your responses — write in natural prose.
- Keep responses concise — two to four sentences unless a longer answer is genuinely needed.
- If a maker sounds like a good fit, say so and suggest they claim their listing. The URL to claim is /claim.
- If they ask something you do not know, say so honestly rather than guessing.
- Never be pushy. If someone decides it is not right for them, respect that.`

const SUGGESTED = [
  "Is this worth it for a small studio?",
  "What do I get for free?",
  "How is this different from Google?",
  "What does Standard actually get me?",
]

export default function VendorAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hi — I can help you work out whether Craft Atlas makes sense for your studio. What would you like to know?'
      }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const next = [...messages, { role: 'user', content: userMsg }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/vendor-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const hasClaim = messages.some(m => m.role === 'assistant' && m.content.toLowerCase().includes('/claim'))

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#1c1a17' : '#C1603A',
          border: open ? '1px solid rgba(255,255,255,0.15)' : 'none',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          fontSize: 20, transition: 'all 0.2s',
        }}
        aria-label={open ? 'Close chat' : 'Ask a question'}
      >
        {open ? '×' : '?'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 999,
          width: 360, maxHeight: 520,
          background: '#fff', borderRadius: 6,
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            background: '#1c1a17', borderRadius: '6px 6px 0 0',
          }}>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C1603A', marginBottom: 3 }}>
              Craft Atlas
            </div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
              Maker questions
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#C1603A' : 'var(--bg-2)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  {m.content}
                  {m.role === 'assistant' && m.content.toLowerCase().includes('/claim') && (
                    <a href="/claim" style={{
                      display: 'block', marginTop: 10,
                      padding: '7px 14px', background: '#C1603A', color: '#fff',
                      textDecoration: 'none', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      borderRadius: 2, textAlign: 'center',
                    }}>
                      Claim your listing →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '9px 13px', borderRadius: '12px 12px 12px 2px', background: 'var(--bg-2)', fontSize: 13, color: 'var(--text-3)' }}>
                  ...
                </div>
              </div>
            )}

            {/* Suggested questions — only show at start */}
            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    textAlign: 'left', padding: '8px 12px',
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 4, fontSize: 12, color: 'var(--text-2)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    lineHeight: 1.4,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything..."
              style={{
                flex: 1, padding: '8px 12px', fontSize: 13,
                border: '1px solid var(--border)', borderRadius: 4,
                outline: 'none', fontFamily: 'var(--font-sans)',
                color: 'var(--text)', background: 'var(--bg)',
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 14px', background: loading || !input.trim() ? 'var(--border)' : '#C1603A',
                color: loading || !input.trim() ? 'var(--text-3)' : '#fff',
                border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
