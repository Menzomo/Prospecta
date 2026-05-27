import type { LeadQualityStatus } from '@/types/globalLeads'

type Classifiable = {
  email?: string | null
  website?: string | null
}

export function classifyLeadQuality({ email, website }: Classifiable): LeadQualityStatus {
  if (email && email.trim().length > 0) return 'email_found'
  if (website && website.trim().length > 0) return 'website_only'
  return 'manual_review'
}
