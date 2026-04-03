import { Suspense } from 'react'
import MapPageClient from '@/components/MapClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Map — Every Maker & Studio in Australia",
  description: "Explore Australian makers and studios on an interactive map. Find makers, artists and studios near you.",
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageClient />
    </Suspense>
  )
}
