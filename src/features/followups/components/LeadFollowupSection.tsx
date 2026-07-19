import { FollowupCreateForm } from '@/features/followups/components/FollowupCreateForm'
import { FollowupItem } from '@/features/followups/components/FollowupItem'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'
import type { Followup } from '@/types/followups'

type Props = {
  leadId?: string | null
  userLeadId?: string | null
  followups: Followup[]
  canWrite?: boolean
}

export function LeadFollowupSection({ leadId, userLeadId, followups, canWrite = true }: Props) {
  const pending = followups.filter((f) => f.status === 'pending')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Acompanhamentos</h2>

      {pending.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nenhum acompanhamento pendente.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {pending.map((followup) => (
            <FollowupItem
              key={followup.id}
              followup={followup}
              leadId={leadId ?? null}
              userLeadId={userLeadId ?? null}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}

      {canWrite ? (
        <FollowupCreateForm leadId={leadId ?? null} userLeadId={userLeadId ?? null} />
      ) : (
        <SubscriptionGateCard compact description="Assine pra criar acompanhamentos." />
      )}
    </div>
  )
}
