export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    maxPhotos: 1,
    features: {
      bookingLink: false,
      socialLinks: false,
      practiceDescription: false,
      experiencesAndClasses: false,
      featuredVideo: false,
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
      practiceDescription: true,
      experiencesAndClasses: true,
      featuredVideo: true,
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
