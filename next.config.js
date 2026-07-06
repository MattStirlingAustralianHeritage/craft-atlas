/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=()' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') || '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Australian Atlas master portal storage — gallery/hero images now
        // served live from the portal (single source of truth).
        protocol: 'https',
        hostname: 'nyhkcmvhwbydsqsyvizs.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        // Apex → www: one canonical host for SEO (mirrors the portal).
        source: '/:path*',
        has: [{ type: 'host', value: 'craftatlas.com.au' }],
        destination: 'https://www.craftatlas.com.au/:path*',
        permanent: true,
      },
      {
        source: '/vendor',
        destination: '/vendor/login',
        permanent: false,
      },
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl',
    }
    return config
  },
}

module.exports = nextConfig
