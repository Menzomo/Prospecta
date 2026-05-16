import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  saveGmailConnectionService,
} from '@/services/gmailService'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const settingsUrl = new URL('/settings/gmail', origin)

  if (errorParam) {
    console.error('[gmail/callback] OAuth error from Google:', errorParam)
    settingsUrl.searchParams.set('error', 'oauth_denied')
    return NextResponse.redirect(settingsUrl)
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('error', 'invalid_callback')
    return NextResponse.redirect(settingsUrl)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('gmail_oauth_state')?.value

  if (!savedState || savedState !== state) {
    console.error('[gmail/callback] State mismatch — possible CSRF attack')
    settingsUrl.searchParams.set('error', 'state_mismatch')
    return NextResponse.redirect(settingsUrl)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const tokens = await exchangeCodeForTokens(code)
  if (!tokens) {
    settingsUrl.searchParams.set('error', 'token_exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }

  const userInfo = await getGoogleUserInfo(tokens.access_token)
  if (!userInfo) {
    settingsUrl.searchParams.set('error', 'userinfo_failed')
    return NextResponse.redirect(settingsUrl)
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null

  const result = await saveGmailConnectionService(supabase, user.id, {
    gmail_email: userInfo.email,
    provider_account_id: userInfo.sub,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    scope: tokens.scope,
  })

  if ('error' in result) {
    console.error('[gmail/callback] Failed to save connection for userId:', user.id)
    settingsUrl.searchParams.set('error', 'save_failed')
    return NextResponse.redirect(settingsUrl)
  }

  const response = NextResponse.redirect(settingsUrl)
  response.cookies.delete('gmail_oauth_state')
  return response
}
