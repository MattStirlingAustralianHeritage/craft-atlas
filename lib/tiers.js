export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    maxPhotos: 1,
    features: {
      bookingLink: false,
      socialLinks: false,
      drinksMenu: false,
      awards: false,
      featuredVideo: false,
      seasonalHighlights: false,
      promotions: false,
      qrCode: false,
      analytics: false,
    },
  },
  standard: {
    name: 'Standard',
    price: 99,
    maxPhotos: Infinity,
    features: {
      bookingLink: true,
      socialLinks: true,
      drinksMenu: true,
      awards: true,
      featuredVideo: true,
      seasonalHighlights: true,
      promotions: true,
      qrCode: true,
      analytics: true,
    },
  },
  premium: {
    name: 'Standard',
    price: 99,
    maxPhotos: Infinity,
    features: {
      bookingLink: true,
      socialLinks: true,
      drinksMenu: true,
      awards: true,
      featuredVideo: true,
      seasonalHighlights: true,
      promotions: true,
      qrCode: true,
      analytics: true,
    },
  },
}

export function getTier(tier) {
  return TIERS[tier] || TIERS.free
}

export function canUse(feature, tier) {
  const t = getTier(tier)
  if (feature === 'maxPhotos') return t.maxPhotos
  return t.features?.[feature] ?? false
}
