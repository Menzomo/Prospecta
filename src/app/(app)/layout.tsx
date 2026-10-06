import { createClient } from '@/lib/supabase/server'
import { getAssignedNumber } from '@/repositories/telnyxNumberRepository'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { hasSubscriptionAlert } from '@/features/settings/subscriptionAlert'
import { syncAsaasNextDueDate } from '@/services/asaasService'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  let subscriptionAlert = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, asaas_subscription_id, asaas_next_due_date, payment_overdue_since')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
    // Sem vencimento guardado, busca uma vez no Asaas pra bolinha já funcionar
    if (profile?.asaas_subscription_id && !profile.asaas_next_due_date) {
      profile.asaas_next_due_date = await syncAsaasNextDueDate(
        createAdminClient(),
        user.id,
        profile.asaas_subscription_id
      )
    }
    subscriptionAlert = profile ? hasSubscriptionAlert(profile) : false
  }

  const userEmail = user?.email ?? null

  const assignedNumber =
    user && process.env.TELEPHONY_PROVIDER === 'telnyx'
      ? await getAssignedNumber(supabase, user.id)
      : null

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar isAdmin={isAdmin} userEmail={userEmail} subscriptionAlert={subscriptionAlert} />
      <div className="flex flex-1 flex-col min-w-0 lg:pt-0 pt-13">
        <Topbar userEmail={userEmail} phoneNumber={assignedNumber?.phone_number ?? null} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
