import { createServerSupabase } from '@/lib/supabase'
import { getPortalClient } from '@/lib/portal-client'
import { REGION_INFO } from '@/lib/constants'

// Some Vercel env values carry a trailing newline — trim, or every sitemap
// URL is corrupted.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au').trim()

// Supabase/PostgREST caps a single response at max-rows (1000 by default) —
// a plain .limit(10000) still comes back with only 1000 rows. Page through
// with .range() so every published venue makes the sitemap.
const PAGE_SIZE = 1000

async function fetchAllVenues(supabase) {
  const all = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await supabase
      .from('venues')
      .select('slug, updated_at')
      .eq('published', true)
      .neq('address', '')
      .not('address', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export default async function sitemap() {
  const supabase = await createServerSupabase()
  const venues = await fetchAllVenues(supabase)

  // Curated trails live in this vertical's own DB.
  const { data: trails } = await supabase
    .from('trails')
    .select('slug, created_at')
    .eq('published', true)

  // Journal articles are syndicated from the master portal.
  let articles = []
  const portal = getPortalClient()
  if (portal) {
    const { data } = await portal
      .from('articles')
      .select('slug, published_at')
      .eq('status', 'published')
      .contains('verticals', ['craft'])
    articles = data || []
  }

  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/events`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/journal`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/trails`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/partners`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  const regionPages = Object.keys(REGION_INFO).map(slug => ({
    url: `${SITE_URL}/region/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const venuePages = (venues || []).map(v => ({
    url: `${SITE_URL}/venue/${v.slug}`,
    lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const trailPages = (trails || []).map(t => ({
    url: `${SITE_URL}/trails/${t.slug}`,
    lastModified: t.created_at ? new Date(t.created_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const articlePages = (articles || []).map(a => ({
    url: `${SITE_URL}/journal/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticPages, ...regionPages, ...venuePages, ...trailPages, ...articlePages]
}
