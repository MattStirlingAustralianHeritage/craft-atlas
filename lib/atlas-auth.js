/**
 * Atlas Network Auth Utilities
 *
 * Client-side helpers for reading the shared JWT from localStorage
 * and extracting user identity + role. Used by components and pages
 * that need to gate access based on the unified auth system.
 */

const ATLAS_AUTH_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'
const TOKEN_KEY = 'atlas_auth_token'

/**
 * Get the stored Atlas auth token from localStorage.
 * Returns null if not present or if running on the server.
 */
export function getAtlasToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Parse the JWT payload without verification (client-side only).
 * For display purposes — actual verification happens server-side via /api/auth/verify.
 *
 * @returns {{ sub: string, email: string, name: string, role: string, verticals?: object, council_id?: string } | null}
 */
export function parseAtlasToken() {
  const token = getAtlasToken()
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'user',
      verticals: payload.verticals || {},
      council_id: payload.council_id || null,
    }
  } catch {
    return null
  }
}

/**
 * Check if the current user has a specific role.
 * Admin role implicitly grants all other roles.
 */
export function hasRole(requiredRole) {
  const user = parseAtlasToken()
  if (!user) return false
  if (user.role === 'admin') return true
  return user.role === requiredRole
}

/**
 * Check if the current user is a vendor (or admin).
 */
export function isVendor() {
  return hasRole('vendor')
}

/**
 * Check if the current user is an admin.
 */
export function isAdmin() {
  const user = parseAtlasToken()
  return user?.role === 'admin'
}

/**
 * Redirect to Australian Atlas login with return URL.
 * @param {string} vertical - Name of the vertical (e.g. 'Small Batch Atlas')
 * @param {string} returnUrl - URL to return to after auth (defaults to current page)
 */
export function redirectToLogin(vertical = '', returnUrl = null) {
  if (typeof window === 'undefined') return
  const target = returnUrl || window.location.href
  window.location.href = `${ATLAS_AUTH_URL}/api/auth/shared?return_url=${encodeURIComponent(target)}&vertical=${encodeURIComponent(vertical)}`
}

/**
 * Sign out by clearing the stored token.
 */
export function signOut() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Call the promote-role API on Australian Atlas.
 * Used by vertical API routes when approving vendor claims.
 *
 * @param {string} userId - UUID of the user on Australian Atlas
 * @param {string} role - Target role ('vendor', 'council', etc.)
 * @param {string} vertical - Vertical slug (e.g. 'sba')
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function promoteRole(userId, role, vertical = null) {
  const apiSecret = process.env.SHARED_API_SECRET
  if (!apiSecret) {
    console.error('SHARED_API_SECRET not configured')
    return { success: false, error: 'Missing API secret' }
  }

  try {
    const res = await fetch(`${ATLAS_AUTH_URL}/api/auth/promote-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': apiSecret,
      },
      body: JSON.stringify({ userId, role, vertical }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error }
    }
    return { success: true }
  } catch (error) {
    console.error('Promote role error:', error)
    return { success: false, error: error.message }
  }
}
