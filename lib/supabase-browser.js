// lib/supabase-browser.js
// Browser-side Supabase client — auth-aware, singleton pattern
// Use this (not lib/supabase.js) in all client components that need auth

import { createBrowserClient } from '@supabase/ssr'

let client

export function getSupabaseBrowser() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return client
}
