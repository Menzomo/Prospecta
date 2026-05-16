import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GmailConnection, SaveGmailConnectionDto } from '@/types/gmail'
import { getGmailConnection, saveGmailConnection } from '@/repositories/gmailRepository'

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
