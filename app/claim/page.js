import { getSupabase } from '@/lib/supabase'
import { Suspense } from 'react'
import ClaimClient from '@/components/ClaimClient'

export const metadata = {
  title: 'Claim Your Listing | Craft Atlas',
  description: 'Find your maker or studio and claim your free listing on Craft Atlas.',
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
