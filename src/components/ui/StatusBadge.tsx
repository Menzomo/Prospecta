import type { LeadStatus } from '@/types/leads'
import type { UserLeadStatus } from '@/types/globalLeads'
import { LEAD_STATUS_LABELS } from '@/types/leads'

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700',
  contatado: 'bg-indigo-100 text-indigo-700',
  interessado: 'bg-green-100 text-green-700',
  negociacao: 'bg-yellow-100 text-yellow-700',
  responder_depois: 'bg-orange-100 text-orange-700',
  sem_interesse: 'bg-gray-100 text-gray-600',
  sem_resposta: 'bg-red-100 text-red-700',
  convertido: 'bg-emerald-100 text-emerald-700',
}

type Props = {
  status: LeadStatus | UserLeadStatus | string
}

export function StatusBadge({ status }: Props) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  const label = LEAD_STATUS_LABELS[status as LeadStatus] ?? status

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
