'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const ATLAS_URL = process.env.NEXT_PUBLIC_ATLAS_AUTH_URL || 'https://www.australianatlas.com.au'

export default function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/vendor')) return

    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
      : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet'
      : 'desktop'

    fetch(`${ATLAS_URL}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vertical: 'craft',
        path: pathname,
        referrer: document.referrer || null,
        device,
      }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
