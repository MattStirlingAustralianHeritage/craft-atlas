'use client'
import { useAuth } from '../layout'
import { getSupabase } from '@/lib/supabase'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { canUse, getTier } from '@/lib/tiers'
import { isValidVideoUrl } from '@/lib/video-embed'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  distillery: '#c8943a',
  brewery:    '#4a7c59',
  winery:     '#8b4a6b',
  cidery:     '#c45d3e',
  meadery:    '#d4a843',
}

const FEATURE_OPTIONS = [
  'Cellar Door', 'Tours', 'Tastings', 'Restaurant', 'Bar', 'Cafe',
  'Outdoor Seating', 'Live Music', 'Events', 'Functions', 'Kids Friendly',
  'Dog Friendly', 'Wheelchair Accessible', 'Parking', 'Group Bookings',
  'Online Shop', 'Gift Shop', 'Accommodation',
]

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/yourvenue' },
  { key: 'facebook',  label: 'Facebook',  icon: '👥', placeholder: 'https://facebook.com/yourvenue' },
  { key: 'twitter',   label: 'X / Twitter', icon: '✖', placeholder: 'https://x.com/yourvenue' },
  { key: 'tiktok',   label: 'TikTok',    icon: '🎵', placeholder: 'https://tiktok.com/@yourvenue' },
  { key: 'youtube',  label: 'YouTube',   icon: '▶', placeholder: 'https://youtube.com/@yourvenue' },
]

const AWARD_LEVELS = ['Gold', 'Silver', 'Bronze', 'Trophy', 'Best in Show', 'Finalist', 'Winner', 'Other']

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TABS = [
  { id: 'details',  label: 'Details',  icon: '◉' },
  { id: 'images',   label: 'Images',   icon: '▦' },
  { id: 'hours',    label: 'Hours',    icon: '◷' },
  { id: 'features', label: 'Features', icon: '✦' },
  { id: 'menu',     label: 'Menu',     icon: '◈' },
  { id: 'awards',   label: 'Awards',   icon: '◆' },
  { id: 'events',   label: 'Events',   icon: '◉', premiumOnly: false },
  { id: 'premium',  label: 'Premium',  icon: '★', premiumOnly: true },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  marginBottom: 8,
  fontFamily: 'var(--font-sans)',
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--border-2)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  borderRadius: 3,
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UpgradeHint({ feature, requiredTier }) {
  const isP = requiredTier === 'premium'
  const color = isP ? '#b8860b' : '#4a7c59'
  return (
    <div style={{
      border: `1px solid ${color}30`,
      borderRadius: 6, padding: '32px 28px',
      textAlign: 'center', background: `${color}08`,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
        {isP ? 'Premium' : 'Standard'} Feature
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
        {feature}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 20, lineHeight: 1.6 }}>
        Available on the Standard ($99/yr) plan.
      </div>
      <Link href="/vendor/dashboard" style={{
        display: 'inline-block',
        background: color, color: '#fff',
        padding: '10px 28px', borderRadius: 3,
        fontSize: 11, fontWeight: 700, textDecoration: 'none',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontFamily: 'var(--font-sans)',
      }}>
        Upgrade Now
      </Link>
    </div>
  )
}

function AddButton({ onClick, label }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', background: hover ? 'rgba(200,148,58,0.06)' : 'none',
        border: `1px dashed ${hover ? 'var(--amber)' : 'var(--border-2)'}`,
        color: hover ? 'var(--amber)' : 'var(--text-3)',
        borderRadius: 3, fontSize: 12, cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.15s', fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
      <span>{label}</span>
    </button>
  )
}

function SectionHeader({ icon, title, description }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      paddingBottom: 16, marginBottom: 20,
      borderBottom: '1px solid var(--border)',
    }}>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 4, flexShrink: 0,
          background: 'rgba(200,148,58,0.08)',
          border: '1px solid rgba(200,148,58,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>{icon}</div>
      )}
      <div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text)',
          fontFamily: 'var(--font-sans)', marginBottom: description ? 4 : 0,
        }}>{title}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 4, padding: 20,
      marginBottom: 12, position: 'relative',
      ...style,
    }}>
      {children}
    </div>
  )
}

function RemoveBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', top: 12, right: 12,
      background: 'none', border: 'none',
      color: 'var(--text-3)', cursor: 'pointer',
      fontSize: 18, padding: '2px 6px',
      borderRadius: 2, lineHeight: 1,
      transition: 'color 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.color = '#c04b4b'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
    >×</button>
  )
}

// ─── Main inner component ─────────────────────────────────────────────────────

function VendorEditInner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [dirty, setDirty] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')
  const [address, setAddress] = useState('')
  const [features, setFeatures] = useState([])
  const [heroImage, setHeroImage] = useState('')
  const [tags, setTags] = useState([])
  const [galleryImages, setGalleryImages] = useState([])
  const [openingHours, setOpeningHours] = useState(DAYS.map(day => ({ day, hours: '', closed: false })))
  const [socialLinks, setSocialLinks] = useState({})
  const [drinksMenu, setDrinksMenu] = useState([])
  const [awards, setAwards] = useState([])
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState('')
  const [seasonalHighlights, setSeasonalHighlights] = useState([])
  const [promotions, setPromotions] = useState([])
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(true)
  const [events, setEvents] = useState([])

  const heroInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const markDirty = () => setDirty(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const { data: profileData } = await getSupabase()
      .from('vendor_profiles').select('*').eq('user_id', user.id).single()

    if (!profileData || profileData.status !== 'approved' || !profileData.venue_id) {
      router.push('/vendor/dashboard'); return
    }
    setProfile(profileData)

    const urlVenueId = searchParams.get('venueId')
    const venueIdToLoad = urlVenueId ? parseInt(urlVenueId, 10) : profileData.venue_id

    const { data: venueData } = await getSupabase()
      .from('venues').select('*').eq('id', venueIdToLoad).single()

    if (venueData) {
      setVenue(venueData)
      setDescription(venueData.description || '')
      setPhone(venueData.phone || '')
      setWebsite(venueData.website || '')
      setBookingUrl(venueData.booking_url || '')
      setAddress(venueData.address || '')
      setFeatures(venueData.features || [])
      setHeroImage(venueData.hero_image_url || '')
      setGalleryImages(venueData.gallery_images || [])
      setSocialLinks(venueData.social_links || {})
      setDrinksMenu(venueData.drinks_menu || [])
      setTags(venueData.tags || [])
      setAwards(venueData.awards || [])
      setFeaturedVideoUrl(venueData.featured_video_url || '')
      setSeasonalHighlights(venueData.seasonal_highlights || [])
      setPromotions(venueData.promotions || [])
      setFeaturedOnHomepage(venueData.featured_on_homepage ?? true)

      if (venueData.cellar_door_hours && typeof venueData.cellar_door_hours === 'object') {
        setOpeningHours(DAYS.map(day => {
          const val = venueData.cellar_door_hours[day.toLowerCase()] || ''
          return { day, hours: val === 'Closed' ? '' : val, closed: val === 'Closed' }
        }))
      }
    }

    const { data: eventsData } = await getSupabase()
      .from('events').select('*').eq('venue_id', venueIdToLoad)
      .order('event_date', { ascending: true })
    setEvents(eventsData || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveStatus('saving')
    setError(null)

    const tier = venue?.listing_tier || 'free'
    const hours = {}
    openingHours.forEach(item => {
      if (item.closed) {
        hours[item.day.toLowerCase()] = 'Closed'
      } else if (item.hours.trim()) {
        hours[item.day.toLowerCase()] = item.hours.trim()
      }
    })

    const updates = {
      description: description.trim() || null,
      tags: tags.length > 0 ? tags : null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      booking_url: canUse('bookingLink', tier) ? (bookingUrl.trim() || null) : undefined,
      address: address.trim() || null,
      features: features.length > 0 ? features : null,
      hero_image_url: heroImage || null,
      gallery_images: galleryImages.length > 0 ? galleryImages : null,
      cellar_door_hours: Object.keys(hours).length > 0 ? hours : null,
      updated_at: new Date().toISOString(),
    }

    if (canUse('socialLinks', tier)) {
      const cleanLinks = {}
      Object.entries(socialLinks).forEach(([k, v]) => { if (v?.trim()) cleanLinks[k] = v.trim() })
      updates.social_links = Object.keys(cleanLinks).length > 0 ? cleanLinks : null
    }
    if (canUse('drinksMenu', tier)) {
      updates.drinks_menu = drinksMenu.filter(d => d.name?.trim()).length > 0 ? drinksMenu.filter(d => d.name?.trim()) : null
    }
    if (canUse('awards', tier)) {
      updates.awards = awards.filter(a => a.title?.trim()).length > 0 ? awards.filter(a => a.title?.trim()) : null
    }
    if (canUse('featuredVideo', tier)) updates.featured_video_url = featuredVideoUrl.trim() || null
    if (canUse('seasonalHighlights', tier)) {
      updates.seasonal_highlights = seasonalHighlights.filter(s => s.name?.trim()).length > 0 ? seasonalHighlights.filter(s => s.name?.trim()) : null
    }
    if (canUse('promotions', tier)) {
      updates.promotions = promotions.filter(p => p.title?.trim()).length > 0 ? promotions.filter(p => p.title?.trim()) : null
    }
    if (tier === 'standard') {
      updates.featured_on_homepage = featuredOnHomepage
    }

    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k])

    const { error: updateError } = await getSupabase()
      .from('venues').update(updates).eq('id', venue.id)

    if (updateError) {
      setError(updateError.message || 'Failed to save')
      setSaveStatus('error')
    } else {
      await saveEvents()
      setSaveStatus('saved')
      setDirty(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
    setSaving(false)
  }

  async function uploadImage(file, type) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${venue.slug}/${type}-${Date.now()}.${fileExt}`
    const { error } = await getSupabase().storage.from('venue-images').upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) { setError('Upload failed: ' + error.message); return null }
    const { data: urlData } = getSupabase().storage.from('venue-images').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    const url = await uploadImage(file, 'hero')
    if (url) { setHeroImage(url); markDirty() }
    setUploadingHero(false)
  }

  async function handleGalleryUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingGallery(true)
    const newUrls = []
    for (const file of files) {
      const url = await uploadImage(file, 'gallery')
      if (url) newUrls.push(url)
    }
    setGalleryImages(prev => { markDirty(); return [...prev, ...newUrls] })
    setUploadingGallery(false)
  }

  function toggleFeature(feature) {
    setFeatures(prev => { markDirty(); return prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature] })
  }

  // Events
  function addEvent() { setEvents(prev => [...prev, { id: null, title: '', description: '', event_date: '', end_date: '', event_type: 'other', is_free: true, ticket_url: '' }]); markDirty() }
  function updateEvent(i, field, value) { setEvents(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e)); markDirty() }
  async function removeEvent(i) {
    const event = events[i]
    if (event.id) await getSupabase().from('events').delete().eq('id', event.id)
    setEvents(prev => prev.filter((_, idx) => idx !== i))
  }
  async function saveEvents() {
    for (const event of events) {
      if (!event.title?.trim() || !event.event_date) continue
      const payload = {
        venue_id: venue.id, title: event.title.trim(),
        description: event.description?.trim() || null,
        event_date: event.event_date, end_date: event.end_date || null,
        event_type: event.event_type || 'other', is_free: event.is_free,
        ticket_url: event.ticket_url?.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (event.id) {
        await getSupabase().from('events').update(payload).eq('id', event.id)
      } else {
        const { data } = await getSupabase().from('events').insert(payload).select().single()
        if (data) updateEvent(events.indexOf(event), 'id', data.id)
      }
    }
  }

  // Helpers for array fields
  const mkAdd    = (setter, blank) => () => { setter(p => [...p, blank]); markDirty() }
  const mkUpdate = (setter) => (i, field, value) => { setter(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item)); markDirty() }
  const mkRemove = (setter) => (i) => { setter(p => p.filter((_, idx) => idx !== i)) }

  const addDrink    = mkAdd(setDrinksMenu, { name: '', style: '', description: '' })
  const updateDrink = mkUpdate(setDrinksMenu)
  const removeDrink = mkRemove(setDrinksMenu)

  const addAward    = mkAdd(setAwards, { title: '', year: new Date().getFullYear().toString(), body: '', level: '' })
  const updateAward = mkUpdate(setAwards)
  const removeAward = mkRemove(setAwards)

  const addHighlight    = mkAdd(setSeasonalHighlights, { name: '', description: '', tag: '' })
  const updateHighlight = mkUpdate(setSeasonalHighlights)
  const removeHighlight = mkRemove(setSeasonalHighlights)

  const addPromotion    = mkAdd(setPromotions, { title: '', description: '', valid_until: '' })
  const updatePromotion = mkUpdate(setPromotions)
  const removePromotion = mkRemove(setPromotions)

  // Tab completion
  const tabHasContent = {
    details:  !!(description || phone || website || address),
    images:   !!(heroImage || galleryImages.length),
    hours:    openingHours.some(h => h.hours || h.closed),
    features: features.length > 0,
    menu:     drinksMenu.filter(d => d.name?.trim()).length > 0,
    awards:   awards.filter(a => a.title?.trim()).length > 0,
    events:   events.filter(e => e.title?.trim()).length > 0,
    premium:  !!(featuredVideoUrl || seasonalHighlights.length || promotions.length),
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-3)' }}>Loading your venue…</div>
    </div>
  )

  if (!venue) return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--text)', marginBottom: 12 }}>No venue linked</div>
      <Link href="/vendor/dashboard" style={{ fontSize: 13, color: 'var(--amber)', textDecoration: 'none' }}>← Back to Dashboard</Link>
    </div>
  )

  const color = TYPE_COLORS[venue.type] || '#c8943a'
  const tier = venue.listing_tier || 'free'
  const tierConfig = getTier(tier)
  const maxPhotos = canUse('maxPhotos', tier) || 1
  const visibleTabs = TABS.filter(t => !(t.premiumOnly && tier === 'free'))
  const descLen = description.length

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 80px' }}>
      <style>{`
        .vendor-input:focus { border-color: var(--amber) !important; }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { color: var(--text) !important; }
        .feature-btn { transition: all 0.12s; }
        .feature-btn:hover { opacity: 0.85; }
        @media (min-width: 800px) {
          .edit-layout { display: grid; grid-template-columns: 190px 1fr; gap: 0; align-items: start; }
          .sidebar-nav { position: sticky; top: 100px; padding-right: 24px; }
          .edit-content { padding-left: 32px; border-left: 1px solid var(--border); }
          .tab-bar-mobile { display: none !important; }
        }
        @media (max-width: 799px) {
          .edit-layout { display: block; }
          .sidebar-nav { display: none !important; }
          .tab-bar-mobile { display: flex !important; }
          .vendor-grid-2 { grid-template-columns: 1fr !important; }
          .gallery-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Link href="/vendor/dashboard" style={{
                fontSize: 11, color: 'var(--text-3)', textDecoration: 'none',
                fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                ← Dashboard
              </Link>
              {tier !== 'free' && (
                <>
                  <span style={{ color: 'var(--border-2)', fontSize: 11 }}>/</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: tier === 'standard' ? '#b8860b' : '#4a7c59',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    ★ {tierConfig.name}
                  </span>
                </>
              )}
            </div>
            {/* Venue name — this is the hero element */}
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 400, color: 'var(--text)', lineHeight: 1.1,
              marginBottom: 8,
            }}>
              {venue.name}
            </h1>
            <div style={{
              fontSize: 13, color: 'var(--text-3)',
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ textTransform: 'capitalize' }}>{venue.type}</span>
              {(venue.sub_region || venue.state) && <span style={{ opacity: 0.4 }}>·</span>}
              <span>{venue.sub_region && `${venue.sub_region}, `}{venue.state}</span>
            </div>
          </div>

          {/* Actions — Save dominates, Preview is secondary */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {dirty && saveStatus !== 'saved' && saveStatus !== 'error' && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
                Unsaved changes
              </span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 12, color: '#4a7c59', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
                ✓ Saved
              </span>
            )}
            <Link href={`/venue/${venue.slug}`} target="_blank" style={{
              padding: '9px 14px', border: '1px solid var(--border-2)',
              color: 'var(--text-3)', borderRadius: 3, fontSize: 11, fontWeight: 500,
              textDecoration: 'none', letterSpacing: '0.04em',
              fontFamily: 'var(--font-sans)',
            }}>Preview ↗</Link>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '11px 28px',
              background: saveStatus === 'saved' ? '#4a7c59' : saveStatus === 'error' ? '#8b4a4a' : 'var(--amber)',
              color: saveStatus === 'saved' || saveStatus === 'error' ? '#fff' : '#1a1208',
              border: 'none', borderRadius: 3,
              fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
              boxShadow: saveStatus === 'saved' || saveStatus === 'error' ? 'none' : '0 2px 8px rgba(200,148,58,0.25)',
            }}>
              {saving ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Error' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 20, background: 'rgba(192,75,75,0.1)', border: '1px solid rgba(192,75,75,0.25)', borderRadius: 3, fontSize: 13, color: '#c04b4b', fontFamily: 'var(--font-sans)' }}>
          {error}
        </div>
      )}

      {/* ── Mobile tab bar ── */}
      <div className="tab-bar-mobile" style={{
        display: 'none', gap: 0, overflowX: 'auto',
        borderBottom: '1px solid var(--border)', marginBottom: 28,
        scrollbarWidth: 'none', WebkitScrollbarWidth: 'none',
      }}>
        {visibleTabs.map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 14px', background: 'none', border: 'none', whiteSpace: 'nowrap',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)',
            color: activeTab === tab.id ? 'var(--text)' : 'var(--text-3)',
            borderBottom: activeTab === tab.id ? '2px solid var(--amber)' : '2px solid transparent',
            cursor: 'pointer', position: 'relative',
          }}>
            {tab.label}
            {tabHasContent[tab.id] && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4a7c59', display: 'inline-block', marginLeft: 5, verticalAlign: 'middle', marginTop: -2 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="edit-layout">

        {/* Sidebar nav — desktop only */}
        <nav className="sidebar-nav" style={{ display: 'block' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 700, marginBottom: 10, paddingLeft: 4 }}>
            Sections
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.id
              const isPremiumTab = tab.id === 'premium'
              return (
                <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 12px',
                  background: isActive ? 'rgba(200,148,58,0.09)' : 'none',
                  border: 'none',
                  borderLeft: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
                  borderRadius: isActive ? '0 3px 3px 0' : '0 3px 3px 0',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  color: isActive ? 'var(--text)' : isPremiumTab ? 'var(--amber)' : 'var(--text-2)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                  marginLeft: -1,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPremiumTab && <span style={{ fontSize: 10 }}>★</span>}
                    {tab.label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {tabHasContent[tab.id] && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'var(--amber)' : '#4a7c59', flexShrink: 0 }} />
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Save state in sidebar */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '10px 0',
              background: saveStatus === 'saved' ? '#4a7c59' : saveStatus === 'error' ? '#8b4a4a' : 'var(--amber)',
              color: saveStatus === 'saved' || saveStatus === 'error' ? '#fff' : '#1a1208',
              border: 'none', borderRadius: 3,
              fontSize: 11, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Error' : 'Save Changes'}
            </button>
            {dirty && saveStatus !== 'saved' && (
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textAlign: 'center', marginTop: 7, letterSpacing: '0.02em' }}>
                Unsaved changes
              </div>
            )}
          </div>
        </nav>

        {/* ── Tab content ── */}
        <div className="edit-content">

          {/* DETAILS */}
          {activeTab === 'details' && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  className="vendor-input"
                  value={description}
                  onChange={e => { setDescription(e.target.value); markDirty() }}
                  rows={6}
                  placeholder="Tell visitors what makes your venue special — your story, what to expect, what you make…"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: descLen > 450 ? (descLen > 490 ? '#c04b4b' : '#c8943a') : 'var(--text-3)', marginTop: 6, fontFamily: 'var(--font-sans)', textAlign: 'right' }}>
                  {descLen} / 500
                </div>
              </div>

              <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input className="vendor-input" value={phone} onChange={e => { setPhone(e.target.value); markDirty() }} placeholder="(03) 9123 4567" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input className="vendor-input" value={website} onChange={e => { setWebsite(e.target.value); markDirty() }} placeholder="https://yourvenue.com.au" style={inputStyle} />
                </div>
              </div>

              <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input className="vendor-input" value={address} onChange={e => { setAddress(e.target.value); markDirty() }} placeholder="123 Main St, Town VIC 3000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Booking URL</label>
                  <input className="vendor-input" value={bookingUrl} onChange={e => { setBookingUrl(e.target.value); markDirty() }} placeholder="https://book.yourvenue.com.au" style={inputStyle} />
                </div>
              </div>

              {/* Section divider */}
              <div style={{ borderTop: '1px solid var(--border)', marginBottom: 28, paddingTop: 28 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontWeight: 700, marginBottom: 16 }}>
                  Social & Links
                </div>

                {canUse('socialLinks', tier) ? (
                  <div>
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      {SOCIAL_PLATFORMS.map((platform, i) => (
                        <div key={platform.key} style={{
                          display: 'flex', alignItems: 'center', gap: 0,
                          borderBottom: i < SOCIAL_PLATFORMS.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-3)', flexShrink: 0, padding: '0 4px' }}>
                            {platform.icon}
                          </div>
                          <div style={{ width: 80, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', flexShrink: 0, borderRight: '1px solid var(--border)', padding: '12px 0' }}>
                            {platform.label}
                          </div>
                          <input
                            className="vendor-input"
                            value={socialLinks[platform.key] || ''}
                            onChange={e => { setSocialLinks(p => ({ ...p, [platform.key]: e.target.value })); markDirty() }}
                            placeholder={platform.placeholder}
                            style={{ ...inputStyle, border: 'none', borderRadius: 0, background: 'transparent', paddingLeft: 14 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <UpgradeHint feature="Social media links" requiredTier="standard" />
                )}
              </div>
            </div>
          )}

          {/* IMAGES */}
          {activeTab === 'images' && (
            <div>
              <div style={{ marginBottom: 36 }}>
                <label style={labelStyle}>Hero Image</label>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
                  Main image shown at the top of your listing. Recommended 1200×600px, landscape.
                </p>
                {heroImage ? (
                  <div style={{ position: 'relative', marginBottom: 12, borderRadius: 4, overflow: 'hidden' }}>
                    <img src={heroImage} alt="Hero" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)', pointerEvents: 'none' }} />
                    <button onClick={() => { setHeroImage(''); markDirty() }} style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                    <button onClick={() => heroInputRef.current?.click()} style={{
                      position: 'absolute', bottom: 12, right: 12,
                      padding: '7px 14px', background: 'rgba(0,0,0,0.7)',
                      color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>
                      {uploadingHero ? 'Uploading…' : 'Replace'}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => heroInputRef.current?.click()}
                    style={{
                      height: 200, border: '2px dashed var(--border-2)', borderRadius: 4,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 10, cursor: 'pointer',
                      background: 'var(--bg-2)', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = 'rgba(200,148,58,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--bg-2)' }}
                  >
                    <div style={{ fontSize: 36 }}>📷</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                      {uploadingHero ? 'Uploading…' : 'Click to upload hero image'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.6, fontFamily: 'var(--font-sans)' }}>JPG, PNG · Max 5MB</div>
                  </div>
                )}
                <input ref={heroInputRef} type="file" accept="image/*" onChange={handleHeroUpload} style={{ display: 'none' }} />
              </div>

              <div>
                <label style={labelStyle}>Gallery Photos</label>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
                  {maxPhotos === Infinity ? 'Add unlimited photos.' : `Up to ${maxPhotos} photos.`}
                  {tier === 'free' && ' Upgrade to Standard for up to 10 photos.'}
                  {tier === 'standard' && ' Upgrade to Standard for full features.'}
                </p>
                <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                  {galleryImages.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => { setGalleryImages(p => p.filter((_, idx) => idx !== i)); markDirty() }} style={{
                        position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)',
                        color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24,
                        cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 10, textAlign: 'center', background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)', padding: '3px 0', fontFamily: 'var(--font-sans)' }}>
                        {i + 1}
                      </div>
                    </div>
                  ))}
                  {(maxPhotos === Infinity || galleryImages.length < maxPhotos) && (
                    <div
                      onClick={() => galleryInputRef.current?.click()}
                      style={{
                        aspectRatio: '1', border: '2px dashed var(--border-2)', borderRadius: 4,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 6, cursor: 'pointer', background: 'var(--bg-2)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = 'rgba(200,148,58,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--bg-2)' }}
                    >
                      <div style={{ fontSize: 24, color: 'var(--text-3)' }}>+</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                        {uploadingGallery ? 'Uploading…' : 'Add Photo'}
                      </div>
                    </div>
                  )}
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: 'none' }} />
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                  {galleryImages.length}{maxPhotos !== Infinity ? ` / ${maxPhotos}` : ''} photos uploaded
                </div>
              </div>
            </div>
          )}

          {/* HOURS */}
          {activeTab === 'hours' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
                Set your opening hours. Toggle the switch to mark a day as closed.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => {
                  const mon = openingHours.find(h => h.day === 'Monday')?.hours || ''
                  setOpeningHours(p => p.map((h, i) => i >= 0 && i <= 4 ? { ...h, hours: mon, closed: false } : h))
                  markDirty()
                }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Copy Mon → Weekdays
                </button>
                <button onClick={() => {
                  const mon = openingHours.find(h => h.day === 'Monday')?.hours || ''
                  setOpeningHours(p => p.map(h => ({ ...h, hours: mon, closed: false })))
                  markDirty()
                }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Copy to All Days
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openingHours.map((item, i) => (
                  <div key={item.day} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: 'var(--bg-2)',
                    border: `1px solid ${item.closed ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: 4,
                    opacity: item.closed ? 0.6 : 1, transition: 'opacity 0.15s',
                  }}>
                    <div style={{ width: 90, fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
                      {item.day.slice(0, 3)}
                    </div>
                    {item.closed ? (
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>Closed</div>
                    ) : (
                      <input
                        className="vendor-input"
                        value={item.hours}
                        onChange={e => {
                          const updated = [...openingHours]
                          updated[i].hours = e.target.value
                          setOpeningHours(updated); markDirty()
                        }}
                        placeholder="e.g. 10am – 5pm"
                        style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                      />
                    )}
                    <button
                      onClick={() => {
                        const updated = [...openingHours]
                        updated[i].closed = !updated[i].closed
                        setOpeningHours(updated); markDirty()
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 2, flexShrink: 0, cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        border: `1px solid ${item.closed ? '#c04b4b' : 'var(--border)'}`,
                        background: item.closed ? 'rgba(192,75,75,0.1)' : 'none',
                        color: item.closed ? '#c04b4b' : 'var(--text-3)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {item.closed ? 'Reopen' : 'Closed'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FEATURES */}
          {activeTab === 'features' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
                Select all features and amenities your venue offers. These appear on your listing as quick-scan badges.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {FEATURE_OPTIONS.map(feature => {
                  const isSelected = features.includes(feature)
                  return (
                    <button key={feature} className="feature-btn" onClick={() => toggleFeature(feature)} style={{
                      padding: '9px 16px', borderRadius: 3,
                      border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                      background: isSelected ? `${color}12` : 'var(--bg-2)',
                      color: isSelected ? color : 'var(--text-2)',
                      fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {isSelected && '✓ '}{feature}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                {features.length} {features.length === 1 ? 'feature' : 'features'} selected
              </div>
            </div>
          )}

          {/* MENU */}
          {activeTab === 'menu' && (
            <div>
              {canUse('drinksMenu', tier) ? (
                <>
                  <SectionHeader
                    icon="🍺"
                    title="Drinks Menu"
                    description="List what you make, brew, or distil. Helps visitors know what to expect before they visit."
                  />
                  {drinksMenu.map((drink, i) => (
                    <Card key={i}>
                      <RemoveBtn onClick={() => removeDrink(i)} />
                      <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Product Name</label>
                          <input className="vendor-input" value={drink.name} onChange={e => updateDrink(i, 'name', e.target.value)} placeholder="e.g. Pale Ale, Shiraz, London Dry Gin" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Style / Category</label>
                          <input className="vendor-input" value={drink.style || ''} onChange={e => updateDrink(i, 'style', e.target.value)} placeholder="e.g. IPA, Single Malt, Pinot Noir" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9 }}>Tasting Notes <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                        <input className="vendor-input" value={drink.description || ''} onChange={e => updateDrink(i, 'description', e.target.value)} placeholder="A brief description or tasting note" style={{ ...inputStyle, marginBottom: 0 }} />
                      </div>
                    </Card>
                  ))}
                  <AddButton onClick={addDrink} label="Add Product" />
                </>
              ) : <UpgradeHint feature="Drinks menu & product list" requiredTier="standard" />}
            </div>
          )}

          {/* AWARDS */}
          {activeTab === 'awards' && (
            <div>
              {canUse('awards', tier) ? (
                <>
                  <SectionHeader
                    icon="🏅"
                    title="Awards & Accolades"
                    description="Showcase your medals, trophies, and accolades. These display prominently on your listing."
                  />
                  {awards.map((award, i) => (
                    <Card key={i}>
                      <RemoveBtn onClick={() => removeAward(i)} />
                      <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Award Title</label>
                          <input className="vendor-input" value={award.title} onChange={e => updateAward(i, 'title', e.target.value)} placeholder="e.g. Best Small Batch Gin" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Year</label>
                          <input className="vendor-input" value={award.year || ''} onChange={e => updateAward(i, 'year', e.target.value)} placeholder="2024" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                      </div>
                      <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Awarding Body</label>
                          <input className="vendor-input" value={award.body || ''} onChange={e => updateAward(i, 'body', e.target.value)} placeholder="e.g. Royal Melbourne Fine Food Awards" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Medal Level</label>
                          <select className="vendor-input" value={award.level || ''} onChange={e => updateAward(i, 'level', e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
                            <option value="">Select level…</option>
                            {AWARD_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <AddButton onClick={addAward} label="Add Award" />
                </>
              ) : <UpgradeHint feature="Awards & accolades" requiredTier="standard" />}
            </div>
          )}

          {/* EVENTS */}
          {activeTab === 'events' && (
            <div>
              <SectionHeader
                icon="📅"
                title="Events"
                description="Add upcoming events, releases, and special occasions. These appear on your listing page."
              />
              {events.map((event, i) => (
                <Card key={i}>
                  <RemoveBtn onClick={() => removeEvent(i)} />
                  <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>Event Title</label>
                      <input className="vendor-input" value={event.title} onChange={e => updateEvent(i, 'title', e.target.value)} placeholder="e.g. Winter Barrel Release, Open Day" style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>Type</label>
                      <select className="vendor-input" value={event.event_type} onChange={e => updateEvent(i, 'event_type', e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
                        <option value="release">🍾 Release</option>
                        <option value="tasting">🥃 Tasting</option>
                        <option value="tour">🚶 Tour</option>
                        <option value="open_day">🎪 Open Day</option>
                        <option value="collaboration">🤝 Collaboration</option>
                        <option value="food_pairing">🍽️ Food Pairing</option>
                        <option value="other">📅 Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>Date & Time</label>
                      <input type="datetime-local" className="vendor-input" value={event.event_date} onChange={e => updateEvent(i, 'event_date', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>End Date <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <input type="datetime-local" className="vendor-input" value={event.end_date || ''} onChange={e => updateEvent(i, 'end_date', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ ...labelStyle, fontSize: 9 }}>Description</label>
                    <textarea className="vendor-input" value={event.description || ''} onChange={e => updateEvent(i, 'description', e.target.value)} rows={2} placeholder="Brief description of the event" style={{ ...inputStyle, marginBottom: 0, resize: 'vertical' }} />
                  </div>
                  <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>Ticket / RSVP URL <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <input className="vendor-input" value={event.ticket_url || ''} onChange={e => updateEvent(i, 'ticket_url', e.target.value)} placeholder="https://..." style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 26 }}>
                      <input type="checkbox" id={`free-${i}`} checked={event.is_free} onChange={e => updateEvent(i, 'is_free', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--amber)' }} />
                      <label htmlFor={`free-${i}`} style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Free entry</label>
                    </div>
                  </div>
                </Card>
              ))}
              <AddButton onClick={addEvent} label="Add Event" />
            </div>
          )}

          {/* PREMIUM */}
          {activeTab === 'premium' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Homepage Feature */}
              <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
                <SectionHeader
                  icon="⭐"
                  title="Featured on Homepage"
                  description="Opt in to have your venue featured on the Small Batch Atlas homepage, visible to all visitors."
                />
                {tier === 'standard' ? (
                  <div
                    onClick={() => { setFeaturedOnHomepage(v => !v); markDirty() }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${featuredOnHomepage ? 'rgba(184,134,11,0.4)' : 'var(--border)'}`,
                      background: featuredOnHomepage ? 'rgba(184,134,11,0.06)' : 'var(--bg)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                        {featuredOnHomepage ? '⭐ Featured on homepage' : 'Not featured'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                        {featuredOnHomepage
                          ? 'Your venue is visible on the Small Batch Atlas homepage — click to opt out'
                          : 'You\'ve opted out of homepage placement — click to opt back in'}
                      </div>
                    </div>
                    <div style={{
                      width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                      background: featuredOnHomepage ? 'var(--amber)' : '#ccc',
                      transition: 'background 0.2s ease',
                    }}>
                      <div style={{
                        position: 'absolute', top: 3, left: featuredOnHomepage ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s ease',
                      }} />
                    </div>
                  </div>
                ) : <UpgradeHint feature="Homepage feature placement" requiredTier="standard" />}
              </div>

              {/* Featured Video */}
              <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
                <SectionHeader
                  icon="▶"
                  title="Featured Video"
                  description="Embed a YouTube or Vimeo video directly on your listing page."
                />
                {canUse('featuredVideo', tier) ? (
                  <>
                    <input className="vendor-input" value={featuredVideoUrl} onChange={e => { setFeaturedVideoUrl(e.target.value); markDirty() }} placeholder="https://www.youtube.com/watch?v=..." style={inputStyle} />
                    {featuredVideoUrl && isValidVideoUrl(featuredVideoUrl) && (
                      <div style={{ fontSize: 11, color: '#4a7c59', marginTop: 8, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>✓</span> Valid URL — video will appear on your listing
                      </div>
                    )}
                    {featuredVideoUrl && !isValidVideoUrl(featuredVideoUrl) && (
                      <div style={{ fontSize: 11, color: '#c04b4b', marginTop: 8, fontFamily: 'var(--font-sans)' }}>
                        Please enter a valid YouTube or Vimeo URL
                      </div>
                    )}
                  </>
                ) : <UpgradeHint feature="Featured video embed" requiredTier="standard" />}
              </div>

              {/* Seasonal Highlights */}
              <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
                <SectionHeader
                  icon="🌿"
                  title="Currently Pouring / Seasonal Highlights"
                  description="What's on right now — new releases, seasonal specials, what's on tap this week."
                />
                {canUse('seasonalHighlights', tier) ? (
                  <>
                    {seasonalHighlights.map((item, i) => (
                      <Card key={i}>
                        <RemoveBtn onClick={() => removeHighlight(i)} />
                        <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 9 }}>Name</label>
                            <input className="vendor-input" value={item.name} onChange={e => updateHighlight(i, 'name', e.target.value)} placeholder="e.g. Autumn Harvest Ale" style={{ ...inputStyle, marginBottom: 0 }} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 9 }}>Tag</label>
                            <input className="vendor-input" value={item.tag || ''} onChange={e => updateHighlight(i, 'tag', e.target.value)} placeholder="New Release" style={{ ...inputStyle, marginBottom: 0 }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Description <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                          <input className="vendor-input" value={item.description || ''} onChange={e => updateHighlight(i, 'description', e.target.value)} placeholder="A short description" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                      </Card>
                    ))}
                    <AddButton onClick={addHighlight} label="Add Highlight" />
                  </>
                ) : <UpgradeHint feature="Seasonal highlights" requiredTier="standard" />}
              </div>

              {/* Promotions */}
              <div>
                <SectionHeader
                  icon="🏷"
                  title="Special Offers & Promotions"
                  description="Active deals and offers that appear on your listing to attract visitors."
                />
                {canUse('promotions', tier) ? (
                  <>
                    {promotions.map((promo, i) => (
                      <Card key={i}>
                        <RemoveBtn onClick={() => removePromotion(i)} />
                        <div className="vendor-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 9 }}>Offer Title</label>
                            <input className="vendor-input" value={promo.title} onChange={e => updatePromotion(i, 'title', e.target.value)} placeholder="e.g. 10% off tastings this month" style={{ ...inputStyle, marginBottom: 0 }} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 9 }}>Valid Until</label>
                            <input type="date" className="vendor-input" value={promo.valid_until || ''} onChange={e => updatePromotion(i, 'valid_until', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9 }}>Details</label>
                          <input className="vendor-input" value={promo.description || ''} onChange={e => updatePromotion(i, 'description', e.target.value)} placeholder="More details about the offer" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                      </Card>
                    ))}
                    <AddButton onClick={addPromotion} label="Add Promotion" />
                  </>
                ) : <UpgradeHint feature="Special offers & promotions" requiredTier="standard" />}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function VendorEditPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-3)' }}>Loading…</div>
      </div>
    }>
      <VendorEditInner />
    </Suspense>
  )
}
