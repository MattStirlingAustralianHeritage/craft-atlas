'use client'

// components/SemanticSearchBar.jsx
// Natural-language search bar — portal-aligned hero search.
//
// Brings the Australian Atlas portal's search experience to the vertical:
//   • an animated, cross-fading placeholder that rolls through real plain-English
//     example queries while the field is empty (teaches the query patterns)
//   • a polished, rounded shell with an accent focus glow and an accent submit
//     button (matches australianatlas.com.au's HomeSearchBar)
//   • plain-English queries routed through /api/search (the portal's NL hybrid
//     backend, proxied per-vertical) to a /search results page — or returned
//     inline via onResults when embedded somewhere that renders its own results.
//
// Parameterised so every vertical can share one component:
//   accent       CSS colour for icon/button/glow (default var(--accent))
//   examples     plain-English queries — power the roller AND the focus dropdown
//   searchPath   where Enter/Search navigates (default /search)
//   onResults    when provided, results are handed back instead of navigating
//   placeholder  static fallback (results page, reduced data) — the roller wins
//                on an empty hero field

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isInquiryQuery } from '@/lib/search/inquiryIntent'

const ROLL_MS = 3200
const FADE_MS = 320

const DEFAULT_EXAMPLES = [
  'natural wine in the Adelaide Hills',
  'wood-fired bakery near Byron Bay',
  'quiet farm stay in Tasmania',
  'galleries in Hobart',
]

// Cross-fade through the example queries while the field is empty. Honours
// prefers-reduced-motion (instant swap, no opacity animation).
function useRoller(examples, active) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!active || examples.length < 2) return
    if (reduceMotion) {
      const id = setInterval(() => setIdx(i => (i + 1) % examples.length), ROLL_MS)
      return () => clearInterval(id)
    }
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % examples.length)
        setVisible(true)
      }, FADE_MS)
    }, ROLL_MS)
    return () => clearInterval(id)
  }, [active, examples.length, reduceMotion])

  return { text: examples[idx] || examples[0], visible: reduceMotion ? true : visible }
}

export default function SemanticSearchBar({
  accent = 'var(--accent, #5F8A7E)',
  examples = DEFAULT_EXAMPLES,
  searchPath = '/search',
  onResults,
  onLoading,
  placeholder,
}) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [focused, setFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const router = useRouter()

  const roller = useRoller(examples, !query && !focused)

  // The moment the typed text reads as a plain-language request (a gift, an
  // occasion, "somewhere to take mum") the bar offers to ANSWER it rather than
  // match names — the concierge lives on the results page, so an inquiry always
  // navigates there (even in inline/onResults mode).
  const inquiry = query.trim().length >= 8 && isInquiryQuery(query.trim())

  const executeSearch = useCallback(async (q) => {
    const term = q.trim()
    if (!term) return
    setIsLoading(true)
    setError(null)
    onLoading?.(true)
    try {
      if (onResults && !isInquiryQuery(term)) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        const items = data.venues || data.listings || data.shops || data.places ||
          data.properties || data.operators || data.results || []
        onResults(items, data.meta || null)
      } else {
        router.push(`${searchPath}?q=${encodeURIComponent(term)}`)
      }
    } catch (err) {
      console.error('[SemanticSearchBar]', err)
      setError('Search unavailable — try again')
    } finally {
      setIsLoading(false)
      onLoading?.(false)
    }
  }, [onResults, onLoading, router, searchPath])

  function handleSubmit(e) {
    e.preventDefault()
    setShowSuggestions(false)
    executeSearch(query)
  }

  function handleSuggestion(s) {
    setQuery(s)
    setShowSuggestions(false)
    executeSearch(s)
  }

  // Roller is shown only over a truly empty, unfocused field.
  const showRoller = !query && !focused && examples.length > 0

  return (
    <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 10 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg, #fff)',
          border: `1px solid ${focused ? accent : 'var(--border, #e3ddd1)'}`,
          borderRadius: 16,
          padding: '0 8px 0 18px',
          height: 60,
          boxShadow: focused
            ? `0 0 0 3px color-mix(in srgb, ${accent} 18%, transparent), 0 6px 22px rgba(0,0,0,0.07)`
            : '0 2px 10px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        }}
      >
        {/* Search / loading icon */}
        <span style={{ display: 'flex', alignItems: 'center', color: accent, flexShrink: 0 }}>
          {isLoading ? (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
              </path>
            </svg>
          ) : (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </span>

        {/* Input + animated placeholder overlay */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null) }}
            onFocus={() => { setFocused(true); setShowSuggestions(true) }}
            onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur() } }}
            placeholder={showRoller ? '' : (placeholder || 'Search…')}
            autoComplete="off" autoCorrect="off" spellCheck="false"
            aria-label="Search"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              padding: '14px 0', fontSize: 16, color: 'var(--text, #2a2218)',
              fontFamily: 'var(--font-sans, inherit)', fontWeight: 300, minWidth: 0,
            }}
          />
          {showRoller && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', maxWidth: '100%',
                fontFamily: 'var(--font-sans, inherit)', fontWeight: 300, fontSize: 16,
                color: 'var(--text-2, #8a7d6b)',
                opacity: roller.visible ? 0.65 : 0,
                transition: `opacity ${FADE_MS}ms ease`,
              }}
            >
              {roller.text.startsWith('Try') ? roller.text : `Try “${roller.text}”`}
            </span>
          )}
        </div>

        {/* Clear */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setError(null); onResults?.(null, null); inputRef.current?.focus() }}
            aria-label="Clear search"
            style={{
              padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-2, #8a7d6b)', display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          style={{
            flexShrink: 0, borderRadius: 999, border: 'none',
            padding: '11px 22px', fontFamily: 'var(--font-sans, inherit)', fontWeight: 600,
            fontSize: 14, letterSpacing: '0.01em',
            background: query.trim() ? accent : 'color-mix(in srgb, var(--text-2, #8a7d6b) 18%, transparent)',
            color: query.trim() ? '#fff' : 'var(--text-2, #8a7d6b)',
            cursor: query.trim() ? 'pointer' : 'default',
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { if (query.trim()) e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Search
        </button>
      </form>

      {error && (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--error, #c0392b)', paddingLeft: 4 }}>{error}</p>
      )}

      {/* Inquiry mode — offer to answer the request instead of name-matching. */}
      {showSuggestions && inquiry && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg, #fff)', border: '1px solid var(--border, #e3ddd1)',
          borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.10)', overflow: 'hidden', zIndex: 100,
        }}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowSuggestions(false); executeSearch(query) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
              padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
              borderRadius: 9, flexShrink: 0, background: 'var(--bg-2, #f5f0e8)', color: accent,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-sans, inherit)', fontWeight: 700, fontSize: 14, color: 'var(--text, #2a2218)' }}>Ask the Atlas</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-sans, inherit)', fontWeight: 300, fontSize: 12.5, color: 'var(--text-2, #8a7d6b)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Get recommendations for “{query.trim()}”</span>
            </span>
            <span style={{ color: accent, fontSize: 18, flexShrink: 0 }} aria-hidden="true">&rarr;</span>
          </button>
          <div style={{ padding: '9px 16px', borderTop: '1px solid var(--border, #e3ddd1)', background: 'var(--bg-2, #f5f0e8)', fontFamily: 'var(--font-sans, inherit)', fontWeight: 300, fontSize: 11.5, color: 'var(--text-2, #8a7d6b)' }}>
            Reads like a question, so we&apos;ll answer it — not just match names.
          </div>
        </div>
      )}

      {/* Example-query suggestions (focus, empty field) */}
      {showSuggestions && !query && examples.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg, #fff)', border: '1px solid var(--border, #e3ddd1)',
          borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.10)', overflow: 'hidden', zIndex: 100,
        }}>
          <p style={{
            margin: 0, padding: '10px 16px 6px', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-2, #8a7d6b)',
            fontFamily: 'var(--font-sans, inherit)',
          }}>
            Try searching for
          </p>
          {examples.map((s) => (
            <button
              key={s} type="button" onMouseDown={() => handleSuggestion(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                color: 'var(--text, #2a2218)', fontFamily: 'var(--font-sans, inherit)', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-2, #f5f0e8)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ color: accent, marginRight: 8 }}>&rarr;</span>{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
