// Helper compartilhado de envio de email (Gmail SMTP via nodemailer). Os
// serviços de notificação existentes (betaNotificationService.ts,
// callNotificationService.ts) duplicam essa mesma lógica de transporte —
// não mexemos neles aqui, só evitamos criar uma 3ª cópia pro alerta de
// cobrança novo.

import nodemailer from 'nodemailer'

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const from = process.env.NOTIFICATION_EMAIL_FROM
  const password = process.env.NOTIFICATION_EMAIL_PASSWORD

  if (!from || !password) {
    console.warn('[email] NOTIFICATION_EMAIL_FROM ou NOTIFICATION_EMAIL_PASSWORD não configurados — envio ignorado')
    return
  }

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: from, pass: password } })
  await transporter.sendMail({ from, to, subject, text })
}
