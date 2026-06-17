// lib/rate-limit.js — simple in-memory per-IP sliding-window limiter.
// Not shared across serverless instances (acceptable: curbs scripted abuse of
// the unauthenticated AI endpoints, not a hard DDoS guard).
const windows = new Map()

export function checkRateLimit(request, opts = {}) {
  const windowMs = opts.windowMs || 60_000
  const maxRequests = opts.maxRequests || 20
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown'
  const key = `${opts.keyPrefix || 'global'}:${ip}`
  const now = Date.now()
  let entry = windows.get(key)
  if (!entry || now - entry.windowStart > windowMs) { entry = { windowStart: now, count: 0 }; windows.set(key, entry) }
  entry.count += 1
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000)
    return Response.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
  }
  return null
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => { const now = Date.now(); for (const [k, e] of windows) if (now - e.windowStart > 120_000) windows.delete(k) }, 300_000)
}
