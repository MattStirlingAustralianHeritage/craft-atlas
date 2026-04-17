import { createClient } from '@supabase/supabase-js'

/**
 * Read-only client for the Australian Atlas master portal DB.
 * Used to fetch syndicated content (articles, etc.) that lives
 * centrally but is displayed on individual verticals.
 *
 * Requires env vars:
 *   PORTAL_SUPABASE_URL  — Australian Atlas Supabase project URL
 *   PORTAL_SUPABASE_ANON_KEY — Anon/public key (read-only is fine)
 */
let portalClient = null

export function getPortalClient() {
  if (portalClient) return portalClient
  const url = process.env.PORTAL_SUPABASE_URL
  const key = process.env.PORTAL_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[portal-client] PORTAL_SUPABASE_URL and PORTAL_SUPABASE_ANON_KEY not set — portal features unavailable')
    return null
  }
  portalClient = createClient(url, key)
  return portalClient
}
