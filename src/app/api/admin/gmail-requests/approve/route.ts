import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveGmailRequest } from '@/repositories/gmailRepository'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const targetUserId = body?.userId as string | undefined

  if (!targetUserId) {
    return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
  }

  const ok = await approveGmailRequest(admin, targetUserId)
  if (!ok) {
    return NextResponse.json({ error: 'Erro ao aprovar solicitação' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
