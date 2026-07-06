import Link from 'next/link'
import { getPortalClient } from '@/lib/portal-client'
import TypographicCard from '@/components/TypographicCard'

export const metadata = {
  title: 'Journal — Craft Atlas',
  description: 'Stories, guides and maker trails from Australia\'s craft regions.',
  alternates: { canonical: '/journal' },
}

export const revalidate = 60
// supabase-js reads carry auth headers that Next would otherwise treat as
// no-store, silently forcing this route dynamic. 'default-cache' lets ISR cache.
export const fetchCache = 'default-cache'

async function getArticles() {
  const portal = getPortalClient()
  if (!portal) return []
  const { data } = await portal
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .contains('verticals', ['craft'])
    .order('published_at', { ascending: false })
    .limit(50)

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

      {/* Masthead */}
      <section style={{ padding: '0 24px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div className="page-masthead" style={{ maxWidth: 600, margin: '0 auto' }}>
          <p className="section-dateline" style={{ justifyContent: 'center' }}>Journal</p>
          <h1 className="masthead-title" style={{ margin: '14px auto 0' }}>
            Stories from the studio
          </h1>
          <p className="masthead-sub" style={{ margin: '14px auto 0' }}>
            Region guides, maker trails, and stories from Australia&apos;s makers and studios.
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
                  <TypographicCard name={article.title} vertical="craft" category={article.category} aspectRatio="16/9" imageUrl={article.hero_image_url} />

                  <div style={{ padding: '20px 22px 24px' }}>
                    {/* Category + partner badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      {article.category && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontFamily: 'var(--font-sans)' }}>
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
