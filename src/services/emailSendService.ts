import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createEmailThread, createEmailMessage } from '@/repositories/emailRepository'
import { markLeadContacted } from '@/repositories/leadRepository'

type SendEmailInput = {
  userId: string
  leadId: string
  templateId: string | null
  leadEmail: string
  gmailEmail: string
  accessToken: string
  subject: string
  body: string
}

export type SendEmailResult =
  | { success: true; gmailMessageId: string }
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

function buildRawEmail(to: string, from: string, subject: string, body: string): string {
  const normalizedBody = body.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')

  const message = [
    `From: ${encodeMimeWord(from)}`,
    `To: ${to}`,
    `Subject: ${encodeMimeWord(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    normalizedBody,
  ].join('\r\n')

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function sendEmailService(
  supabase: SupabaseClient<Database>,
  input: SendEmailInput
): Promise<SendEmailResult> {
  const raw = buildRawEmail(input.leadEmail, input.gmailEmail, input.subject, input.body)

  const gmailResponse = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  )

  if (gmailResponse.status === 401) {
    console.error('[emailSendService] Gmail token expired for userId:', input.userId)
    return { error: 'token_expired' }
  }

  if (!gmailResponse.ok) {
    console.error('[emailSendService] Gmail API error:', gmailResponse.status)
    return { error: 'gmail_send_failed' }
  }

  const gmailData = (await gmailResponse.json()) as GmailSendResponse

  const thread = await createEmailThread(supabase, input.userId, {
    lead_id: input.leadId,
    gmail_thread_id: gmailData.threadId,
    subject: input.subject,
  })

  if (!thread) {
    console.error('[emailSendService] Failed to save email_thread for userId:', input.userId)
    return { error: 'db_save_failed' }
  }

  const message = await createEmailMessage(supabase, input.userId, {
    lead_id: input.leadId,
    thread_id: thread.id,
    template_id: input.templateId,
    subject: input.subject,
    body: input.body,
    gmail_message_id: gmailData.id,
  })

  if (!message) {
    console.error('[emailSendService] Failed to save email_message for userId:', input.userId)
    return { error: 'db_save_failed' }
  }

  await markLeadContacted(supabase, input.leadId)

  return { success: true, gmailMessageId: gmailData.id }
}
