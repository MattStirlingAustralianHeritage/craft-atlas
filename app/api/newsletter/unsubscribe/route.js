import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=error`)
    }

    const { error } = await supabase
      .from('subscribers')
      .update({ status: 'unsubscribed' })
      .eq('unsubscribe_token', token)

    if (error) throw error

    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=unsubscribed`)
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/?newsletter=error`)
  }
}
