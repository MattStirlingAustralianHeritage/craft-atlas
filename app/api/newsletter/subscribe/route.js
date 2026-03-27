import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { email, name, source } = await request.json()

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const unsubscribe_token = randomUUID()
    const confirmToken = randomUUID()
    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/newsletter/confirm?token=${confirmToken}&email=${encodeURIComponent(email)}`

    // Upsert subscriber — if already exists, just resend confirmation
    const { error } = await supabase
      .from('subscribers')
      .upsert(
        {
          email,
          name: name || null,
          source: source || 'website',
          status: 'pending',
          unsubscribe_token,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )

    if (error) throw error

    // Store confirm token temporarily in a separate column (add confirm_token to subscribers if needed)
    // For now we encode it in the URL and verify via a signed approach
    // Send confirmation email
    await resend.emails.send({
      from: 'Small Batch Atlas <hello@smallbatchatlas.com.au>',
      to: email,
      subject: 'Confirm your subscription to Small Batch Atlas',
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h2 style="font-size: 24px; font-weight: normal; margin-bottom: 16px;">One more step</h2>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Thanks for signing up to the Small Batch Atlas newsletter — a monthly edit of the best small-batch producers in Australia.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            Click below to confirm your subscription.
          </p>
          <a href="${confirmUrl}" style="display: inline-block; background: #b8862b; color: #fff; text-decoration: none; padding: 14px 28px; font-size: 15px; letter-spacing: 0.02em;">
            Confirm subscription
          </a>
          <p style="font-size: 13px; color: #666; margin-top: 40px; line-height: 1.5;">
            If you didn't sign up for this, you can ignore this email.
          </p>
        </div>
      `,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
