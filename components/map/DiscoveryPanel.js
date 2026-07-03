'use client'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/constants'
import { isApprovedImageSource } from '@/lib/image-utils'

// One gazetteer row. Craft's dataset carries hero images inconsistently (a
// claimed/standard perk), so rows are typographic by default — craft-colour
// rail, serif name, set-small meta — and a thumbnail appears only when a
// listing actually has an approved image. Everything a row needs already
// rides in the /api/listings payload, so there is no lazy meta hydration.
function PanelRow({ l, active, visited, onHover, onSelect }) {
  const color = TYPE_COLORS[l.category] || 'var(--primary)'
  const metaLine = [
    TYPE_LABELS[l.category] || l.category,
    [l.suburb || l.sub_region, l.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(' · ')
  const image = l.hero_image_url && isApprovedImageSource(l.hero_image_url) ? l.hero_image_url : null

  return (
    <button
      onMouseEnter={() => onHover(l.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(l)}
      aria-pressed={active}
      className="map-panel-row"
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0, width: '100%', textAlign: 'left',
        background: active ? 'rgba(193,96,58,0.10)' : 'transparent',
        border: 'none', borderBottom: '1px solid rgba(30,26,23,0.07)',
        padding: 0, cursor: 'pointer',
      }}
    >
      <span style={{ width: 3, flexShrink: 0, background: color, opacity: active ? 1 : 0.75 }} />
      <span style={{ flex: 1, minWidth: 0, padding: '10px 12px 11px' }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontSize: 14.5, lineHeight: 1.25, color: visited ? 'var(--text-2)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{l.name}</span>
        </span>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {metaLine}
        </span>
        {l.description && (
          <span style={{ display: 'block', fontSize: 11.5, lineHeight: 1.45, color: 'var(--text-2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {l.description}
          </span>
        )}
      </span>
      {image && (
        <span style={{ width: 62, alignSelf: 'center', flexShrink: 0, marginRight: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" loading="lazy" decoding="async"
            style={{ width: 62, height: 50, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
        </span>
      )}
    </button>
  )
}

/**
 * The gazetteer — a viewport-synced index of what's on the map.
 *
 * mode 'panel': the desktop left rail (fills its absolute container).
 * mode 'sheet': content of the mobile full-height list sheet.
 */
export default function DiscoveryPanel({
  mode = 'panel',
  items,
  totalInView,
  totalAll,
  loading,
  selectedId,
  visitedIds,
  filterQuery = '',
  onFilterQuery,
  filterBusy = false,
  onHover,
  onSelect,
  onClose,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: mode === 'sheet' ? '4px 16px 10px' : '12px 15px 10px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div role="status">
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15.5, color: 'var(--text)' }}>
              {loading ? 'Reading the atlas…' : filterBusy ? 'Searching the atlas…' : `${totalInView.toLocaleString()} ${totalInView === 1 ? 'maker' : 'makers'} in view`}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 1 }}>
              {loading || filterBusy ? '' : `of ${totalAll.toLocaleString()} across Australia — move the map to explore`}
            </div>
          </div>
          {mode === 'sheet' && (
            <button onClick={onClose} aria-label="Close list" style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Smart filter — matches keep colour on the map, the rest grey out.
            Desktop renders this as a floating bar over the map instead (see
            MapClient's SmartMapFilter), so the in-panel field is sheet-only. */}
        {onFilterQuery && mode === 'sheet' && (
          <div style={{ position: 'relative', marginTop: 9 }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }} aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
            </span>
            <input
              type="text"
              inputMode="search"
              value={filterQuery}
              onChange={e => onFilterQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') onFilterQuery('') }}
              placeholder="Filter the map — try ‘potters’ or ‘Daylesford’"
              aria-label="Filter the map by keyword"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '7px 30px 7px 27px',
                background: '#fff', border: `1px solid ${filterQuery ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 7, fontSize: 12, color: 'var(--text)', outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {filterBusy ? (
              <span aria-label="Searching" title="Smart search running…" style={{
                position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                width: 13, height: 13, borderRadius: '50%',
                border: '2px solid rgba(193,96,58,0.28)', borderTopColor: 'var(--primary)',
                animation: 'dp-spin 0.7s linear infinite',
              }} />
            ) : filterQuery ? (
              <button onClick={() => onFilterQuery('')} aria-label="Clear filter" style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            ) : null}
          </div>
        )}
        {onFilterQuery && mode === 'sheet' && filterQuery && (
          <div style={{ fontSize: 9.5, color: 'var(--text-2)', marginTop: 5, letterSpacing: '0.02em' }}>
            {filterBusy ? 'Searching meaning, not just words…' : 'Matches stay in colour · the rest fade back'}
          </div>
        )}
        <style>{`@keyframes dp-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain' }}>
        {/* While the semantic pass is still in flight, don't flash a
            "nothing matches" state — the results may be about to arrive. */}
        {!loading && items.length === 0 && !filterBusy && (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
              {filterQuery ? `Nothing here matches “${filterQuery}”` : 'Nothing in view'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {filterQuery ? 'Try a different word, zoom out, or clear the filter.' : 'Zoom out, or move the map toward a town — the list follows the map.'}
            </div>
            {filterQuery && onFilterQuery && (
              <button onClick={() => onFilterQuery('')} style={{
                marginTop: 12, padding: '7px 16px', background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)',
              }}>
                Clear filter
              </button>
            )}
          </div>
        )}
        {items.map(l => (
          <PanelRow
            key={l.id}
            l={l}
            active={selectedId === l.id}
            visited={visitedIds?.has(l.id)}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
        {!loading && totalInView > items.length && (
          <div style={{ padding: '12px 15px 18px', fontSize: 10.5, color: 'var(--text-2)', textAlign: 'center' }}>
            Showing the first {items.length} — zoom in to narrow the view
          </div>
        )}
      </div>
    </div>
  )
}
