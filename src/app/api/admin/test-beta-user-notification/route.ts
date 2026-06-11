import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestBetaNotificationEmail } from '@/services/betaNotificationService'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    await sendTestBetaNotificationEmail()
    return NextResponse.json({ ok: true, message: 'Email de teste enviado com sucesso para bruno.menzomo06@gmail.com' })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
