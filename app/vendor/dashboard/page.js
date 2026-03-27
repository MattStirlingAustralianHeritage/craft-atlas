'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '../layout'

const TIER_INFO = {
  free:     { name: 'Free',     price: 'Free',     color: '#9a8a78' },
  basic:    { name: 'Free',     price: 'Free',     color: '#9a8a78' },
  standard: { name: 'Standard', price: '$99/yr',  color: '#4a7c59' },
  premium:  { name: 'Premium',  price: '$499/yr',  color: '#b8860b' },
}

const STATUS_COLORS = {
  pending:  '#c8943a',
  approved: '#4a7c59',
  rejected: '#8b4a4a',
}

const TYPE_EMOJI = {
  distillery: '🥃',
  brewery:    '🍺',
  winery:     '🍷',
  cidery:     '🍎',
  meadery:    '🍯',
  default:    '🏭',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompletenessRing({ pct }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#4a7c59' : pct >= 50 ? '#c8943a' : '#8b4a4a'
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

function StatPill({ label, value, sub, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '18px 20px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: accent || '#fff', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-sans)' }}>{sub}</div>}
    </div>
  )
}

function VenueHeroCard({ venue, pageViews, tierInfo, isFreeTier, currentTier, onEdit }) {
  const checks = [
    { label: 'Description',    done: !!venue.description?.trim() },
    { label: 'Hero image',     done: !!venue.hero_image_url },
    { label: 'Phone',          done: !!venue.phone?.trim() },
    { label: 'Opening hours',  done: !!(venue.cellar_door_hours && Object.keys(venue.cellar_door_hours).length > 0) },
    { label: '3+ photos',      done: (venue.gallery_images?.length || 0) >= 3 },
    { label: 'Features',       done: (venue.features?.length || 0) >= 3 },
  ]
  const done = checks.filter(c => c.done).length
  const pct  = Math.round((done / checks.length) * 100)
  const missing = checks.filter(c => !c.done)
  const emoji = TYPE_EMOJI[venue.type] || TYPE_EMOJI.default
  const photoCount = (venue.gallery_images?.length || 0) + (venue.hero_image_url ? 1 : 0)

  return (
    <div style={{
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      marginBottom: 16,
    }}>
      {/* Hero image band */}
      <div style={{
        position: 'relative',
        height: 200,
        background: venue.hero_image_url
          ? `linear-gradient(to bottom, rgba(10,8,6,0.2), rgba(10,8,6,0.85)), url(${venue.hero_image_url}) center/cover`
          : 'linear-gradient(135deg, #1a1208 0%, #2a1e0a 50%, #1a1208 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '24px 28px',
      }}>
        {!venue.hero_image_url && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, opacity: 0.15,
          }}>{emoji}</div>
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,148,58,0.9)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 6 }}>
            {venue.type}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, marginBottom: 4 }}>
                {venue.name}
              </h2>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)' }}>
                {venue.sub_region && `${venue.sub_region}, `}{venue.state}
              </div>
            </div>
            <button
              onClick={onEdit}
              style={{
                padding: '10px 22px',
                background: 'var(--amber)',
                color: '#1a1208',
                border: 'none', borderRadius: 3,
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Edit Listing
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip — dark */}
      <div style={{
        background: '#12100c',
        padding: '0 28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <StatPill
          label="Listing views"
          value={pageViews !== null ? (pageViews === 0 ? '—' : pageViews.toLocaleString()) : '…'}
          sub="Last 30 days"
          accent={pageViews > 0 ? 'var(--amber)' : undefined}
        />
        <StatPill
          label="Photos"
          value={photoCount}
          sub={'Unlimited'}
        />
        <StatPill
          label="Features"
          value={venue.features?.length || 0}
          sub="Amenities listed"
        />
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          padding: '18px 20px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 0,
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Plan</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: tierInfo.color, lineHeight: 1.2, marginTop: 4 }}>{tierInfo.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-sans)' }}>{isFreeTier ? 'Upgrade available' : tierInfo.price}</div>
        </div>
      </div>

      {/* Completeness — dark */}
      <div style={{
        background: '#12100c',
        padding: '20px 28px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CompletenessRing pct={pct} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 600, color: '#fff',
            transform: 'rotate(0deg)',
          }}>
            {pct}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
            {pct === 100 ? 'Listing complete ✓' : 'Listing completeness'}
          </div>
          {missing.length > 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
              Still to add: {missing.map((c, i) => (
                <span key={c.label}>
                  <span style={{ color: 'rgba(200,148,58,0.8)' }}>{c.label}</span>
                  {i < missing.length - 1 && <span style={{ margin: '0 4px', opacity: 0.3 }}>·</span>}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#4a7c59', fontFamily: 'var(--font-sans)' }}>Your listing looks great</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [claims, setClaims] = useState([])
  const [venues, setVenues] = useState([])
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingLoading, setBillingLoading] = useState(false)
  const [pageViews, setPageViews] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/vendor/login'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    setLoading(true)
    const supabase = getSupabase()

    const { data: profileData } = await supabase
      .from('vendor_profiles').select('*').eq('user_id', user.id).single()
    if (profileData) setProfile(profileData)

    const { data: claimsData } = await supabase
      .from('claims').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (claimsData) {
      setClaims(claimsData)
      const approvedClaims = claimsData.filter(c => c.status === 'approved' && c.venue_id)
      if (approvedClaims.length > 0) {
        const venueResults = await Promise.all(
          approvedClaims.map(c => supabase.from('venues').select('*').eq('id', c.venue_id).single())
        )
        const venuesData = venueResults.filter(r => r.data).map(r => r.data)
        if (venuesData.length > 0) {
          setVenues(venuesData)
          const preferred = profileData?.venue_id ? venuesData.find(v => v.id === profileData.venue_id) : null
          const activeVenue = preferred || venuesData[0]
          setVenue(activeVenue)
          await fetchPageViews(activeVenue.id, supabase)
        }
      }
    }
    setLoading(false)
  }

  async function fetchPageViews(venueId, supabase) {
    const client = supabase || getSupabase()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count } = await client
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('viewed_at', thirtyDaysAgo.toISOString())
    setPageViews(count || 0)
  }

  async function switchVenue(v) {
    setVenue(v)
    setPageViews(null)
    await fetchPageViews(v.id)
  }

  async function handleManageBilling() {
    if (!profile?.stripe_customer_id) return
    setBillingLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (err) { console.error(err) }
    setBillingLoading(false)
  }

  async function handleUpgrade(tier) {
    if (!venue || !user) return
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id, tier, userId: user.id, email: user.email }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (err) { console.error(err) }
  }

  if (authLoading || loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-3)', marginBottom: 8 }}>Loading</div>
        <div style={{ width: 40, height: 2, background: 'var(--amber)', margin: '0 auto', animation: 'pulse 1.2s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scaleX(0.5)} 50%{opacity:1;transform:scaleX(1)} }`}</style>
      </div>
    </div>
  )

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || profile?.contact_name?.split(' ')[0] || 'there'
  const currentTier = venue?.subscription_tier || venue?.listing_tier || profile?.selected_tier || 'free'
  const isFreeTier = currentTier === 'free' || currentTier === 'basic'
  const tierInfo = TIER_INFO[currentTier] || TIER_INFO.free
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        .venue-pill { transition: all 0.15s; }
        .venue-pill:hover { border-color: var(--amber) !important; color: var(--amber) !important; }
        .quick-link { transition: all 0.2s; }
        .quick-link:hover { border-color: rgba(200,148,58,0.4) !important; transform: translateY(-1px); }
        .upgrade-btn { transition: opacity 0.15s; }
        .upgrade-btn:hover { opacity: 0.88 !important; }
        @media (max-width: 600px) {
          .stats-strip { grid-template-columns: 1fr 1fr !important; }
          .upgrade-grid { grid-template-columns: 1fr !important; }
          .quick-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '48px 0 40px', borderBottom: '1px solid var(--border)', marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 10, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Vendor Dashboard
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.15 }}>
              {greeting}, {userName}.
            </h1>
          </div>
          {venue && (
            <Link href={`/venue/${venue.slug}`} target="_blank" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              border: '1px solid var(--border-2)',
              color: 'var(--text-3)', borderRadius: 3,
              fontSize: 11, fontWeight: 600, textDecoration: 'none',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}>
              <span>Public listing</span>
              <span style={{ opacity: 0.5 }}>↗</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── No venue yet ── */}
      {claims.length === 0 && !profile?.venue_id && (
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid rgba(200,148,58,0.15)',
          borderRadius: 8,
          padding: '56px 40px',
          textAlign: 'center',
          marginBottom: 40,
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🍺</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--text)', marginBottom: 12 }}>
            Claim your venue
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.75, fontFamily: 'var(--font-sans)', maxWidth: 440, margin: '0 auto 32px' }}>
            Find your brewery, distillery, or winery in our directory and claim it to start managing your listing.
          </p>
          <Link href="/vendor/claim" style={{
            display: 'inline-block',
            background: 'var(--amber)', color: 'var(--bg)',
            padding: '14px 36px', borderRadius: 3,
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)',
          }}>
            Find My Venue
          </Link>
        </div>
      )}

      {/* ── Venue switcher ── */}
      {venues.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 10 }}>
            Your Venues
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {venues.map(v => (
              <button
                key={v.id}
                className="venue-pill"
                onClick={() => switchVenue(v)}
                style={{
                  padding: '8px 16px', borderRadius: 20,
                  border: `1px solid ${venue?.id === v.id ? 'var(--amber)' : 'var(--border)'}`,
                  background: venue?.id === v.id ? 'rgba(200,148,58,0.08)' : 'transparent',
                  color: venue?.id === v.id ? 'var(--amber)' : 'var(--text-3)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                {TYPE_EMOJI[v.type] || '🏭'} {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Venue hero card ── */}
      {venue && (
        <VenueHeroCard
          venue={venue}
          pageViews={pageViews}
          tierInfo={tierInfo}
          isFreeTier={isFreeTier}
          currentTier={currentTier}
          onEdit={() => router.push(`/vendor/edit?venueId=${venue.id}`)}
        />
      )}

      {/* ── Pending/rejected claims ── */}
      {claims.some(c => c.status === 'pending' || c.status === 'rejected') && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 12 }}>
            Claims
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {claims.filter(c => c.status !== 'approved').map(claim => {
              const statusColor = STATUS_COLORS[claim.status] || '#c8943a'
              const date = new Date(claim.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              return (
                <div key={claim.id} style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${statusColor}`,
                  borderRadius: 4, padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: statusColor, background: `${statusColor}18`,
                    border: `1px solid ${statusColor}30`,
                    padding: '3px 10px', borderRadius: 2,
                  }}>
                    {claim.status}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text)' }}>{claim.venue_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>Submitted {date}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                    {claim.status === 'pending' ? 'Under review — 1–2 business days' : 'Please contact us'}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Subscription ── */}
      {venue && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 12 }}>
            Subscription
          </div>

          {!isFreeTier ? (
            <div style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: tierInfo.color,
                  boxShadow: `0 0 8px ${tierInfo.color}`,
                }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)' }}>{tierInfo.name} Plan</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{tierInfo.price} · Renews annually</div>
                </div>
              </div>
              {profile?.stripe_customer_id && (
                <button onClick={handleManageBilling} disabled={billingLoading} style={{
                  padding: '9px 18px',
                  border: '1px solid var(--border-2)', background: 'none',
                  color: 'var(--text-3)', borderRadius: 3, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                }}>
                  {billingLoading ? 'Loading…' : 'Manage Billing'}
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: '6px 6px 0 0', padding: '16px 24px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)' }} />
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-2)' }}>
                  Free listing · Upgrade to unlock more features
                </div>
              </div>
              <div className="upgrade-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
                <button className="upgrade-btn" onClick={() => handleUpgrade('standard')} style={{
                  display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 28px',
                  background: '#1e2e1e', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7ab87a', fontWeight: 600 }}>Standard</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400 }}>$99<span style={{ fontSize: 14, opacity: 0.6 }}>/yr</span></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>10 photos · verified badge · drinks menu · social links · awards</div>
                </button>
                <button className="upgrade-btn" onClick={() => handleUpgrade('standard')} style={{
                  display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 28px',
                  background: '#2a1e05', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c8943a', fontWeight: 600 }}>Premium</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400 }}>$499<span style={{ fontSize: 14, opacity: 0.6 }}>/yr</span></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Unlimited photos · video · events · promotions · analytics</div>
                </button>
              </div>
            </div>
          )}

          {currentTier === 'standard' && (
            <button className="upgrade-btn" onClick={() => handleUpgrade('standard')} style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 24px',
              background: '#2a1e05', color: '#fff', border: 'none',
              borderRadius: '0 0 6px 6px', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', textAlign: 'left', width: '100%',
              marginTop: 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c8943a', fontWeight: 600, marginBottom: 6 }}>Upgrade to Standard</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>$499/year</div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', maxWidth: 220, textAlign: 'right', lineHeight: 1.6 }}>
                  Unlock video embeds, events, promotions & analytics
                </div>
              </div>
            </button>
          )}
        </section>
      )}

      {/* ── Quick links ── */}
      <section>
        <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 12 }}>
          Quick Links
        </div>
        <div className="quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {venue && (
            <Link className="quick-link" href={`/vendor/edit?venueId=${venue.id}`} style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '20px 20px', background: 'var(--bg-2)',
              border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none',
            }}>
              <div style={{ fontSize: 22 }}>✏️</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)' }}>Edit Listing</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>Photos, hours, description</div>
            </Link>
          )}
          <Link className="quick-link" href="/vendor/claim" style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '20px 20px', background: 'var(--bg-2)',
            border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none',
          }}>
            <div style={{ fontSize: 22 }}>🔍</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)' }}>Claim a Venue</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>Find and claim your listing</div>
          </Link>
          <Link className="quick-link" href="/map" style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '20px 20px', background: 'var(--bg-2)',
            border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none',
          }}>
            <div style={{ fontSize: 22 }}>🗺️</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)' }}>View Map</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>Browse the directory</div>
          </Link>
          <a className="quick-link" href="mailto:hello@smallbatchatlas.au" style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '20px 20px', background: 'var(--bg-2)',
            border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none',
          }}>
            <div style={{ fontSize: 22 }}>✉️</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text)' }}>Get in Touch</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>hello@smallbatchatlas.au</div>
          </a>
        </div>
      </section>
    </div>
  )
}
