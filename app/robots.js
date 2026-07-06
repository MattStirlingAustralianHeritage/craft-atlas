// Some Vercel env values carry a trailing newline — trim, or the sitemap URL
// is corrupted.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au').trim()

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/vendor/', '/admin/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
