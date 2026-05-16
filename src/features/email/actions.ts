'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmailSchema } from '@/validations/emailSchema'
import { getLeadById } from '@/repositories/leadRepository'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { sendEmailService } from '@/services/emailSendService'

export type SendEmailActionState = {
  errors?: {
    template_id?: string[]
    subject?: string[]
    body?: string[]
  }
  error?: string
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

  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    return { error: 'Token Gmail expirado. Reconecte sua conta em Configurações > Gmail.' }
  }

  const result = await sendEmailService(supabase, {
    userId: user.id,
    leadId,
    templateId: validation.data.template_id,
    leadEmail: lead.email,
    gmailEmail: connection.gmail_email,
    accessToken: connection.access_token,
    subject: validation.data.subject,
    body: validation.data.body,
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
  redirect(`/leads/${leadId}`)
}
