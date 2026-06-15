import { createClient } from '@/lib/supabase/server'
import { getUserLeadsWithGlobalData } from '@/repositories/userLeadRepository'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const leads = await getUserLeadsWithGlobalData(supabase, user.id)

  return Response.json({ leads: leads.slice(0, 20) })
}
