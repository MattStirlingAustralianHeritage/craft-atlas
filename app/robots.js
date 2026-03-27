const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smallbatchatlas.com.au'

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/vendor/', '/admin/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
