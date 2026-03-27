// app/api/stripe/claim-checkout/route.js

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { venueId, email, name, message, tier = 'standard' } = await request.json()

    if (!venueId || !email || !name) {
      return Response.json(
        { error: 'Missing required fields: venueId, email, name' },
        { status: 400 }
      )
    }

    // Get price ID based on tier
    const priceId = tier === 'premium' 
      ? process.env.STRIPE_PREMIUM_PRICE_ID 
      : process.env.STRIPE_STANDARD_PRICE_ID

    if (!priceId) {
      return Response.json({ error: 'Invalid tier selected' }, { status: 400 })
    }

    // Verify venue exists and isn't already claimed
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, is_claimed')
      .eq('id', venueId)
      .single()

    if (venueError || !venue) {
      return Response.json({ error: 'Venue not found' }, { status: 404 })
    }

    if (venue.is_claimed) {
      return Response.json({ error: 'Venue already claimed' }, { status: 409 })
    }

    // Check for existing pending claim
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('venue_id', venueId)
      .eq('status', 'pending')
      .single()

    if (existingClaim) {
      return Response.json({ error: 'Claim already pending for this venue' }, { status: 409 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${siteUrl}/claim/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/claim/${venue.id}?cancelled=true`,
      metadata: { 
        venue_id: String(venueId), 
        email, 
        name,
        message: message || '',
        tier,
        claim_type: 'new'
      },
      subscription_data: {
        metadata: { 
          venue_id: String(venueId), 
          email,
          name, 
          tier,
          claim_type: 'new'
        },
      },
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Claim checkout error:', error)
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
