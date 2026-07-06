// lib/admin-token.js
// HMAC-signed admin session token. Replaces the old forgeable static cookie
// value ('admin_authenticated'), which any client could set to gain admin.
// Uses Web Crypto (crypto.subtle) so the SAME helper works in both the Node
// runtime (API routes / server components) and the Edge runtime (middleware).
// Signed with ADMIN_SESSION_SECRET, falling back to ADMIN_PASSWORD (already the
// admin credential), so no new env var is required to avoid a lockout.

const enc = new TextEncoder()
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days (matches the cookie maxAge)

function adminSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
}

async function hmacHex(payload, key) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Returns a signed token `admin.<issuedMs>.<hmac>`, or null if no secret is set.
export async function mintAdminToken() {
  const key = adminSecret()
  if (!key) return null
  const payload = `admin.${Date.now()}`
  return `${payload}.${await hmacHex(payload, key)}`
}

// Verifies signature + age. Rejects anything that isn't a valid, unexpired,
// correctly-signed token (so the legacy static string no longer passes).
export async function verifyAdminToken(token, maxAgeMs = MAX_AGE_MS) {
  const key = adminSecret()
  if (!key || !token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [prefix, ts, sig] = parts
  if (prefix !== 'admin') return false
  const issued = parseInt(ts, 10)
  if (!Number.isFinite(issued)) return false
  const age = Date.now() - issued
  if (age < 0 || age > maxAgeMs) return false
  const expected = await hmacHex(`${prefix}.${ts}`, key)
  if (sig.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
