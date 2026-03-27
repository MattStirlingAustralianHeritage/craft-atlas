'use client'

import { useRouter } from 'next/navigation'

export default function ExploreFilters({ types, states, activeType, activeState }) {
  const router = useRouter()

  function updateFilter(key, value) {
    const params = new URLSearchParams()
    if (key === 'type' && value) params.set('type', value)
    else if (activeType) params.set('type', activeType)

    if (key === 'state' && value) params.set('state', value)
    else if (activeState) params.set('state', activeState)

    // Remove the one being cleared
    if (!value) params.delete(key)

    router.push(`/explore${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {/* Type filter */}
      <select
        value={activeType || ''}
        onChange={(e) => updateFilter('type', e.target.value)}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid var(--brand-border)',
          background: '#fff',
          fontSize: 14,
          color: 'var(--brand-text)',
          cursor: 'pointer',
        }}
      >
        <option value="">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>

      {/* State filter */}
      <select
        value={activeState || ''}
        onChange={(e) => updateFilter('state', e.target.value)}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid var(--brand-border)',
          background: '#fff',
          fontSize: 14,
          color: 'var(--brand-text)',
          cursor: 'pointer',
        }}
      >
        <option value="">All States</option>
        {states.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Clear filters */}
      {(activeType || activeState) && (
        <button
          onClick={() => router.push('/explore')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid var(--brand-border)',
            background: 'transparent',
            fontSize: 14,
            color: 'var(--brand-muted)',
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
