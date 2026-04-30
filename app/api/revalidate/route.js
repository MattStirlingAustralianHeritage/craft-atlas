import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────────
// POST /api/revalidate?path=<path>&secret=<secret>
//
// Called by the portal sync after a write to Craft Atlas's `venues`
// table so the affected page's Vercel ISR cache is purged immediately
// rather than waiting up to an hour.
//
// Auth: shared secret in the REVALIDATION_SECRET env var. Set on both
// the portal and Craft Atlas Vercel projects to the same value.
//
// Path: a Next.js route path on this domain — e.g. /venue/some-studio
// or /map. Validated only that it starts with '/' and doesn't contain
// protocol/host segments.
//
// Returns:
//   200 { ok: true, path }  on success
//   401                      on missing/wrong secret
//   400                      on missing or malformed path
// ─────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  const path = url.searchParams.get('path')

  const expected = process.env.REVALIDATION_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'Revalidation not configured' }, { status: 401 })
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!path || typeof path !== 'string' || !path.startsWith('/') || path.includes('://')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  try {
    revalidatePath(path)
    return NextResponse.json({ ok: true, path })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Revalidation failed' }, { status: 500 })
  }
}
