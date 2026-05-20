import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  getEmailThreadsByLeadId,
  getGmailMessageIdsByThreadId,
  createEmailMessage,
  updateEmailThreadLastReply,
} from '@/repositories/emailRepository'
import { updateLeadLastReplyAt } from '@/repositories/leadRepository'
import { tryRefreshGmailToken } from '@/services/gmailService'

export type SyncResult = { synced: number; errors: number }

type GmailMessagePayload = {
  mimeType?: string
  headers?: Array<{ name: string; value: string }>
  body?: { data?: string; size?: number }
  parts?: GmailMessagePayload[]
}

type GmailMessage = {
  id: string
  threadId: string
  payload?: GmailMessagePayload
}

type GmailThread = {
  id: string
  messages?: GmailMessage[]
}

type FetchThreadResult =
  | { ok: true; thread: GmailThread }
  | { ok: false; unauthorized: boolean }

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : from.trim().toLowerCase()
}

function extractBody(payload: GmailMessagePayload): string {
  if (payload.body?.data) {
    const base64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/')
        return Buffer.from(base64, 'base64').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }
  return ''
}

async function fetchGmailThread(
  gmailThreadId: string,
  accessToken: string
): Promise<FetchThreadResult> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${gmailThreadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (response.status === 401) {
    return { ok: false, unauthorized: true }
  }

  if (!response.ok) {
    console.error('[gmailSyncService] Failed to fetch thread:', gmailThreadId, response.status)
    return { ok: false, unauthorized: false }
  }

  const thread = (await response.json()) as GmailThread
  return { ok: true, thread }
}

export async function syncGmailRepliesForLead(
  supabase: SupabaseClient<Database>,
  {
    userId,
    leadId,
    accessToken,
    gmailEmail,
    refreshToken,
  }: {
    userId: string
    leadId: string
    accessToken: string
    gmailEmail: string
    refreshToken: string | null
  }
): Promise<SyncResult> {
  const threads = await getEmailThreadsByLeadId(supabase, userId, leadId)

  let currentToken = accessToken
  let tokenRefreshed = false
  let synced = 0
  let errors = 0
  let latestReplyAt: string | null = null

  for (const thread of threads) {
    let result = await fetchGmailThread(thread.gmail_thread_id, currentToken)

    if (!result.ok && result.unauthorized && !tokenRefreshed && refreshToken) {
      console.log('[gmailSyncService] token expired during sync, attempting refresh')
      const newToken = await tryRefreshGmailToken(supabase, userId, refreshToken)

      if (newToken) {
        console.log('[gmailSyncService] token refreshed, retrying thread fetch')
        currentToken = newToken
        tokenRefreshed = true
        result = await fetchGmailThread(thread.gmail_thread_id, currentToken)
      } else {
        console.log('[gmailSyncService] token refresh failed')
      }
    }

    if (!result.ok) {
      errors++
      continue
    }

    const gmailThread = result.thread
    if (!gmailThread.messages) {
      errors++
      continue
    }

    const existingIds = await getGmailMessageIdsByThreadId(supabase, userId, thread.id)
    const existingSet = new Set(existingIds)
    let threadLatestReply: string | null = null

    for (const message of gmailThread.messages) {
      if (existingSet.has(message.id)) continue
      if (!message.payload) continue

      const headers = message.payload.headers ?? []
      const from = getHeader(headers, 'From')
      const subject = getHeader(headers, 'Subject')
      const dateStr = getHeader(headers, 'Date')

      const senderEmail = extractEmailAddress(from)
      if (senderEmail === gmailEmail.toLowerCase()) continue

      const body = extractBody(message.payload)
      const sentAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()

      const saved = await createEmailMessage(supabase, userId, {
        lead_id: leadId,
        thread_id: thread.id,
        template_id: null,
        subject: subject || thread.subject,
        body,
        gmail_message_id: message.id,
        direction: 'inbound',
        from_email: from || null,
        sent_at: sentAt,
      })

      if (saved) {
        synced++
        if (!threadLatestReply || sentAt > threadLatestReply) threadLatestReply = sentAt
        if (!latestReplyAt || sentAt > latestReplyAt) latestReplyAt = sentAt
      } else {
        errors++
      }
    }

    if (threadLatestReply) {
      await updateEmailThreadLastReply(supabase, userId, thread.id, threadLatestReply)
    }
  }

  if (latestReplyAt) {
    await updateLeadLastReplyAt(supabase, leadId, latestReplyAt)
  }

  return { synced, errors }
}
