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

  try {
    await sendTestGmailReleaseNotification()
    return NextResponse.json({
      ok: true,
      message: 'Email de teste enviado para bruno.menzomo06@gmail.com',
      from: process.env.NOTIFICATION_EMAIL_FROM ?? 'não configurado',
      env_from_set: !!process.env.NOTIFICATION_EMAIL_FROM,
      env_pass_set: !!process.env.NOTIFICATION_EMAIL_PASSWORD,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      from: process.env.NOTIFICATION_EMAIL_FROM ?? 'não configurado',
      env_from_set: !!process.env.NOTIFICATION_EMAIL_FROM,
      env_pass_set: !!process.env.NOTIFICATION_EMAIL_PASSWORD,
    }, { status: 500 })
  }
}
