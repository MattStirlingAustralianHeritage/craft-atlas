/**
 * Shared image utilities — safe to import from both client and server components.
 *
 * Whitelist approach: only images hosted on approved domains are rendered.
 * External/scraped images (Squarespace, Wix, WordPress, etc.) fall back
 * to the TypographicCard placeholder.
 */

const APPROVED_HOSTS = [
  'supabase.co',
  'storage.googleapis.com',
]

/** Returns true if the URL is from an approved (self-hosted) image source */
export function isApprovedImageSource(url) {
  if (!url) return false
  try {
    const hostname = new URL(url).hostname
    return APPROVED_HOSTS.some(host => hostname.endsWith(host))
  } catch {
    return false
  }
}

/** Returns the URL only if approved, null otherwise */
export function getDisplayImageUrl(url) {
  return isApprovedImageSource(url) ? url : null
}

/** @deprecated Use isApprovedImageSource — kept for backward compatibility */
export function isUnsplashUrl(url) {
  if (!url) return true
  return !isApprovedImageSource(url)
}
