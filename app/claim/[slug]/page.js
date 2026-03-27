import { notFound } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Suspense } from 'react'
import ClaimVenuePage from './ClaimVenuePage'

export async function generateMetadata({ params }) {
  const supabase = getSupabase()
  const { data: venue } = await supabase
    .from('venues')
    .select('name, sub_region, state')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!venue) return {}

  return {
    title: `Claim ${venue.name} | Small Batch Atlas`,
    description: `Claim your listing for ${venue.name} and start managing your presence on Small Batch Atlas.`,
  }
}

export default async function ClaimVenueServerPage({ params }) {
  const supabase = getSupabase()
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, slug, type, sub_region, state, description, is_claimed')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!venue) {
    notFound()
  }

  if (venue.is_claimed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 16 }}>
            Already Claimed
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 24 }}>
            {venue.name} has already been claimed by its owner.
          </p>
          <a href={`/venue/${venue.slug}`} style={{
            display: 'inline-block', padding: '12px 24px', background: 'var(--amber)',
            color: 'white', textDecoration: 'none', borderRadius: 2
          }}>
            View Listing
          </a>
        </div>
      </div>
    )
  }

  return <Suspense fallback={null}><ClaimVenuePage venue={venue} /></Suspense>
}
