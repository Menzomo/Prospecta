// Fase 4: transferência e expiração de gravações.
// transfer-recordings (5min): recording_sid IS NOT NULL AND recording_url IS NULL → baixa Twilio, sobe Storage, deleta Twilio.
// expire-recordings (diário): recording_expires_at < NOW() AND recording_url IS NOT NULL → remove Storage, nula recording_url.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getTelephonySettings } from '@/repositories/telephonySettingsRepository'
import { decryptCredential } from '@/lib/crypto/credentials'
import { updateCallRecording } from '@/repositories/callRepository'

const STORAGE_BUCKET = 'call-recordings'

type PendingCall = {
  id: string
  user_id: string
  recording_sid: string
  recording_url?: string | null  // URL pré-assinada do Telnyx (expira em ~10min)
}

export async function transferPendingRecordings(
  adminSupabase: SupabaseClient<Database>
): Promise<{ transferred: number; errors: number }> {
  const { data: pendingCalls } = await adminSupabase
    .from('calls')
    .select('id, user_id, recording_sid')
    .not('recording_sid', 'is', null)
    .is('recording_url', null)
    .limit(3)

  if (!pendingCalls?.length) return { transferred: 0, errors: 0 }

  let transferred = 0
  let errors = 0

  for (const call of pendingCalls as PendingCall[]) {
    try {
      await transferSingleRecording(adminSupabase, call)
      transferred++
    } catch (err) {
      console.error('[callRecordingService] transfer failed', { callId: call.id, err })
      errors++
    }
  }

  return { transferred, errors }
}

export async function transferSingleRecording(
  adminSupabase: SupabaseClient<Database>,
  call: PendingCall
): Promise<void> {
  const isTelnyx = process.env.TELEPHONY_PROVIDER === 'telnyx'

  let audioBuffer: Buffer
  let twilioAccountSid: string | undefined
  let twilioAuthToken: string | undefined

  if (isTelnyx) {
    if (call.recording_url) {
      // URL pré-assinada do callback — download direto (sem auth, expira em ~10min)
      const res = await fetch(call.recording_url)
      if (!res.ok) throw new Error(`Telnyx direct download failed: HTTP ${res.status}`)
      audioBuffer = Buffer.from(await res.arrayBuffer())
    } else {
      // Fallback para cron job: tenta via API Telnyx (RecordingSid de chamadas TeXML dá 404)
      audioBuffer = await downloadTelnyxRecording(call.recording_sid)
    }
  } else {
    const settings = await getTelephonySettings(adminSupabase, call.user_id)
    if (!settings) throw new Error(`No telephony settings for user ${call.user_id}`)
    twilioAccountSid = settings.account_sid
    twilioAuthToken = decryptCredential(settings.auth_token_encrypted)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Recordings/${call.recording_sid}.mp3`
    const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
    const response = await fetch(twilioUrl, { headers: { Authorization: `Basic ${auth}` } })
    if (!response.ok) throw new Error(`Twilio download failed: HTTP ${response.status}`)
    audioBuffer = Buffer.from(await response.arrayBuffer())
  }

  const storagePath = `${call.user_id}/${call.id}.mp3`
  const { error: uploadError } = await adminSupabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const ok = await updateCallRecording(adminSupabase, call.id, storagePath)
  if (!ok) throw new Error(`DB update failed for call ${call.id}`)

  // Remove do provider após transferência bem-sucedida (evita custo de armazenamento)
  // Não-fatal: a gravação já está no Storage; apenas loga se falhar.
  try {
    if (isTelnyx) {
      await deleteTelnyxRecording(call.recording_sid)
    } else if (twilioAccountSid && twilioAuthToken) {
      await deleteTwilioRecording(twilioAccountSid, twilioAuthToken, call.recording_sid)
    }
  } catch (err) {
    console.warn('[callRecordingService] provider delete failed (non-fatal)', { callId: call.id, err })
  }
}

// ── Expiração ─────────────────────────────────────────────────────────────────

type ExpiredCall = {
  id: string
  recording_url: string
}

export async function expireOldRecordings(
  adminSupabase: SupabaseClient<Database>
): Promise<{ expired: number; errors: number }> {
  const { data: expiredCalls } = await adminSupabase
    .from('calls')
    .select('id, recording_url')
    .lt('recording_expires_at', new Date().toISOString())
    .not('recording_url', 'is', null)
    .limit(10)

  if (!expiredCalls?.length) return { expired: 0, errors: 0 }

  let expired = 0
  let errors = 0

  for (const call of expiredCalls as ExpiredCall[]) {
    try {
      await expireSingleRecording(adminSupabase, call)
      expired++
    } catch (err) {
      console.error('[callRecordingService] expire failed', { callId: call.id, err })
      errors++
    }
  }

  return { expired, errors }
}

async function expireSingleRecording(
  adminSupabase: SupabaseClient<Database>,
  call: ExpiredCall
): Promise<void> {
  const { error: removeError } = await adminSupabase.storage
    .from(STORAGE_BUCKET)
    .remove([call.recording_url])

  if (removeError) throw new Error(`Storage remove failed: ${removeError.message}`)

  const { error: dbError } = await adminSupabase
    .from('calls')
    .update({ recording_url: null, recording_deleted_at: new Date().toISOString() })
    .eq('id', call.id)

  if (dbError) throw new Error(`DB update failed: ${dbError.message}`)
}

// ── Helpers internos ───────────────────────────────────────────────────────────

async function downloadTelnyxRecording(recordingId: string): Promise<Buffer> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) throw new Error('TELNYX_API_KEY not set')
  const response = await fetch(`https://api.telnyx.com/v2/recordings/${recordingId}/download`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) throw new Error(`Telnyx download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function deleteTelnyxRecording(recordingId: string): Promise<void> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) throw new Error('TELNYX_API_KEY not set')
  const response = await fetch(`https://api.telnyx.com/v2/recordings/${recordingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  // 200/204 = sucesso, 404 = já deletado (idempotente)
  if (!response.ok && response.status !== 404) {
    throw new Error(`HTTP ${response.status}`)
  }
}

async function deleteTwilioRecording(
  accountSid: string,
  authToken: string,
  recordingSid: string
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` },
  })

  // 204 = sucesso, 404 = já deletado (idempotente — não é erro)
  if (!response.ok && response.status !== 404) {
    throw new Error(`HTTP ${response.status}`)
  }
}
