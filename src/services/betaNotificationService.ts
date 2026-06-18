import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

const RECIPIENT = 'bruno.menzomo06@gmail.com'
const SUBJECT_NEW_USER = 'Novo usuário beta aguardando liberação OAuth - Prospecta'
const SUBJECT_GMAIL_REQUEST = 'Nova solicitação de Gmail - Prospecta Beta'

async function createTransporter() {
  const from = process.env.NOTIFICATION_EMAIL_FROM
  const password = process.env.NOTIFICATION_EMAIL_PASSWORD

  if (!from || !password) {
    console.warn('[betaNotification] NOTIFICATION_EMAIL_FROM ou NOTIFICATION_EMAIL_PASSWORD não configurados — notificação ignorada')
    return null
  }

  return {
    from,
    transporter: nodemailer.createTransport({ service: 'gmail', auth: { user: from, pass: password } }),
  }
}

async function sendNotificationEmail(userName: string | null, userEmail: string, createdAt: string): Promise<void> {
  const t = await createTransporter()
  if (!t) return

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

  console.log(`[betaNotification] Preparando envio de email para Bruno — remetente: ${t.from}`)
  await t.transporter.sendMail({ from: t.from, to: RECIPIENT, subject: SUBJECT_NEW_USER, text: body })
  console.log('[betaNotification] Email enviado com sucesso')
}

export async function sendGmailRequestNotification(
  userId: string,
  userName: string | null,
  userEmail: string,
  gmailRequested: string
): Promise<void> {
  console.log(`[gmailRelease] Preparing notification — userId=${userId} gmail=${gmailRequested} userEmail=${userEmail}`)

  const t = await createTransporter()
  if (!t) {
    console.warn('[gmailRelease] Transporter not created — NOTIFICATION_EMAIL_FROM or NOTIFICATION_EMAIL_PASSWORD missing')
    return
  }

  console.log(`[gmailRelease] Transporter ready — from=${t.from} to=${RECIPIENT}`)

  const body = `Novo usuário solicitou liberação de Gmail no Prospecta Beta.

Nome: ${userName ?? 'Não informado'}
Email de cadastro: ${userEmail}
Gmail solicitado: ${gmailRequested}
User ID: ${userId}

Ação necessária:
1. Adicionar "${gmailRequested}" em Google Cloud > OAuth Consent Screen > Test Users
2. Aprovar a solicitação em https://prospecta-ten.vercel.app/admin (seção "Solicitações Gmail")`

  await t.transporter.sendMail({ from: t.from, to: RECIPIENT, subject: SUBJECT_GMAIL_REQUEST, text: body })
  console.log(`[gmailRelease] Notification sent — userId=${userId} gmail=${gmailRequested}`)
}

export async function sendTestGmailReleaseNotification(): Promise<void> {
  await sendGmailRequestNotification(
    'test-user-id',
    'Usuário Teste',
    'teste@example.com',
    'teste@gmail.com'
  )
}

export async function sendTestBetaNotificationEmail(): Promise<void> {
  await sendNotificationEmail('Usuário Teste', 'teste@example.com', new Date().toISOString())
}

export async function checkAndSendBetaNotification(userId: string): Promise<void> {
  try {
    console.log(`[betaNotification] Novo usuário detectado: userId=${userId}`)
    const admin = createAdminClient()

    // Busca o usuário em auth.users — funciona para qualquer provedor/domínio de email
    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(userId)
    if (userError || !user?.email) {
      console.error(`[betaNotification] Erro ao buscar usuário auth (userId=${userId}):`, userError?.message ?? 'email ausente')
      return
    }

    // Verifica flag de deduplicação em profiles (código PGRST116 = sem rows = perfil ainda não existe)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('oauth_notification_sent')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error(`[betaNotification] Erro ao buscar perfil (userId=${userId}): ${profileError.message} [code: ${profileError.code}]`)
    }

    if (profile?.oauth_notification_sent) {
      console.log(`[betaNotification] Notificação já enviada anteriormente para: ${user.email}`)
      return
    }

    if (!profile) {
      console.warn(`[betaNotification] Perfil ainda não existe para userId=${userId} — usando dados do auth.users`)
    }

    const userName = (user.user_metadata?.full_name as string | undefined) ?? null
    console.log(`[betaNotification] Preparando envio de email para Bruno (usuário: ${user.email})`)
    await sendNotificationEmail(userName, user.email, user.created_at)

    // Persiste o flag: atualiza se perfil existe, faz upsert caso contrário
    const { error: flagError } = profile
      ? await admin.from('profiles').update({ oauth_notification_sent: true }).eq('id', userId)
      : await admin.from('profiles').upsert({ id: userId, email: user.email, full_name: userName, oauth_notification_sent: true })

    if (flagError) {
      console.error(`[betaNotification] Email enviado mas erro ao persistir flag (userId=${userId}): ${flagError.message}`)
    } else {
      console.log(`[betaNotification] Notificação enviada para novo usuário beta: ${user.email}`)
    }
  } catch (err) {
    console.error('[betaNotification] Erro ao processar notificação beta:', err)
  }
}
