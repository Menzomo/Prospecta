import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTestGmailReleaseNotification } from '@/services/betaNotificationService'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const envFromSet = !!process.env.NOTIFICATION_EMAIL_FROM
  const envPassSet = !!process.env.NOTIFICATION_EMAIL_PASSWORD

  if (!envFromSet || !envPassSet) {
    return NextResponse.json({
      ok: false,
      error: 'Notification email not configured — NOTIFICATION_EMAIL_FROM or NOTIFICATION_EMAIL_PASSWORD missing',
      env_from_set: envFromSet,
      env_pass_set: envPassSet,
    }, { status: 500 })
  }

  try {
    await sendTestGmailReleaseNotification()
    return NextResponse.json({
      ok: true,
      message: 'Email de teste enviado para bruno.menzomo06@gmail.com',
      from: process.env.NOTIFICATION_EMAIL_FROM,
      env_from_set: true,
      env_pass_set: true,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      env_from_set: true,
      env_pass_set: true,
    }, { status: 500 })
  }
}
