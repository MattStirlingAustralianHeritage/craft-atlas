import { getSupabase } from '@/lib/supabase'
import { Suspense } from 'react'
import ClaimClient from '@/components/ClaimClient'

export const metadata = {
  title: 'Claim Your Venue | Small Batch Atlas',
  description: 'Find your distillery, brewery or winery and claim your free listing on Small Batch Atlas.',
}

export default async function ClaimPage() {
  const supabase = getSupabase()
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, slug, type, subtype, state, sub_region, description, hero_image_url, is_claimed, listing_tier')
    .eq('status', 'published')
    .order('name')

  return <Suspense fallback={null}><ClaimClient venues={venues || []} /></Suspense>
}
