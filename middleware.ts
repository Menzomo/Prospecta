import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/auth/callback', '/api/gmail/callback']

// Webhooks servidor-a-servidor — sem cookie de sessão, cada um se protege
// com o próprio segredo (Bearer CRON_SECRET, assinatura Ed25519 da Telnyx,
// header asaas-access-token). Sem isso na lista, o middleware redirecionava
// a chamada pra /login em vez de deixar chegar no handler — bug real:
// o webhook da Asaas nunca rodou de verdade em produção até agora.
const BYPASS_PREFIXES = ['/api/cron/', '/api/calls/', '/api/asaas/webhook']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isBypassPath(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isBypassPath(pathname)) {
    return NextResponse.next()
  }

  const { response, user } = await updateSession(request)

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

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
