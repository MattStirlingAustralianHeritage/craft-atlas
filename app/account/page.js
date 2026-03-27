'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function AccountPageInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  const [user, setUser] = useState(null)
  const [venues, setVenues] = useState([])
  const [trails, setTrails] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabParam === 'trails' ? 'trails' : 'venues')

  useEffect(() => {
    const supabase = getSupabase()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const [{ data: favData }, { data: trailData }] = await Promise.all([
          supabase
            .from('favourites')
            .select('id, created_at, venues(id, name, slug, sub_region, state, type, description)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('user_trails')
            .select('id, name, description, visibility, short_code, created_at, user_trail_venues(count)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])
        setVenues(favData?.map(f => f.venues).filter(Boolean) ?? [])
        setTrails(trailData ?? [])
      }

      setLoading(false)
    }

    load()
  }, [])

  async function removeFavourite(venueId) {
    const supabase = getSupabase()
    await supabase.from('favourites').delete().eq('user_id', user.id).eq('venue_id', venueId)
    setVenues(prev => prev.filter(v => v.id !== venueId))
  }

  async function deleteTrail(trailId) {
    if (!confirm('Delete this trail? This cannot be undone.')) return
    const supabase = getSupabase()
    await supabase.from('user_trail_venues').delete().eq('trail_id', trailId)
    await supabase.from('user_trails').delete().eq('id', trailId)
    setTrails(prev => prev.filter(t => t.id !== trailId))
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ height: 32, background: 'var(--bg-2)', borderRadius: 4, width: 200, marginBottom: 12 }} />
        <div style={{ height: 16, background: 'var(--bg-2)', borderRadius: 4, width: 280 }} />
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>♡</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>
          Your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 32, fontFamily: 'var(--font-sans)' }}>
          Sign in to save venues and build trails.
        </p>
        <Link href="/" style={{
          display: 'inline-block', background: 'var(--amber)', color: '#fff',
          padding: '12px 28px', borderRadius: 2, fontSize: 12, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          fontFamily: 'var(--font-sans)',
        }}>
          Browse venues
        </Link>
      </main>
    )
  }

  const tabStyle = (tab) => ({
    padding: '8px 0',
    marginRight: 24,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    color: activeTab === tab ? 'var(--text)' : 'var(--text-3)',
    borderBottom: activeTab === tab ? '2px solid var(--amber)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--amber)' : '2px solid transparent',
    cursor: 'pointer',
  })

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: 'var(--text)', marginBottom: 6 }}>
          My account
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
          {user.email}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        <button style={tabStyle('venues')} onClick={() => setActiveTab('venues')}>
          Saved venues {venues.length > 0 && `(${venues.length})`}
        </button>
        <button style={tabStyle('trails')} onClick={() => setActiveTab('trails')}>
          My trails {trails.length > 0 && `(${trails.length})`}
        </button>
      </div>

      {/* Saved Venues Tab */}
      {activeTab === 'venues' && (
        <>
          {venues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', border: '2px dashed var(--border)', borderRadius: 4 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>♡</div>
              <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>
                Hit the Save button on any venue to save it here.
              </p>
              <Link href="/explore" style={{ fontSize: 13, color: 'var(--amber)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                Browse venues →
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {venues.map(venue => (
                <li key={venue.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/venue/${venue.slug}`} style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
                      {venue.name}
                    </Link>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>
                      {venue.type} · {venue.sub_region || venue.state}
                    </p>
                    {venue.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {venue.description}
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeFavourite(venue.id)} title="Remove from saved" style={{ flexShrink: 0, background: 'none', border: 'none', fontSize: 20, color: 'var(--text-3)', cursor: 'pointer', lineHeight: 1, padding: 4, marginTop: 2 }}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* My Trails Tab */}
      {activeTab === 'trails' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <Link href="/trails/builder" style={{ display: 'inline-block', padding: '9px 18px', background: 'var(--amber)', color: 'var(--bg)', textDecoration: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
              + New trail
            </Link>
          </div>

          {trails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', border: '2px dashed var(--border)', borderRadius: 4 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗺</div>
              <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 20 }}>
                You haven't built any trails yet.
              </p>
              <Link href="/trails/builder" style={{ fontSize: 13, color: 'var(--amber)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                Build your first trail →
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {trails.map(trail => {
                const stopCount = trail.user_trail_venues?.[0]?.count ?? 0
                return (
                  <li key={trail.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
                          {trail.name}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>
                          {stopCount} stop{stopCount !== 1 ? 's' : ''} · {trail.visibility === 'private' ? 'Private' : trail.visibility === 'link' ? 'Link only' : 'Public'}
                        </p>
                        {trail.description && (
                          <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: '0 0 12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {trail.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <Link href={`/trails/builder?id=${trail.id}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
                            Edit
                          </Link>
                          {trail.visibility !== 'private' && trail.short_code && (
                            <>
                              <a href={`/t/${trail.short_code}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--amber)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
                                View →
                              </a>
                              <button
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/t/${trail.short_code}`) }}
                                style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
                              >
                                Copy link
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteTrail(trail.id)} title="Delete trail" style={{ flexShrink: 0, background: 'none', border: 'none', fontSize: 20, color: 'var(--text-3)', cursor: 'pointer', lineHeight: 1, padding: 4, marginTop: 2 }}>
                        ×
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ height: 32, background: 'var(--bg-2)', borderRadius: 4, width: 200, marginBottom: 12 }} />
      </main>
    }>
      <AccountPageInner />
    </Suspense>
  )
}
