import { createClient } from '@/lib/supabase/server'
import { getAssignedNumber } from '@/repositories/telnyxNumberRepository'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const userEmail = user?.email ?? null

  const hideTelefonia = process.env.TELEPHONY_PROVIDER === 'telnyx'

  const assignedNumber =
    user && process.env.TELEPHONY_PROVIDER === 'telnyx'
      ? await getAssignedNumber(supabase, user.id)
      : null

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar isAdmin={isAdmin} userEmail={userEmail} hideTelefonia={hideTelefonia} />
      <div className="flex flex-1 flex-col min-w-0 lg:pt-0 pt-13">
        <Topbar userEmail={userEmail} phoneNumber={assignedNumber?.phone_number ?? null} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
