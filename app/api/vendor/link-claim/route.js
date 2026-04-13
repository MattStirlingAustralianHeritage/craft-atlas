// app/api/vendor/link-claim/route.js
// Orphan claim resolution: links an authenticated vendor to an
// approved claim that was created before they registered.

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    const { data: orphanedClaims, error: findError } = await admin
      .from('claims')
      .select('id, venue_id, venue_name, selected_tier')
      .eq('contact_email', user.email)
      .eq('status', 'approved')
      .is('user_id', null)

    if (findError) throw findError
    if (!orphanedClaims?.length) {
      return Response.json({ linked: 0, message: 'No unlinked claims found for your email.' })
    }

    let linked = 0
    for (const claim of orphanedClaims) {
      const { error } = await admin.from('claims').update({ user_id: user.id }).eq('id', claim.id)
      if (!error) linked++

      if (claim.venue_id) {
        await admin.from('vendor_profiles')
          .upsert({ user_id: user.id, full_name: user.user_metadata?.full_name || user.email, email: user.email }, { onConflict: 'user_id' })
          .then(null, () => {})
      }
    }

    return Response.json({
      linked,
      claims: orphanedClaims.map(c => ({ id: c.id, venue_name: c.venue_name })),
      message: `Linked ${linked} claim${linked !== 1 ? 's' : ''} to your account.`,
    })
  } catch (err) {
    console.error('Link-claim error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
