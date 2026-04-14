import { createClient } from '@supabase/supabase-js'

let portalClient = null

export function getPortalClient() {
  const url = process.env.PORTAL_SUPABASE_URL
  const key = process.env.PORTAL_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[portal-client] PORTAL_SUPABASE_URL or PORTAL_SUPABASE_ANON_KEY not set')
    return null
  }
  if (!portalClient) {
    portalClient = createClient(url, key)
  }
  return portalClient
}
