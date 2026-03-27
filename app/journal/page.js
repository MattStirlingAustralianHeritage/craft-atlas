import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata = {
  title: 'Journal — Small Batch Atlas',
  description: 'Stories, guides and tasting trails from Australia\'s craft drinks regions.',
}

export const revalidate = 60

async function getArticles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, deck, category, author, reading_time, hero_image_url, published_at, tags, is_partner_content, partner_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return data || []
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function JournalPage() {
  const articles = await getArticles()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <section style={{ padding: '90px 24px 80px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
            Journal
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: 24 }}>
            Stories from the cellar door
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 0, fontFamily: 'var(--font-sans)' }}>
            Region guides, tasting trails, and stories from Australia&apos;s craft drinks producers.
          </p>
        </div>
      </section>

      {/* Article grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 120px' }}>
        {articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 15, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>No articles published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
            {articles.map((article, i) => (
              <Link key={article.id} href={`/journal/${article.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <article style={{
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: 'var(--bg)',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                  height: '100%',
                }}>
                  {/* Hero image */}
                  {article.hero_image_url ? (
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-2)' }}>
                      <img
                        src={article.hero_image_url}
                        alt={article.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{ aspectRatio: '16/9', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                        {article.category || 'Journal'}
                      </span>
                    </div>
                  )}

                  <div style={{ padding: '20px 22px 24px' }}>
                    {/* Category + partner badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      {article.category && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'var(--font-sans)' }}>
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
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', margin: '0 0 10px 0', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                      {article.title}
                    </h2>

                    {/* Deck */}
                    {article.deck && (
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 16px 0', fontFamily: 'var(--font-sans)' }}>
                        {article.deck}
                      </p>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', flexWrap: 'wrap' }}>
                      {article.author && <span>{article.author}</span>}
                      {article.published_at && <span>{formatDate(article.published_at)}</span>}
                      {article.reading_time && <span>{article.reading_time} min read</span>}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
