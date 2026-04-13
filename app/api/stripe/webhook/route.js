// app/api/stripe/webhook/route.js
// Handles both vendor upgrade and claim_checkout flows

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const ATLAS_AUTH_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
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

  // ── Idempotency check ──────────────────────────────────────────────────────
  const { data: alreadyProcessed } = await supabase
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (alreadyProcessed) {
    console.log(`[stripe-webhook] Skipping duplicate event ${event.id}`)
    return Response.json({ received: true, duplicate: true })
  }

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
          await handleClaimPaymentSuccess(supabase, claimId, venueId, tier, subscriptionId)
        } else {
          await updateVenueSubscription(supabase, venueId, tier, subscriptionId, 'active')
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

        await updateVenueSubscription(supabase, venueId, tier, subscriptionId, 'active')
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

        await updateVenueSubscription(supabase, venueId, tier, subscription.id, status)
        break
      }
    }

    // ── Record processed event ──────────────────────────────────────────────
    await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type })
      .then(null, err => console.error('[stripe-webhook] Failed to record event:', err))

    return Response.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleClaimPaymentSuccess(supabase, claimId, venueId, tier, subscriptionId) {
  if (!claimId) {
    console.error('claim_checkout missing claim_id in metadata')
    return
  }

  const { error: claimError } = await supabase
    .from('claims')
    .update({ status: 'approved' })
    .eq('id', claimId)

  if (claimError) {
    console.error(`Failed to approve claim ${claimId}:`, claimError)
    throw claimError
  }

  await updateVenueSubscription(supabase, venueId, tier, subscriptionId, 'active')

  // Mark venue as claimed
  await supabase.from('venues').update({ is_claimed: true }).eq('id', venueId)

  // Promote vendor role on Australian Atlas (non-fatal)
  try {
    const { data: claimData } = await supabase
      .from('claims')
      .select('contact_email')
      .eq('id', claimId)
      .single()

    if (claimData?.contact_email) {
      await fetch(`${ATLAS_AUTH_URL}/api/auth/promote-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': process.env.SHARED_API_SECRET,
        },
        body: JSON.stringify({
          email: claimData.contact_email,
          role: 'vendor',
          vertical: 'craft',
        }),
      })
    }
  } catch (promoteErr) {
    console.error('Failed to promote vendor role on Atlas:', promoteErr.message)
  }
}

async function updateVenueSubscription(supabase, venueId, tier, subscriptionId, status) {
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
}

function getTierFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard'
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium'
  return 'standard'
}
