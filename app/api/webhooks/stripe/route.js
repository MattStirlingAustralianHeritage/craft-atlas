import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const { claim_id, venue_id } = event.data.object.metadata || {}
    if (claim_id && venue_id) {
      await supabaseAdmin.from('claims').update({ status: 'approved', selected_tier: 'standard' }).eq('id', claim_id)
      await supabaseAdmin.from('venues').update({ is_claimed: true, listing_tier: 'standard' }).eq('id', venue_id)
      console.log(`Claim ${claim_id} approved for venue ${venue_id}`)
    }
  }
  return new Response('OK', { status: 200 })
}
