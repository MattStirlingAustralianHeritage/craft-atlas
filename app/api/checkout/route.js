import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const STANDARD_PRICE_ID = process.env.STRIPE_STANDARD_PRICE_ID

    const { name, email, password, venueId } = await request.json()
    if (!name || !email || !password || !venueId) return Response.json({ error: 'All fields are required' }, { status: 400 })
    if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const { data: venue } = await supabaseAdmin.from('venues').select('id, name, slug').eq('id', venueId).single()
    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 })

    const { data: existingClaim } = await supabaseAdmin.from('claims').select('id, status').eq('venue_id', venueId).in('status', ['pending', 'approved']).maybeSingle()
    if (existingClaim) return Response.json({ error: existingClaim.status === 'pending' ? 'A claim is already under review.' : 'Already claimed.' }, { status: 409 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
    if (authError) {
      const msg = authError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) return Response.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id
    await supabaseAdmin.from('vendor_profiles').upsert({ user_id: userId, full_name: name, email }, { onConflict: 'user_id' })

    const { data: claim, error: claimError } = await supabaseAdmin.from('claims').insert({
      user_id: userId, venue_id: venueId, venue_name: venue.name,
      contact_name: name, contact_email: email, selected_tier: 'standard', status: 'pending',
    }).select('id').single()
    if (claimError) { console.error(claimError.message); return Response.json({ error: 'Failed to create claim' }, { status: 500 }) }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STANDARD_PRICE_ID, quantity: 1 }],
      customer_email: email,
      success_url: `${siteUrl}/vendor/dashboard?claimed=1&tier=standard`,
      cancel_url: `${siteUrl}/claim/${venue.slug}?tier=standard&cancelled=1`,
      metadata: { claim_id: claim.id, venue_id: String(venueId), user_id: userId, type: 'claim_checkout', tier: 'standard' },
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
