import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { venueId } = await request.json()
    if (!venueId) return Response.json({ error: 'venueId is required' }, { status: 400 })

    const { data: venue } = await supabaseAdmin
      .from('venues').select('id, name').eq('id', venueId).single()

    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 })
    // Claim status checked via claims table below

    const { data: existingClaim } = await supabaseAdmin
      .from('claims').select('id, status').eq('venue_id', venueId)
      .in('status', ['pending', 'approved']).maybeSingle()

    if (existingClaim) {
      return Response.json({ error: existingClaim.status === 'pending' ? 'A claim for this venue is already under review.' : 'This venue has already been claimed.' }, { status: 409 })
    }

    await supabaseAdmin.from('vendor_profiles')
      .upsert({ user_id: user.id, email: user.email }, { onConflict: 'user_id' })

    const { error: claimError } = await supabaseAdmin.from('claims').insert({
      user_id: user.id,
      venue_id: venueId,
      venue_name: venue.name,
      contact_name: user.user_metadata?.full_name || user.email,
      contact_email: user.email,
      selected_tier: 'free',
      status: 'pending',
    })

    if (claimError) {
      console.error('Claim insert error:', claimError.message)
      return Response.json({ error: 'Failed to create claim' }, { status: 500 })
    }

    // NOTE: venue is NOT marked is_claimed here — that happens when admin approves
    // TODO: send email notification to admin when claim is submitted

    return Response.json({ success: true, pending: true })
  } catch (err) {
    console.error('Claim existing user API error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
