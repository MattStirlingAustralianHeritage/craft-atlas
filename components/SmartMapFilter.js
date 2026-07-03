'use client'
// ── Floating smart map filter (Craft Atlas port) ──
//
// The hero filter, centred over the map so it's reachable without hunting the
// sidebar. A verbatim port of the Australian Atlas PORTAL's floating smart
// filter (MapClient ~1787-1858): same wrapper positioning (bottom: 30, left
// tracks the panel, click-through wrapper, `min(520px, 100%)` pill, blur +
// glow), same input, same status cluster (spinner while resolving → count
// chip once known → clear button), same mobile behaviour (the desktop pill is
// hidden on mobile via `map-desktop-toolbar`).
//
// The one visual substitution: the portal's sage accent (#5f8a7e) becomes this
// vertical's terracotta accent (#C1603A / var(--primary)), so the pill reads as
// Craft while keeping the portal's exact geometry and behaviour.

const ACCENT = '#C1603A'          // Craft terracotta (portal used sage #5f8a7e)
const ACCENT_SOFT = 'rgba(193,96,58,0.14)'
const ACCENT_RING = 'rgba(193,96,58,0.09)'
const ACCENT_BORDER = 'rgba(193,96,58,0.5)'
const NO_MATCH_BG = 'rgba(196,96,58,0.12)'
const NO_MATCH_FG = '#B4552E'

/**
 * @param {string}   pinQuery      current keystroke value
 * @param {function} setPinQuery   setter
 * @param {boolean}  filterActive  a debounced query is present
 * @param {boolean}  filterBusy    still settling / semantic in flight
 * @param {number}   count         live match count (matched pins)
 * @param {boolean}  panelOpen     desktop discovery panel open (shifts left edge)
 * @param {number}   panelW        panel width in px
 */
export default function SmartMapFilter({
  pinQuery,
  setPinQuery,
  filterActive,
  filterBusy,
  count,
  panelOpen,
  panelW = 384,
}) {
  return (
    <div className="map-desktop-toolbar" style={{
      position: 'absolute', bottom: 30, left: panelOpen ? panelW : 0, right: 0, zIndex: 12,
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', transition: 'left 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
      padding: '0 88px',
    }}>
      <div style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 9,
        width: 'min(520px, 100%)', boxSizing: 'border-box',
        background: 'rgba(251,249,244,0.94)', backdropFilter: 'blur(14px) saturate(1.2)',
        border: `1px solid ${filterActive ? ACCENT_BORDER : 'rgba(28,26,23,0.1)'}`,
        borderRadius: 999, padding: '8px 10px 8px 16px',
        boxShadow: filterActive
          ? `0 12px 34px rgba(28,26,23,0.18), 0 0 0 4px ${ACCENT_RING}`
          : '0 12px 34px rgba(28,26,23,0.16)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={filterActive ? ACCENT : 'var(--text-2)'} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transition: 'stroke 0.2s' }} aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <input
          type="text"
          value={pinQuery}
          onChange={e => setPinQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setPinQuery('') }}
          placeholder="Filter the map — try ‘potters in Daylesford’"
          aria-label="Filter the map by keyword"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)', letterSpacing: '0.005em',
          }}
        />
        {/* Status cluster: spinner while resolving; a terracotta count chip once
            matches are known; a clear button always available with a query. */}
        {filterBusy && (
          <span aria-label="Searching" title="Searching the atlas…" style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(193,96,58,0.28)', borderTopColor: ACCENT,
            animation: 'map-spin 0.7s linear infinite',
          }} />
        )}
        {filterActive && !filterBusy && (
          <span style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center',
            height: 24, padding: '0 10px', borderRadius: 999,
            background: count > 0 ? ACCENT_SOFT : NO_MATCH_BG,
            color: count > 0 ? ACCENT : NO_MATCH_FG,
            fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}>
            {count > 0 ? `${count.toLocaleString()} ${count === 1 ? 'match' : 'matches'}` : 'No matches'}
          </span>
        )}
        {pinQuery && (
          <button onClick={() => setPinQuery('')} aria-label="Clear filter" style={{
            flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(28,26,23,0.06)', color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
