'use client'

// components/SemanticSearchBar.jsx
// Natural language search bar for SBA main page.
// Sits above the map as primary entry point.
// Passes Mapbox bounds with each request so the API can
// return majorityInBounds — client uses this to decide
// whether to filter in place or navigate to /search.

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const DEBOUNCE_MS = 300

const SUGGESTIONS = [
  'wild ferment wines in the Yarra Valley',
  'dog-friendly urban breweries Melbourne',
  'barrel-aged spirits cellar door',
  'destination cidery regional NSW',
  'natural wine producers South Australia',
]

export default function SemanticSearchBar({ mapRef, onResults, onLoading }) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceTimer = useRef(null)
  const inputRef = useRef(null)
  const router = useRouter()

  // Get current Mapbox bounds as "swLng,swLat,neLng,neLat"
  const getBoundsParam = useCallback(() => {
    try {
      const map = mapRef?.current
      if (!map) return null
      const bounds = map.getBounds()
      if (!bounds) return null
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`
    } catch {
      return null
    }
  }, [mapRef])

  const executeSearch = useCallback(async (q) => {
    if (!q.trim()) return

    setIsLoading(true)
    setError(null)
    onLoading?.(true)

    try {
      const boundsParam = getBoundsParam()
      const params = new URLSearchParams({ q: q.trim() })
      if (boundsParam) params.set('bounds', boundsParam)

      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      const { venues, meta } = data

      if (onResults) {
        onResults(venues, meta)
      } else {
        const searchParams = new URLSearchParams({ q: q.trim() })
        if (meta.parsed) {
          searchParams.set('filters', JSON.stringify(meta.parsed))
        }
        router.push(`/search?${searchParams}`)
      }
    } catch (err) {
      console.error('[SemanticSearchBar]', err)
      setError('Search unavailable — try again')
    } finally {
      setIsLoading(false)
      onLoading?.(false)
    }
  }, [getBoundsParam, onResults, router])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setError(null)

    // Debounce — don't fire on every keystroke
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    // (intentionally not auto-firing search on type — wait for submit)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setShowSuggestions(false)
    executeSearch(query)
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    executeSearch(suggestion)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div style={{
      width: '100%',
      position: 'relative',
      zIndex: 10,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          background: 'var(--bg)',
          border: '1.5px solid var(--border, #e0d8cc)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 16px rgba(184,134,43,0.15)'
          e.currentTarget.style.borderColor = 'var(--amber, #b8862b)'
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
            e.currentTarget.style.borderColor = 'var(--border, #e0d8cc)'
            setTimeout(() => setShowSuggestions(false), 150)
          }
        }}
      >
        {/* Search icon */}
        <div style={{
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          color: isLoading ? 'var(--amber, #b8862b)' : 'var(--text-muted, #8a7d6b)',
          flexShrink: 0,
        }}>
          {isLoading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
              </path>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search by vibe, method, region… try 'wild ferment wines Yarra Valley'"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '14px 0',
            fontSize: '15px',
            color: 'var(--text, #2a2218)',
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setError(null)
              onResults?.(null, null)
              inputRef.current?.focus()
            }}
            style={{
              padding: '0 10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #8a7d6b)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          style={{
            padding: '12px 20px',
            background: query.trim() ? 'var(--amber, #b8862b)' : 'var(--bg-muted, #f5f0e8)',
            border: 'none',
            borderLeft: '1.5px solid var(--border, #e0d8cc)',
            color: query.trim() ? '#fff' : 'var(--text-muted, #8a7d6b)',
            cursor: query.trim() ? 'pointer' : 'default',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'inherit',
            flexShrink: 0,
            transition: 'background 0.15s ease, color 0.15s ease',
            letterSpacing: '0.02em',
          }}
        >
          Search
        </button>
      </form>

      {/* Error message */}
      {error && (
        <p style={{
          margin: '6px 0 0',
          fontSize: '13px',
          color: 'var(--error, #c0392b)',
          paddingLeft: '4px',
        }}>
          {error}
        </p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && !query && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--bg)',
          border: '1.5px solid var(--border, #e0d8cc)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          overflow: 'hidden',
          zIndex: 100,
        }}>
          <p style={{
            margin: 0,
            padding: '10px 16px 6px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted, #8a7d6b)',
          }}>
            Try searching for
          </p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => handleSuggestionClick(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text, #2a2218)',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted, #f5f0e8)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ color: 'var(--amber, #b8862b)', marginRight: '8px' }}>→</span>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
