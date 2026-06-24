import type { LeadQualityStatus } from '@/types/globalLeads'
import { computeLeadQualityStatus } from '@/types/globalLeads'

type Classifiable = {
  email?: string | null
  phone?: string | null
  website?: string | null
}

export function classifyLeadQuality({ email, phone }: Classifiable): LeadQualityStatus {
  return computeLeadQualityStatus(
    email && email.trim().length > 0 ? email : null,
    phone && phone.trim().length > 0 ? phone : null
  )
}
