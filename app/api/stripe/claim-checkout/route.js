// app/api/stripe/claim-checkout/route.js
// Minimal version - Stripe only, no database for now

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

export async function POST(request) {
  try {
    const {
      venueId,
      venueName,
      venueSlug,
      tier,
      contactName,
      contactEmail,
      message,
    } = await request.json()

    console.log('Received data:', { venueId, venueName, tier, contactName, contactEmail })

    if (!venueId || !tier || !contactName || !contactEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['standard', 'premium'].includes(tier)) {
      return Response.json({ error: 'Invalid tier for checkout' }, { status: 400 })
    }

    const priceId =
      tier === 'premium'
        ? process.env.STRIPE_PREMIUM_PRICE_ID
        : process.env.STRIPE_STANDARD_PRICE_ID

    if (!priceId) {
      return Response.json({ error: 'Price ID not configured' }, { status: 500 })
    }

    console.log('Using price ID:', priceId)

    // Create a Stripe customer
    const customer = await stripe.customers.create({
      email: contactEmail,
      name: contactName,
      metadata: {
        venue_id: String(venueId),
        venue_name: venueName,
        tier: tier,
      },
    })

    console.log('Created customer:', customer.id)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${siteUrl}?success=true`,
      cancel_url: `${siteUrl}/claim?cancelled=true`,
      metadata: {
        venue_id: String(venueId),
        venue_name: venueName,
        tier,
        type: 'claim_checkout',
        contact_email: contactEmail,
        contact_name: contactName,
        message: message || '',
      },
      subscription_data: {
        metadata: {
          venue_id: String(venueId),
          venue_name: venueName,
          tier,
          type: 'claim_checkout',
        },
      },
      allow_promotion_codes: true,
    })

    console.log('Created session:', session.id)
    console.log('Session URL:', session.url)

    return Response.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Claim checkout error:', error)
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}