import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=error`)
    }

    const { error } = await supabase
      .from('subscribers')
      .update({
        status: 'active',
        confirmed_at: new Date().toISOString(),
      })
      .eq('email', decodeURIComponent(email))
      .eq('status', 'pending')

    if (error) throw error

    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=confirmed`)
  } catch (err) {
    console.error('Confirm error:', err)
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=error`)
  }
}
