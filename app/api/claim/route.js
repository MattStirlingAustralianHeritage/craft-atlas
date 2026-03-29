import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { name, email, password, venueId } = await request.json()

    if (!name || !email || !password || !venueId) {
      return Response.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check venue exists and is not already claimed
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, name, is_claimed')
      .eq('id', venueId)
      .single()

    if (!venue) return Response.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.is_claimed) return Response.json({ error: 'This venue has already been claimed' }, { status: 409 })

    // Check no pending/approved claim already exists for this venue
    const { data: existingClaim } = await supabaseAdmin
      .from('claims')
      .select('id, status')
      .eq('venue_id', venueId)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existingClaim) {
      return Response.json({ error: existingClaim.status === 'pending' ? 'A claim for this venue is already under review.' : 'This venue has already been claimed.' }, { status: 409 })
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (authError) {
      const msg = authError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return Response.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
      }
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // Create vendor_profiles row
    const { error: profileError } = await supabaseAdmin
      .from('vendor_profiles')
      .upsert({ user_id: userId, full_name: name, email }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Profile upsert error:', profileError.message)
    }

    // Insert claim row — status: pending, awaiting manual approval
    const { error: claimError } = await supabaseAdmin
      .from('claims')
      .insert({
        user_id: userId,
        venue_id: venueId,
        venue_name: venue.name,
        contact_name: name,
        contact_email: email,
        selected_tier: 'free',
        status: 'pending',
      })

    if (claimError) {
      console.error('Claim insert error:', claimError.message)
      return Response.json({ error: 'Failed to create claim' }, { status: 500 })
    }

    // NOTE: venue is NOT marked is_claimed here — that happens when admin approves

    // Send admin notification email
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Craft Atlas <hello@craftatlas.com.au>',
        to: 'hello@craftatlas.com.au',
        subject: `New free claim: ${venue.name}`,
        text: `A new free claim has been submitted.\n\nVenue: ${venue.name}\nClaimant: ${name} <${email}>\n\nReview it in your admin dashboard.`,
      })
    } catch (emailErr) {
      console.error('Admin notification email failed:', emailErr)
    }

    return Response.json({ success: true, pending: true })
  } catch (err) {
    console.error('Claim API error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
