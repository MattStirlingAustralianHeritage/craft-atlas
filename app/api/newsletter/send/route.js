import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smallbatchatlas.com.au'

function buildEmailHtml(issue, articles, unsubscribeToken) {
  const articleBlocks = articles.map(a => {
    const url = `${SITE_URL}/journal/${a.slug}`
    return `
      <div style="border-top: 1px solid #e5e0d8; padding: 28px 0;">
        ${a.is_partner_content ? '<p style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin: 0 0 8px;">Partner</p>' : ''}
        <h2 style="font-size: 20px; font-weight: normal; margin: 0 0 10px; line-height: 1.3;">
          <a href="${url}" style="color: #1a1a1a; text-decoration: none;">${a.title}</a>
        </h2>
        ${a.deck ? `<p style="font-size: 15px; color: #555; margin: 0 0 12px; line-height: 1.5;">${a.deck}</p>` : ''}
        ${a.excerpt ? `<p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 14px;">${a.excerpt.slice(0, 200)}${a.excerpt.length > 200 ? '…' : ''}</p>` : ''}
        <a href="${url}" style="font-size: 13px; color: #b8862b; text-decoration: none; letter-spacing: 0.02em;">Read more →</a>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background: #f5f2ed;">
      <div style="max-width: 580px; margin: 0 auto; background: #faf8f5; font-family: Georgia, serif;">
        
        <!-- Header -->
        <div style="padding: 32px 40px 24px; border-bottom: 2px solid #1a1a1a;">
          <a href="${SITE_URL}" style="text-decoration: none; color: #1a1a1a;">
            <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 4px; color: #666;">Small Batch Atlas</p>
            <h1 style="font-size: 13px; font-weight: normal; margin: 0; letter-spacing: 0.05em; color: #1a1a1a;">The Monthly Edit</h1>
          </a>
        </div>

        <!-- Intro -->
        <div style="padding: 32px 40px 8px;">
          <p style="font-size: 16px; line-height: 1.7; color: #1a1a1a; margin: 0;">${issue.intro}</p>
        </div>

        <!-- Articles -->
        <div style="padding: 8px 40px 32px;">
          ${articleBlocks}
        </div>

        <!-- Footer -->
        <div style="padding: 24px 40px; border-top: 1px solid #e5e0d8; background: #f0ece4;">
          <p style="font-size: 12px; color: #888; margin: 0 0 8px; line-height: 1.5;">
            You're receiving this because you subscribed at smallbatchatlas.com.au
          </p>
          <p style="font-size: 12px; margin: 0;">
            <a href="${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}" style="color: #888; text-decoration: underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color: #888; text-decoration: underline;">Visit the directory</a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('key')
    if (password !== process.env.ADMIN_PASSWORD) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { issueId } = await request.json()
    if (!issueId) return Response.json({ error: 'issueId required' }, { status: 400 })

    // Get the issue
    const { data: issue, error: issueError } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('id', issueId)
      .single()

    if (issueError || !issue) return Response.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.status === 'sent') return Response.json({ error: 'Issue already sent' }, { status: 400 })

    // Get articles for this issue
    const { data: issueArticles } = await supabase
      .from('newsletter_issue_articles')
      .select('position, articles(id, title, slug, deck, excerpt, is_partner_content)')
      .eq('issue_id', issueId)
      .order('position')

    const articles = issueArticles?.map(ia => ia.articles) || []

    // Get all confirmed subscribers
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('email, unsubscribe_token')
      .eq('status', 'active')

    if (!subscribers || subscribers.length === 0) {
      return Response.json({ error: 'No active subscribers' }, { status: 400 })
    }

    // Send to each subscriber with their unique unsubscribe token
    let sent = 0
    let failed = 0

    for (const subscriber of subscribers) {
      try {
        const html = buildEmailHtml(issue, articles, subscriber.unsubscribe_token)
        await resend.emails.send({
          from: 'Small Batch Atlas <hello@smallbatchatlas.com.au>',
          to: subscriber.email,
          subject: issue.subject,
          html,
        })
        sent++
      } catch (err) {
        console.error(`Failed to send to ${subscriber.email}:`, err)
        failed++
      }
    }

    // Mark issue as sent
    await supabase
      .from('newsletter_issues')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', issueId)

    return Response.json({ success: true, sent, failed })
  } catch (err) {
    console.error('Send error:', err)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
