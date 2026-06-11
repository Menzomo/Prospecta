import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

const RECIPIENT = 'bruno.menzomo06@gmail.com'
const SUBJECT = 'Novo usuário beta aguardando liberação OAuth - Prospecta'

async function sendNotificationEmail(userName: string | null, userEmail: string, createdAt: string): Promise<void> {
  const from = process.env.NOTIFICATION_EMAIL_FROM
  const password = process.env.NOTIFICATION_EMAIL_PASSWORD

  if (!from || !password) {
    console.warn('[betaNotification] NOTIFICATION_EMAIL_FROM ou NOTIFICATION_EMAIL_PASSWORD não configurados — notificação ignorada')
    return
  }

  const date = new Date(createdAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const body = `Novo usuário entrou no Prospecta e precisa ser adicionado como Test User no Google Cloud OAuth.

Nome: ${userName ?? 'Não informado'}

Email: ${userEmail}

Data: ${date}

Ação: Adicionar este email em Google Cloud > OAuth Consent Screen > Test Users.`

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: from, pass: password },
  })

  console.log(`[betaNotification] Preparando envio de email para Bruno — remetente: ${from}`)
  await transporter.sendMail({ from, to: RECIPIENT, subject: SUBJECT, text: body })
  console.log('[betaNotification] Email enviado com sucesso')
}

export async function sendTestBetaNotificationEmail(): Promise<void> {
  await sendNotificationEmail('Usuário Teste', 'teste@example.com', new Date().toISOString())
}

export async function checkAndSendBetaNotification(userId: string): Promise<void> {
  try {
    console.log(`[betaNotification] Novo usuário detectado: userId=${userId}`)
    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('oauth_notification_sent, full_name, email, created_at')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error(`[betaNotification] Erro ao buscar perfil (userId=${userId}): ${profileError.message} [code: ${profileError.code}]`)
      return
    }

    if (!profile) {
      console.warn(`[betaNotification] Perfil não encontrado para userId=${userId}`)
      return
    }

    if (profile.oauth_notification_sent) {
      console.log(`[betaNotification] Notificação já enviada anteriormente para: ${profile.email}`)
      return
    }

    console.log(`[betaNotification] Preparando envio de email para Bruno (usuário: ${profile.email})`)
    await sendNotificationEmail(profile.full_name, profile.email, profile.created_at)

    const { error: updateError } = await admin
      .from('profiles')
      .update({ oauth_notification_sent: true })
      .eq('id', userId)

    if (updateError) {
      console.error(`[betaNotification] Email enviado mas erro ao atualizar flag (userId=${userId}): ${updateError.message}`)
    } else {
      console.log(`[betaNotification] Notificação enviada para novo usuário beta: ${profile.email}`)
    }
  } catch (err) {
    console.error('[betaNotification] Erro ao processar notificação beta:', err)
  }
}
