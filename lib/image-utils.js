export function isUnsplashUrl(url) {
  if (!url) return true
  return url.includes('unsplash.com') || url.includes('images.unsplash.com')
}
