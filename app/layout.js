import './globals.css'
import DiscoveryAgent from '@/components/DiscoveryAgent'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import PageTracker from '@/components/PageTracker'

export const metadata = {
  title: {
    default: "Small Batch Atlas — Australia's Craft Drinks Directory",
    template: '%s | Small Batch Atlas',
  },
  description: "Discover Australia's distilleries, breweries and wineries. From the Barossa to the Tamar, every cellar door, taproom and tasting room.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smallbatchatlas.com.au'),
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
