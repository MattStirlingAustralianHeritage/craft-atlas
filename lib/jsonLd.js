import { isApprovedImageSource } from '@/lib/image-utils'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.craftatlas.com.au'

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Craft Atlas',
    url: SITE_URL,
    description: "Australian makers & studios — ceramics, visual art, jewellery, textiles, woodwork, glass and printmaking.",
  }
}

export function venueJsonLd(venue) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    description: venue.description || '',
    url: `${SITE_URL}/venue/${venue.slug}`,
    telephone: venue.phone || undefined,
    address: venue.address ? {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressRegion: venue.state,
      addressCountry: 'AU',
    } : undefined,
    geo: venue.latitude && venue.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude,
    } : undefined,
    image: isApprovedImageSource(venue.hero_image_url) ? venue.hero_image_url : undefined,
    openingHours: venue.opening_hours || undefined,
  }
}

export function venueListJsonLd(venues, meta = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: meta.name || 'Australian Makers & Studios',
    description: meta.description || '',
    url: `${SITE_URL}${meta.path || '/explore'}`,
    numberOfItems: venues.length,
    itemListElement: venues.slice(0, 50).map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: v.name,
        url: `${SITE_URL}/venue/${v.slug}`,
      },
    })),
  }
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined,
    })),
  }
}
