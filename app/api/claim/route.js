import { createClient } from '@supabase/supabase-js'

// ── Rate limiter (in-memory sliding window) ──────────────────────────────────
const _rateWindows = new Map()
function _checkRate(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  let entry = _rateWindows.get(ip)
  if (!entry || now - entry.start > 60000) {
    entry = { start: now, count: 0 }
    _rateWindows.set(ip, entry)
  }
  entry.count++
  if (entry.count > 5) {
    return Response.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }
  return null
}

export async function POST(request) {
  const limited = _checkRate(request)
  if (limited) return limited

  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
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

    // Cross-system check against Atlas master DB
    try {
      const ATLAS_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'
      const checkRes = await fetch(`${ATLAS_URL}/api/internal/claim-check?vertical=craft&source_id=${venueId}`, {
        headers: { 'x-api-secret': process.env.SHARED_API_SECRET },
      })
      const checkData = await checkRes.json()
      if (checkData.exists) {
        return Response.json({ error: 'A claim for this venue is already under review on Australian Atlas.' }, { status: 409 })
      }
    } catch (crossCheckErr) {
      console.error('Cross-system claim check failed:', crossCheckErr.message)
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
    const { data: claim, error: claimError } = await supabaseAdmin
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
      .select('id')
      .single()

    if (claimError) {
      if (claimError.code === '23505') {
        return Response.json({ error: 'A claim for this venue is already under review.' }, { status: 409 })
      }
      console.error('Claim insert error:', claimError.message)
      return Response.json({ error: 'Failed to create claim' }, { status: 500 })
    }

    // NOTE: venue is NOT marked is_claimed here — that happens when admin approves

    // Sync to Atlas master claims_review (non-fatal)
    try {
      const ATLAS_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'
      await fetch(`${ATLAS_URL}/api/internal/sync-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': process.env.SHARED_API_SECRET,
        },
        body: JSON.stringify({
          vertical: 'craft',
          source_id: venueId,
          source_claim_id: claim?.id || null,
          venue_name: venue.name,
          contact_name: name,
          contact_email: email,
          tier: 'free',
        }),
      })
    } catch (syncErr) {
      console.error('Atlas sync-claim failed:', syncErr.message)
    }

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
