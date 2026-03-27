import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client that can refresh the session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — this keeps the auth cookie alive across navigations
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /vendor routes — must be signed in
  if (request.nextUrl.pathname.startsWith('/vendor') && !user) {
    return NextResponse.redirect(new URL('/for-vendors', request.url))
  }

  // Protect /trails/builder — must be signed in
  if (request.nextUrl.pathname.startsWith('/trails/builder') && !user) {
    return NextResponse.redirect(new URL('/trails', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
