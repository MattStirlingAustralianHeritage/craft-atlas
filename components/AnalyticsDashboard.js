'use client'
import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'

const PERIODS = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: null },
]

function getDateRange(days) {
  if (days === null) return null
  if (days === 0) { const t = new Date(); t.setHours(0,0,0,0); return t.toISOString() }
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString()
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState(1)
  const [stats, setStats] = useState(null)
  const [topPages, setTopPages] = useState([])
  const [recentViews, setRecentViews] = useState([])
  const [dailyCounts, setDailyCounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAnalytics() }, [period])

  async function fetchAnalytics() {
    setLoading(true)
    const since = getDateRange(PERIODS[period].days)
    const supabase = getSupabase()
    let query = supabase.from('page_views').select('*').not('user_agent', 'ilike', '%vercel-screenshot%').not('user_agent', 'eq', 'manual-test').order('created_at', { ascending: false })
    if (since) query = query.gte('created_at', since)
    const { data: views, error } = await query.limit(10000)
    if (error || !views) { setLoading(false); return }

    const totalViews = views.length
    const uniqueAgents = new Set(views.map(v => v.user_agent)).size
    const pageCounts = {}; views.forEach(v => { pageCounts[v.path] = (pageCounts[v.path] || 0) + 1 })
    const sorted = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => ({ path, count }))
    const refCounts = {}; views.forEach(v => { if (v.referrer) { try { const host = new URL(v.referrer).hostname; refCounts[host] = (refCounts[host] || 0) + 1 } catch {} } })
    const topRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, count]) => ({ source, count }))
    const daily = {}; views.forEach(v => { const day = v.created_at.slice(0, 10); daily[day] = (daily[day] || 0) + 1 })
    const dailyArr = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }))
    const devices = { desktop: 0, mobile: 0, tablet: 0 }
    views.forEach(v => { const ua = (v.user_agent || '').toLowerCase(); if (ua.includes('ipad') || ua.includes('tablet')) devices.tablet++; else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) devices.mobile++; else devices.desktop++ })

    setStats({ totalViews, uniqueAgents, topRefs, devices })
    setTopPages(sorted)
    setDailyCounts(dailyArr)
    setRecentViews(views.slice(0, 15))
    setLoading(false)
  }

  const maxDaily = Math.max(...dailyCounts.map(d => d.count), 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriod(i)} style={{ padding: '8px 16px', border: period === i ? '2px solid var(--amber)' : '1px solid var(--border)', borderRadius: 2, background: period === i ? 'rgba(200,148,58,0.1)' : 'transparent', color: period === i ? 'var(--amber)' : 'var(--text-2)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{p.label}</button>
        ))}
      </div>

      {loading ? <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading analytics...</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Page Views" value={stats?.totalViews || 0} />
            <StatCard label="Unique Visitors" value={stats?.uniqueAgents || 0} subtitle="(approx)" />
            <StatCard label="Desktop" value={stats?.devices?.desktop || 0} />
            <StatCard label="Mobile" value={stats?.devices?.mobile || 0} />
          </div>

          {dailyCounts.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Daily Views</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, padding: '0 0 20px 0', position: 'relative' }}>
                {dailyCounts.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div style={{ width: '100%', maxWidth: 40, height: Math.max((d.count / maxDaily) * 100, 2), background: 'var(--amber)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`${d.date}: ${d.count} views`} />
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 4, whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>{d.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Top Pages</div>
              {topPages.map(p => (
                <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{p.path}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', minWidth: 40, textAlign: 'right' }}>{p.count}</div>
                </div>
              ))}
              {topPages.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Top Referrers</div>
              {stats?.topRefs?.map(r => (
                <div key={r.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{r.source}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', minWidth: 40, textAlign: 'right' }}>{r.count}</div>
                </div>
              ))}
              {(!stats?.topRefs || stats.topRefs.length === 0) && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No referrer data yet</div>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Recent Views</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', color: 'var(--text-3)', fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Path</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-3)', fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Referrer</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-3)', fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Device</th>
                    <th style={{ textAlign: 'right', padding: '8px 0 8px 12px', color: 'var(--text-3)', fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentViews.map(v => {
                    const ua = (v.user_agent || '').toLowerCase()
                    const device = ua.includes('iphone') || ua.includes('android') ? '📱' : ua.includes('ipad') ? '📋' : '🖥️'
                    const time = new Date(v.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    let ref = ''; if (v.referrer) { try { ref = new URL(v.referrer).hostname } catch { ref = v.referrer } }
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px 8px 0', color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.path}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{ref || '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{device}</td>
                        <td style={{ padding: '8px 0 8px 12px', color: 'var(--text-2)', textAlign: 'right', whiteSpace: 'nowrap' }}>{time}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, subtitle }) {
  return (
    <div style={{ padding: 20, background: 'rgba(240,235,227,0.5)', border: '1px solid var(--border)', borderRadius: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value.toLocaleString()}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}
