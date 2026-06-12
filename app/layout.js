import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import DiscoveryAgent from '@/components/DiscoveryAgent'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageTracker from '@/components/PageTracker'
import AtlasAnalytics from '@/components/AtlasAnalytics'
import AtlasHandoffBar from '@/components/AtlasHandoffBar'

// Self-hosted via next/font — replaces the render-blocking Google Fonts
// @import that used to sit at the top of globals.css.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-dmsans',
})

export const metadata = {
  title: {
    default: "Craft Atlas — Australian Makers & Studios",
    template: '%s | Craft Atlas',
  },
  description: "Discover Australian makers, artists and studios. Ceramics, visual art, jewellery, textiles, woodwork, glass and printmaking — curated, independent, beautifully mapped.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au'),
  openGraph: {
    type: 'website',
    siteName: 'Craft Atlas',
    locale: 'en_AU',
    title: "Craft Atlas — Australian Makers & Studios",
    description: "Discover Australian makers, artists and studios. Ceramics, visual art, jewellery, textiles, woodwork, glass and printmaking — curated, independent, beautifully mapped.",
  },
  twitter: {
    card: 'summary',
    title: "Craft Atlas — Australian Makers & Studios",
    description: "Discover Australian makers, artists and studios. Ceramics, visual art, jewellery, textiles, woodwork, glass and printmaking — curated, independent, beautifully mapped.",
  },
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>

      <body>
        <PageTracker />
        <AtlasAnalytics />
        <AtlasHandoffBar />
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
