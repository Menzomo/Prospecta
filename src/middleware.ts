import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Paths that never require authentication
const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/gmail/callback']

// Paths that bypass session check entirely (use their own auth mechanism)
const BYPASS_PREFIXES = ['/api/cron/']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isBypassPath(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cron routes authenticate via Authorization header — skip session handling
  if (isBypassPath(pathname)) {
    return NextResponse.next()
  }

  // Refresh Supabase session cookies on every request (required for SSR auth)
  const { response, user } = await updateSession(request)

  // Authenticated users visiting /login → redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated users on any private path → redirect to /login
  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
