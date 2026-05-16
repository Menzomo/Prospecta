import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { GmailConnection, SaveGmailConnectionDto } from '@/types/gmail'

export async function getGmailConnection(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GmailConnection | null> {
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[gmailRepository.getGmailConnection] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return data
}

export async function saveGmailConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  dto: SaveGmailConnectionDto
): Promise<GmailConnection | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('gmail_connections')
    .upsert(
      {
        user_id: userId,
        gmail_email: dto.gmail_email,
        provider_account_id: dto.provider_account_id,
        access_token: dto.access_token,
        refresh_token: dto.refresh_token,
        expires_at: dto.expires_at,
        scope: dto.scope,
        is_connected: true,
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[gmailRepository.saveGmailConnection] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export async function disconnectGmailConnection(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('gmail_connections')
    .update({
      is_connected: false,
      disconnected_at: now,
      updated_at: now,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[gmailRepository.disconnectGmailConnection] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}

export async function updateGmailTokens(
  supabase: SupabaseClient<Database>,
  userId: string,
  tokens: { access_token: string; expires_at: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('gmail_connections')
    .update({
      access_token: tokens.access_token,
      expires_at: tokens.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[gmailRepository.updateGmailTokens] Supabase error:', {
      code: error.code,
      message: error.message,
    })
    return false
  }

  return true
}
