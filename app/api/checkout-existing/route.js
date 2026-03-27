import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const STANDARD_PRICE_ID = 'price_1TCTBqCYUnk0uJlYzeVD9ozZ'

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { venueId } = await request.json()
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 })

    const { data: venue } = await supabaseAdmin.from('venues').select('id, name, slug, is_claimed').eq('id', venueId).single()
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.is_claimed) return Response.json({ error: 'Already claimed' }, { status: 409 })

await supabaseAdmin.from('vendor_profiles').upsert({ user_id: user.id, email: user.email }, { onConflict: 'user_id' })

    const { data: claim, error: claimError } = await supabaseAdmin.from('claims').insert({
      user_id: user.id, venue_id: venueId, venue_name: venue.name,
      contact_name: user.user_metadata?.full_name || user.email,
      contact_email: user.email, selected_tier: 'standard', status: 'pending',
    }).select('id').single()
    if (claimError) { console.error(claimError.message); return Response.json({ error: 'Failed to create claim' }, { status: 500 }) }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.collectionatlas.com.au'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STANDARD_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      success_url: `${siteUrl}/vendor/dashboard?claimed=1&tier=standard`,
      cancel_url: `${siteUrl}/claim/${venue.slug}?tier=standard&cancelled=1`,
      metadata: { claim_id: claim.id, venue_id: String(venueId), user_id: user.id, type: 'claim_checkout', tier: 'standard' },
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Checkout existing error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
