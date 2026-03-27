// app/api/stripe/webhook/route.js
// Replaces existing webhook — handles both vendor upgrade and claim_checkout flows

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`Stripe webhook received: ${event.type}`)

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break

        const venueId = session.metadata?.venue_id
        const tier = session.metadata?.tier
        const claimId = session.metadata?.claim_id
        const type = session.metadata?.type
        const subscriptionId = session.subscription

        if (!venueId || !tier) {
          console.error('Missing venue_id or tier in session metadata')
          break
        }

        if (type === 'claim_checkout') {
          // New claim payment — approve the claim and activate the venue subscription
          await handleClaimPaymentSuccess(claimId, venueId, tier, subscriptionId)
        } else {
          // Existing vendor upgrade flow (already claimed venue)
          await updateVenueSubscription(venueId, tier, subscriptionId, 'active')
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.billing_reason !== 'subscription_cycle') break

        const subscriptionId = invoice.subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const venueId = subscription.metadata?.venue_id
        const tier = subscription.metadata?.tier

        if (!venueId) break

        await updateVenueSubscription(venueId, tier, subscriptionId, 'active')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const venueId = subscription.metadata?.venue_id
        if (!venueId) break

        await supabase
          .from('venues')
          .update({ subscription_status: 'past_due' })
          .eq('id', venueId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const venueId = subscription.metadata?.venue_id
        if (!venueId) break

        await supabase
          .from('venues')
          .update({
            subscription_tier: 'free',
            subscription_status: 'cancelled',
            subscription_id: null,
            subscription_expires_at: new Date().toISOString(),
          })
          .eq('id', venueId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const venueId = subscription.metadata?.venue_id
        if (!venueId) break

        const priceId = subscription.items.data[0]?.price.id
        const tier = getTierFromPriceId(priceId)
        const status = subscription.status === 'active' ? 'active' : subscription.status

        await updateVenueSubscription(venueId, tier, subscription.id, status)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// Handle a brand-new claim where the vendor has just paid
async function handleClaimPaymentSuccess(claimId, venueId, tier, subscriptionId) {
  if (!claimId) {
    console.error('claim_checkout missing claim_id in metadata')
    return
  }

  // 1. Mark the claim as approved
  const { error: claimError } = await supabase
    .from('claims')
    .update({ status: 'approved' })
    .eq('id', claimId)

  if (claimError) {
    console.error(`Failed to approve claim ${claimId}:`, claimError)
    throw claimError
  }

  // 2. Activate the venue subscription and mark as claimed
  await updateVenueSubscription(venueId, tier, subscriptionId, 'active')

  await supabase
    .from('venues')
    .update({ is_claimed: true })
    .eq('id', venueId)

  console.log(`Claim ${claimId} approved — venue ${venueId} activated on ${tier}`)
}

async function updateVenueSubscription(venueId, tier, subscriptionId, status) {
  const tierName = tier || 'standard'
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  const { error } = await supabase
    .from('venues')
    .update({
      subscription_tier: tierName,
      subscription_status: status,
      subscription_id: subscriptionId,
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq('id', venueId)

  if (error) {
    console.error(`Failed to update venue ${venueId}:`, error)
    throw error
  }

  console.log(`Updated venue ${venueId} to ${tierName} (${status})`)
}

function getTierFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard'
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium'
  return 'standard'
}
