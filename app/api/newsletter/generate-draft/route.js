import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request) {
  return POST(request)
}

export async function POST(request) {
  try {
    // Check admin auth — supports both query param (admin UI) and Vercel cron header
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('key')
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    const isAuthed = password === process.env.ADMIN_PASSWORD || cronSecret === process.env.CRON_SECRET
    if (!isAuthed) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Find the last sent issue to determine cutoff date
    const { data: lastIssue } = await supabase
      .from('newsletter_issues')
      .select('sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    const since = lastIssue?.sent_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Pull published articles since last issue
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, slug, deck, excerpt, category, featured, is_partner_content, published_at, author_name')
      .eq('status', 'published')
      .gte('published_at', since)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(6)

    if (articlesError) throw articlesError

    if (!articles || articles.length === 0) {
      return Response.json({ error: 'No new articles to include' }, { status: 400 })
    }

    // Check if a draft already exists for this month
    const thisMonth = new Date().toISOString().slice(0, 7)
    const { data: existingDraft } = await supabase
      .from('newsletter_issues')
      .select('id')
      .eq('status', 'draft')
      .gte('created_at', `${thisMonth}-01`)
      .single()

    if (existingDraft) {
      return Response.json({ message: 'Draft already exists for this month', id: existingDraft.id })
    }

    // Build article summaries for the AI
    const articleSummaries = articles.map((a, i) =>
      `${i + 1}. "${a.title}"${a.deck ? ` — ${a.deck}` : ''}${a.excerpt ? `\nExcerpt: ${a.excerpt}` : ''}${a.category ? `\nCategory: ${a.category}` : ''}${a.is_partner_content ? '\n[Partner content]' : ''}`
    ).join('\n\n')

    // Generate subject line and intro with Claude
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are the editor of Craft Atlas, a curated directory and publication for Australian makers, artists and studios. Write a newsletter intro and subject line for this month's issue.

Voice: Editorial, measured, place-based. Knowledgeable but not precious. No marketing language. No exclamation marks. Think a thoughtful food/travel editor, not a brand.

This month's articles:
${articleSummaries}

Return ONLY a JSON object with exactly these two fields:
{
  "subject": "a compelling subject line under 60 characters",
  "intro": "a 2-3 sentence editorial intro paragraph that sets the tone for this issue, references the content naturally without listing it mechanically"
}

No preamble, no explanation, no markdown. Just the JSON.`
      }]
    })

    let generated
    try {
      generated = JSON.parse(completion.content[0].text)
    } catch {
      generated = {
        subject: `Craft Atlas — ${new Date().toLocaleString('en-AU', { month: 'long', year: 'numeric' })}`,
        intro: 'This month on Craft Atlas, we\'ve been focused on what makes a maker worth seeking out — the specificity of place, the patience of process, and the people behind the work.'
      }
    }

    // Create the draft issue
    const { data: issue, error: issueError } = await supabase
      .from('newsletter_issues')
      .insert({
        subject: generated.subject,
        intro: generated.intro,
        status: 'draft',
      })
      .select()
      .single()

    if (issueError) throw issueError

    // Link articles to the issue
    const articleLinks = articles.map((a, i) => ({
      issue_id: issue.id,
      article_id: a.id,
      position: i,
    }))

    await supabase.from('newsletter_issue_articles').insert(articleLinks)

    return Response.json({ success: true, issue })
  } catch (err) {
    console.error('Generate draft error:', err)
    return Response.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
