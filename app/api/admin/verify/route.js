import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request) {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth || adminAuth.value !== 'admin_authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { listingId } = await request.json()
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 })

  const sb = getSupabase()
  const { data, error } = await sb
    .from('venues')
    .update({ verified: true, verified_at: new Date().toISOString(), verification_source: 'editorial_review' })
    .eq('id', listingId)
    .select('id, name, verified, verified_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, listing: data })
}
