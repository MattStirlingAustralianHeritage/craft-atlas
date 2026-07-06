// lib/newsletter-token.js
// Deterministic HMAC confirmation token for newsletter double-opt-in.
// The confirm route can validate the emailed link WITHOUT storing anything:
// token = HMAC-SHA256(lowercased-email). Closes the old bypass where confirm
// activated a pending subscriber by email alone (ignoring the token), so anyone
// could confirm any pending email by hitting /confirm?email=<addr>.
import { createHmac, timingSafeEqual } from 'crypto'

function secret() {
  return process.env.NEWSLETTER_CONFIRM_SECRET
    || process.env.ADMIN_PASSWORD
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ''
}

export function newsletterConfirmToken(email) {
  return createHmac('sha256', secret()).update(String(email).toLowerCase().trim()).digest('hex')
}

export function verifyNewsletterConfirmToken(email, token) {
  if (!email || !token || typeof token !== 'string') return false
  const expected = newsletterConfirmToken(email)
  if (token.length !== expected.length) return false
  try { return timingSafeEqual(Buffer.from(token), Buffer.from(expected)) } catch { return false }
}
