'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmailSchema } from '@/validations/emailSchema'
import { getLeadById } from '@/repositories/leadRepository'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { sendEmailService, mimeTypeForExt } from '@/services/emailSendService'
import { tryRefreshGmailToken } from '@/services/gmailService'
import { listAttachmentsByTemplate } from '@/repositories/templateAttachmentRepository'

export type SendEmailActionState = {
  errors?: {
    template_id?: string[]
    subject?: string[]
    body?: string[]
  }
  error?: string
  success?: boolean
  emailMessageId?: string
} | null

export async function sendEmailAction(
  leadId: string,
  _state: SendEmailActionState,
  formData: FormData
): Promise<SendEmailActionState> {
  const validation = sendEmailSchema.safeParse({
    template_id: formData.get('template_id'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const lead = await getLeadById(supabase, leadId)
  if (!lead) return { error: 'Lead não encontrado.' }
  if (!lead.email) return { error: 'Este lead não possui email cadastrado.' }

  const connection = await getGmailConnection(supabase, user.id)
  if (!connection || !connection.is_connected) {
    return { error: 'Conta Gmail não conectada. Acesse Configurações > Gmail para conectar.' }
  }

  let accessToken = connection.access_token

  const isExpired = connection.expires_at
    ? new Date(connection.expires_at) < new Date(Date.now() + 5 * 60 * 1000)
    : false

  if (isExpired) {
    if (!connection.refresh_token) {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    console.log('[sendEmailAction] token expired, attempting proactive refresh')
    const newToken = await tryRefreshGmailToken(supabase, user.id, connection.refresh_token)
    if (!newToken) {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    console.log('[sendEmailAction] token refreshed proactively')
    accessToken = newToken
  }

  // Load and download template attachments
  const templateAttachmentRecords = validation.data.template_id
    ? await listAttachmentsByTemplate(supabase, validation.data.template_id)
    : []

  const attachments = (
    await Promise.all(
      templateAttachmentRecords.map(async (att) => {
        const { data } = await supabase.storage.from('template-attachments').download(att.file_path)
        if (!data) return null
        const buf = Buffer.from(await data.arrayBuffer())
        return { fileName: att.file_name, contentType: mimeTypeForExt(att.file_type), data: buf }
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null)

  const result = await sendEmailService(supabase, {
    userId: user.id,
    leadId,
    templateId: validation.data.template_id,
    leadEmail: lead.email,
    gmailEmail: connection.gmail_email,
    accessToken,
    refreshToken: connection.refresh_token,
    subject: validation.data.subject,
    body: validation.data.body,
    attachments,
  })

  if ('error' in result) {
    if (result.error === 'token_expired') {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    if (result.error === 'gmail_send_failed') {
      return { error: 'Falha ao enviar pelo Gmail. Tente novamente.' }
    }
    return { error: 'Falha ao salvar o email enviado. Tente novamente.' }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/dashboard')
  return { success: true, emailMessageId: result.emailMessageId }
}

export async function sendEmailFromUserLeadAction(
  userLeadId: string,
  _state: SendEmailActionState,
  formData: FormData
): Promise<SendEmailActionState> {
  const validation = sendEmailSchema.safeParse({
    template_id: formData.get('template_id'),
    subject: formData.get('subject'),
    body: formData.get('body'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userLeadData, error: userLeadError } = await supabase
    .from('user_leads')
    .select('id, status, global_leads(email, company_name)')
    .eq('id', userLeadId)
    .eq('user_id', user.id)
    .single()

  if (userLeadError || !userLeadData || !userLeadData.global_leads) {
    return { error: 'Lead não encontrado.' }
  }

  const gl = userLeadData.global_leads as unknown as { email: string | null; company_name: string }

  if (!gl.email) return { error: 'Este lead não possui email cadastrado.' }

  const connection = await getGmailConnection(supabase, user.id)
  if (!connection || !connection.is_connected) {
    return { error: 'Conta Gmail não conectada. Acesse Configurações > Gmail para conectar.' }
  }

  let accessToken = connection.access_token

  const isExpired = connection.expires_at
    ? new Date(connection.expires_at) < new Date(Date.now() + 5 * 60 * 1000)
    : false

  if (isExpired) {
    if (!connection.refresh_token) {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    const newToken = await tryRefreshGmailToken(supabase, user.id, connection.refresh_token)
    if (!newToken) {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    accessToken = newToken
  }

  const templateAttachmentRecords = validation.data.template_id
    ? await listAttachmentsByTemplate(supabase, validation.data.template_id)
    : []

  const attachments = (
    await Promise.all(
      templateAttachmentRecords.map(async (att) => {
        const { data } = await supabase.storage.from('template-attachments').download(att.file_path)
        if (!data) return null
        const buf = Buffer.from(await data.arrayBuffer())
        return { fileName: att.file_name, contentType: mimeTypeForExt(att.file_type), data: buf }
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null)

  const result = await sendEmailService(supabase, {
    userId: user.id,
    userLeadId,
    templateId: validation.data.template_id,
    leadEmail: gl.email,
    gmailEmail: connection.gmail_email,
    accessToken,
    refreshToken: connection.refresh_token,
    subject: validation.data.subject,
    body: validation.data.body,
    attachments,
  })

  if ('error' in result) {
    if (result.error === 'token_expired') {
      return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
    }
    if (result.error === 'gmail_send_failed') {
      return { error: 'Falha ao enviar pelo Gmail. Tente novamente.' }
    }
    return { error: 'Falha ao salvar o email enviado. Tente novamente.' }
  }

  revalidatePath(`/leads/global/${userLeadId}`)
  revalidatePath('/dashboard')
  return { success: true, emailMessageId: result.emailMessageId }
}
