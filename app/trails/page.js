import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import BuildTrailButton from '@/components/BuildTrailButton'
import TypographicCard from '@/components/TypographicCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Maker Trails | Craft Atlas',
  description: 'Curated Australian maker trails across Australia.',
}

export default async function TrailsPage() {
  const supabase = await createServerSupabase()

  const { data: trails } = await supabase
    .from('trails')
    .select('id,name,slug,description,hero_image_url,curator_name,region,trail_venues(count)')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const { data: communityTrails } = await supabase
    .from('user_trails')
    .select('id,name,short_code,description,visibility,created_at,user_trail_venues(count)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(12)

  const { data: { user } } = await supabase.auth.getUser()
  let myTrails = null
  if (user) {
    const { data } = await supabase
      .from('user_trails')
      .select('id,name,short_code,description,visibility,created_at,user_trail_venues(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    myTrails = data
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 12, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Maker Trails</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--text)', marginBottom: 12, lineHeight: 1.2 }}>Curated routes worth following</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, maxWidth: 480, fontFamily: 'var(--font-sans)' }}>Editorially curated trails connecting Australia's best craft makers.</p>
        </div>
      </div>

      {/* My Trails — logged in users only */}
      {myTrails && myTrails.length > 0 && (
        <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 4 }}>My Trails</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{myTrails.length} trail{myTrails.length !== 1 ? 's' : ''} saved to your account</p>
              </div>
              <Link href="/trails/builder" style={{ display: 'inline-block', padding: '9px 18px', background: 'var(--primary)', color: 'var(--bg)', textDecoration: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
                + New trail
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {myTrails.map(trail => {
                const stopCount = trail.user_trail_venues?.[0]?.count ?? 0
                const visibilityLabel = { private: 'Private', link: 'Link only', public: 'Public' }[trail.visibility] ?? trail.visibility
                const visibilityColor = { private: 'var(--text-3)', link: '#7a6c5a', public: '#4a7c59' }[trail.visibility] ?? 'var(--text-3)'
                return (
                  <div key={trail.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      {trail.short_code ? (
                        <Link href={`/t/${trail.short_code}`} style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)', lineHeight: 1.3, flex: 1, textDecoration: 'none' }}>
                          {trail.name}
                        </Link>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)', lineHeight: 1.3, flex: 1 }}>{trail.name}</span>
                      )}
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: visibilityColor, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', marginTop: 2 }}>{visibilityLabel}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{stopCount} stop{stopCount !== 1 ? 's' : ''}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <Link href={`/trails/builder?id=${trail.id}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>Edit</Link>
                      {trail.short_code && (
                        <>
                          <span style={{ color: 'var(--border)', fontSize: 11 }}>·</span>
                          <Link href={`/t/${trail.short_code}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>View</Link>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CTA for logged-in users with no trails */}
      {myTrails && myTrails.length === 0 && (
        <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>You haven't built any trails yet.</p>
            <Link href="/trails/builder" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>Build your first trail →</Link>
          </div>
        </div>
      )}

      {/* Editorial Trails */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 4 }}>Editorial Trails</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{(trails || []).length} curated trail{(trails || []).length !== 1 ? 's' : ''}</p>
        </div>
        {!myTrails && (
          <BuildTrailButton style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--primary)', color: 'var(--bg)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', borderRadius: 2 }}>
            Build your own trail →
          </BuildTrailButton>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
        {(!trails || trails.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>No trails yet — check back soon.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {trails.map((trail) => <TrailCard key={trail.id} trail={trail} />)}
          </div>
        )}
      </div>

      {/* Community Trails */}
      {communityTrails && communityTrails.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 4 }}>Community Trails</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Built by readers</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {communityTrails.map(trail => {
              const stopCount = trail.user_trail_venues?.[0]?.count ?? 0
              return (
                <Link key={trail.id} href={`/t/${trail.short_code}`} style={{ textDecoration: 'none', display: 'block', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{trail.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{stopCount} stop{stopCount !== 1 ? 's' : ''}</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {!communityTrails?.length && <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }} />}
    </div>
  )
}

function TrailCard({ trail }) {
  const stopCount = trail.trail_venues?.[0]?.count ?? 0
  return (
    <Link href={`/trails/${trail.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', transition: 'border-color 0.2s' }}>
        <TypographicCard name={trail.name} vertical="craft" category={trail.region} aspectRatio="16/9" imageUrl={trail.hero_image_url} />
        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {trail.region && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>{trail.region}</span>}
            {trail.region && <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>}
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{stopCount} {stopCount === 1 ? 'stop' : 'stops'}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{trail.name}</h2>
          {trail.description && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, fontFamily: 'var(--font-sans)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{trail.description}</p>}
          {trail.curator_name && <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Curated by {trail.curator_name}</p>}
        </div>
      </div>
    </Link>
  )
}
