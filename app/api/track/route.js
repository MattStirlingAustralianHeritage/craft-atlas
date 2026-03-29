import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { path, referrer } = await request.json()
    const userAgent = request.headers.get('user-agent') || ''

    // Skip bots and screenshot tools
    if (
      userAgent.includes('vercel-screenshot') ||
      userAgent.includes('Googlebot') ||
      userAgent.includes('bingbot') ||
      userAgent.includes('facebookexternalhit')
    ) {
      return Response.json({ ok: true })
    }

    await supabase.from('page_views').insert({
      path,
      referrer: referrer || null,
      user_agent: userAgent,
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
