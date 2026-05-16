import type { Database } from '@/lib/supabase/types'

export type GmailConnection = Database['public']['Tables']['gmail_connections']['Row']

export type SaveGmailConnectionDto = {
  gmail_email: string
  provider_account_id: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scope: string | null
}
