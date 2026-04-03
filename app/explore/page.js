import { Suspense } from 'react'
import ExploreClient from '@/components/ExploreClient'

export const metadata = {
  title: "Explore Australian Makers & Studios",
  description: "Browse makers, artists and studios across Australia. Filter by craft, state, and region.",
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <ExploreClient />
    </Suspense>
  )
}
