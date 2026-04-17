import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPortalClient } from '@/lib/portal-client'
import TypographicCard from '@/components/TypographicCard'

export const revalidate = 60

function mdToHtml(md) {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1" /></figure>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li data-t="ol">$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li data-t="ol">[\s\S]*?<\/li>\n?)+/g, m => `<ol>${m.replace(/ data-t="ol"/g, '')}</ol>`)
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
  html = html.split('\n').map(line => {
    const t = line.trim()
    if (!t) return ''
    if (/^<(h[123]|ul|ol|li|blockquote|hr|figure|p)/.test(t)) return t
    return `<p>${t}</p>`
  }).filter(Boolean).join('\n')
  return html || ''
}

async function getArticle(slug) {
  const portal = getPortalClient()
  if (!portal) return null
  const { data } = await portal
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .contains('verticals', ['craft'])
    .single()

  return data || null
}

export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug)
  if (!article) return { title: 'Not Found' }
  return {
    title: article.meta_title || `${article.title} — Craft Atlas`,
    description: article.meta_description || article.deck,
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  const bodyHtml = mdToHtml(article.body)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ width: '100%', maxHeight: 520, overflow: 'hidden', position: 'relative' }}>
        <TypographicCard name={article.title} vertical="craft" category={article.category} aspectRatio="21/9" imageUrl={article.hero_image_url} />
      </div>

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '56px 24px 120px' }}>

        {/* Breadcrumb */}
        <Link href="/journal" style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 40 }}>
          ← Journal
        </Link>

        {/* Category + partner badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {article.category && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>
              {article.category}
            </span>
          )}
          {article.is_partner_content && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 2 }}>
              Partner
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--text)', margin: '0 0 20px 0', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          {article.title}
        </h1>

        {/* Deck */}
        {article.deck && (
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 28px 0', fontFamily: 'var(--font-sans)', borderLeft: '3px solid var(--primary)', paddingLeft: 18, fontStyle: 'italic' }}>
            {article.deck}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {article.author && <span>By {article.author}</span>}
          {article.published_at && <span>{formatDate(article.published_at)}</span>}
          {article.reading_time && <span>{article.reading_time} min read</span>}
        </div>

        {/* Body */}
        <div
          className="journal-body"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {/* Tags */}
        {(article.tags || []).length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {article.tags.map(tag => (
              <span key={tag} style={{ padding: '4px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Partner disclosure */}
        {article.is_partner_content && (
          <div style={{ marginTop: 48, padding: '20px 24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
            <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Partner content.</span>{' '}
              Produced in partnership with{' '}
              {article.partners?.slug ? (
                <Link href={`/partners/${article.partners.slug}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {article.partners.org_name}
                </Link>
              ) : (
                article.partners?.org_name || 'a partner organisation'
              )}
              . Editorial standards apply.
            </p>
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: 64 }}>
          <Link href="/journal" style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.06em' }}>
            ← Back to Journal
          </Link>
        </div>

      </div>

      <style>{`
        .journal-body { font-size: 17px; line-height: 1.85; color: var(--text-2); font-family: var(--font-serif); max-width: 580px; }
        .journal-body h2 { font-family: var(--font-serif); font-size: 1.5em; font-weight: 400; color: var(--text); margin: 1.6em 0 0.5em; line-height: 1.25; letter-spacing: -0.01em; }
        .journal-body h3 { font-family: var(--font-sans); font-size: 0.9em; font-weight: 700; color: var(--text); margin: 1.4em 0 0.4em; letter-spacing: 0.06em; text-transform: uppercase; }
        .journal-body p { margin: 0 0 1em; }
        .journal-body strong, .journal-body b { font-weight: 700; color: var(--text); }
        .journal-body em, .journal-body i { font-style: italic; }
        .journal-body a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
        .journal-body ul, .journal-body ol { padding-left: 1.5em; margin: 0.5em 0 1em; }
        .journal-body li { margin-bottom: 0.4em; }
        .journal-body blockquote { border-left: 3px solid var(--primary); margin: 1.5em 0; padding: 4px 0 4px 20px; color: var(--text-2); font-style: italic; font-size: 1.05em; }
        .journal-body blockquote p { margin: 0; }
        .journal-body hr { border: none; border-top: 1px solid var(--border); margin: 2.5em 0; }
        .journal-body code { font-family: 'Menlo', 'Monaco', monospace; font-size: 0.83em; background: var(--bg-2); border: 1px solid var(--border); padding: 2px 5px; border-radius: 3px; }
        .journal-body figure { margin: 1.8em 0; }
        .journal-body figure img { max-width: 100%; height: auto; display: block; border-radius: 3px; }
        .journal-body img { max-width: 100%; height: auto; display: block; border-radius: 3px; margin: 2em 0; }
      `}</style>

    </div>
  )
}
