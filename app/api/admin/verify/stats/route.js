import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth || adminAuth.value !== 'admin_authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSupabase()
  const [totalResult, verifiedResult] = await Promise.all([
    sb.from('venues').select('id', { count: 'exact', head: true }),
    sb.from('venues').select('id', { count: 'exact', head: true }).eq('verified', true),
  ])

  return NextResponse.json({ total: totalResult.count || 0, verified: verifiedResult.count || 0 })
}
