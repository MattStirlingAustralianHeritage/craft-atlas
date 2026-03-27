import MapPageClient from '@/components/MapClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Map — Every Distillery, Brewery & Winery in Australia",
  description: "Explore Australia's craft drinks scene on an interactive map. Find distilleries, breweries and wineries near you.",
}

export default function MapPage() {
  return <MapPageClient />
}
