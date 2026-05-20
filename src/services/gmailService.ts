import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GmailConnection, SaveGmailConnectionDto } from '@/types/gmail'
import { getGmailConnection, saveGmailConnection, updateGmailTokens } from '@/repositories/gmailRepository'

export type GmailConnectionResult =
  | { success: true; connection: GmailConnection }
  | { error: true }

const GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

export function buildGoogleOAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokenResponse | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[gmailService.exchangeCodeForTokens] Missing env vars')
    return null
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!response.ok) {
    console.error('[gmailService.exchangeCodeForTokens] Token exchange failed:', response.status)
    return null
  }

  return response.json() as Promise<GoogleTokenResponse>
}

type GoogleUserInfo = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    console.error('[gmailService.getGoogleUserInfo] Userinfo fetch failed:', response.status)
    return null
  }

  return response.json() as Promise<GoogleUserInfo>
}

type RefreshedTokens = {
  access_token: string
  expires_in: number
}

export async function refreshGmailToken(refreshToken: string): Promise<RefreshedTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[gmailService.refreshGmailToken] Missing env vars')
    return null
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!response.ok) {
    console.error('[gmailService.refreshGmailToken] Token refresh failed:', response.status)
    return null
  }

  return response.json() as Promise<RefreshedTokens>
}

/**
 * Refreshes an expired Gmail access token and persists the new token to the database.
 * Returns the new access_token on success, null if refresh fails.
 * Maximum one refresh attempt — callers must not retry.
 */
export async function tryRefreshGmailToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const refreshed = await refreshGmailToken(refreshToken)

  if (!refreshed) {
    console.log('[gmailService.tryRefreshGmailToken] refresh failed')
    return null
  }

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

  await updateGmailTokens(supabase, userId, {
    access_token: refreshed.access_token,
    expires_at: expiresAt,
  })

  console.log('[gmailService.tryRefreshGmailToken] token refreshed and persisted')
  return refreshed.access_token
}

export async function saveGmailConnectionService(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: SaveGmailConnectionDto
): Promise<GmailConnectionResult> {
  const connection = await saveGmailConnection(supabase, userId, dto)
  if (!connection) return { error: true }
  return { success: true, connection }
}

export async function getGmailConnectionService(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GmailConnection | null> {
  return getGmailConnection(supabase, userId)
}
