import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createEmailThread, createEmailMessage } from '@/repositories/emailRepository'
import { markLeadContacted } from '@/repositories/leadRepository'
import { markUserLeadContacted } from '@/repositories/userLeadRepository'
import { tryRefreshGmailToken } from '@/services/gmailService'

export type EmailAttachment = {
  fileName: string
  contentType: string
  data: Buffer
}

type SendEmailInput = {
  userId: string
  leadId?: string
  userLeadId?: string
  templateId: string | null
  leadEmail: string
  gmailEmail: string
  accessToken: string
  refreshToken: string | null
  subject: string
  body: string
  attachments?: EmailAttachment[]
}

export type SendEmailResult =
  | { success: true; gmailMessageId: string; emailMessageId: string }
  | { error: 'token_expired' | 'gmail_send_failed' | 'db_save_failed' }

type GmailSendResponse = {
  id: string
  threadId: string
  labelIds?: string[]
}

/**
 * RFC 2047 encoded-word (B encoding) for non-ASCII header values.
 * ASCII-only strings are returned unchanged so common subjects stay readable in raw form.
 */
function encodeMimeWord(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
}

export function mimeTypeForExt(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] ?? 'application/octet-stream'
}

function buildRawEmail(to: string, from: string, subject: string, body: string, attachments: EmailAttachment[] = []): string {
  const normalizedBody = body.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')

  if (attachments.length === 0) {
    const message = [
      `From: ${encodeMimeWord(from)}`,
      `To: ${to}`,
      `Subject: ${encodeMimeWord(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      normalizedBody,
    ].join('\r\n')
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const boundary = `mp_${Date.now()}_boundary`

  const textPart = [
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    normalizedBody,
  ].join('\r\n')

  const attachmentParts = attachments.map((att) => {
    const b64 = att.data.toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? att.data.toString('base64')
    return [
      `Content-Type: ${att.contentType}`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${encodeMimeWord(att.fileName)}"`,
      ``,
      b64,
    ].join('\r\n')
  })

  const allParts = [textPart, ...attachmentParts].map((p) => `--${boundary}\r\n${p}`).join('\r\n')
  const multipartBody = `${allParts}\r\n--${boundary}--`

  const message = [
    `From: ${encodeMimeWord(from)}`,
    `To: ${to}`,
    `Subject: ${encodeMimeWord(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    multipartBody,
  ].join('\r\n')

  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function callGmailSendApi(
  accessToken: string,
  raw: string
): Promise<Response> {
  return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })
}

export async function sendEmailService(
  supabase: SupabaseClient<Database>,
  input: SendEmailInput
): Promise<SendEmailResult> {
  const raw = buildRawEmail(input.leadEmail, input.gmailEmail, input.subject, input.body, input.attachments ?? [])

  let gmailResponse = await callGmailSendApi(input.accessToken, raw)

  if (gmailResponse.status === 401) {
    console.log('[emailSendService] token expired on send, attempting refresh')

    if (!input.refreshToken) {
      console.log('[emailSendService] no refresh token available')
      return { error: 'token_expired' }
    }

    const newToken = await tryRefreshGmailToken(supabase, input.userId, input.refreshToken)

    if (!newToken) {
      console.log('[emailSendService] token refresh failed')
      return { error: 'token_expired' }
    }

    console.log('[emailSendService] token refreshed, retrying send')
    gmailResponse = await callGmailSendApi(newToken, raw)
  }

  if (gmailResponse.status === 401) {
    console.log('[emailSendService] token expired after refresh, giving up')
    return { error: 'token_expired' }
  }

  if (!gmailResponse.ok) {
    console.error('[emailSendService] Gmail API error:', gmailResponse.status)
    return { error: 'gmail_send_failed' }
  }

  const gmailData = (await gmailResponse.json()) as GmailSendResponse

  const thread = await createEmailThread(supabase, input.userId, {
    lead_id: input.leadId ?? null,
    user_lead_id: input.userLeadId ?? null,
    gmail_thread_id: gmailData.threadId,
    subject: input.subject,
  })

  if (!thread) {
    console.error('[emailSendService] Failed to save email_thread for userId:', input.userId)
    return { error: 'db_save_failed' }
  }

  const message = await createEmailMessage(supabase, input.userId, {
    lead_id: input.leadId ?? null,
    user_lead_id: input.userLeadId ?? null,
    thread_id: thread.id,
    template_id: input.templateId,
    subject: input.subject,
    body: input.body,
    gmail_message_id: gmailData.id,
    direction: 'outbound',
  })

  if (!message) {
    console.error('[emailSendService] Failed to save email_message for userId:', input.userId)
    return { error: 'db_save_failed' }
  }

  const { leadId, userLeadId } = input
  if (leadId) {
    await markLeadContacted(supabase, leadId)
  } else if (userLeadId) {
    await markUserLeadContacted(supabase, userLeadId)
  }

  return { success: true, gmailMessageId: gmailData.id, emailMessageId: message.id }
}
