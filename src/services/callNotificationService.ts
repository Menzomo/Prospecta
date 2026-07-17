import nodemailer from 'nodemailer'

const SUBJECT = 'Tentativa de contato — Prospecta'

async function createTransporter() {
  const from = process.env.NOTIFICATION_EMAIL_FROM
  const password = process.env.NOTIFICATION_EMAIL_PASSWORD

  if (!from || !password) {
    console.warn('[callNotification] NOTIFICATION_EMAIL_FROM ou NOTIFICATION_EMAIL_PASSWORD não configurados — notificação ignorada')
    return null
  }

  return {
    from,
    transporter: nodemailer.createTransport({ service: 'gmail', auth: { user: from, pass: password } }),
  }
}

/**
 * Avisa o usuário que um lead (ou número desconhecido) tentou ligar de volta
 * pro número dedicado dele. Disparado assim que a chamada de entrada é
 * registrada — não espera o resultado da ligação (atendida ou não).
 */
export async function sendMissedCallNotification(
  userEmail: string,
  info: { callerPhone: string; leadName?: string | null; leadUrl?: string | null }
): Promise<void> {
  const t = await createTransporter()
  if (!t) return

  const quem = info.leadName ? `${info.leadName} (${info.callerPhone})` : info.callerPhone
  const link = info.leadUrl ? `\n\nVer lead: ${info.leadUrl}` : ''

  const body = `${quem} tentou entrar em contato ligando pro seu número Prospecta.${link}`

  try {
    await t.transporter.sendMail({ from: t.from, to: userEmail, subject: SUBJECT, text: body })
    console.log(`[callNotification] Aviso de chamada enviado para ${userEmail}`)
  } catch (err) {
    console.error('[callNotification] Falha ao enviar aviso de chamada:', err)
  }
}
