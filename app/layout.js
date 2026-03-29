import './globals.css'
import DiscoveryAgent from '@/components/DiscoveryAgent'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageTracker from '@/components/PageTracker'

export const metadata = {
  title: {
    default: "Craft Atlas — Australian Makers & Studios",
    template: '%s | Craft Atlas',
  },
  description: "Discover Australian makers, artists and studios. Ceramics, visual art, jewellery, textiles, woodwork, glass and printmaking — curated, independent, beautifully mapped.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-192.png', sizes: '192x192' },
      { url: '/favicon-512.png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">

      <body>
        <PageTracker />
        <Nav />
        <main style={{ paddingTop: 64 }}>
          {children}
        </main>
        <Footer />
        <DiscoveryAgent />
    </body>
    </html>
  )
}
