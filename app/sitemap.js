import { createServerSupabase } from '@/lib/supabase'
import { REGION_INFO } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smallbatchatlas.com.au'

export default async function sitemap() {
  const supabase = await createServerSupabase()
  const { data: venues } = await supabase
    .from('venues')
    .select('slug, updated_at')
    .eq('status', 'published')
    .limit(10000)

  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
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

  return [...staticPages, ...regionPages, ...venuePages]
}
