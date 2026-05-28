export type LeadPreviewItem = {
  id: string
  company_name: string
  email: string
  website: string | null
  phone: string | null
}

export type SearchPreviewResponse = {
  leads: LeadPreviewItem[]
  monthly_remaining: number // -1 means unlimited (admin)
  message?: string
}

export type ConfirmLeadsResponse = {
  added: number
  monthly_remaining: number // -1 means unlimited (admin)
}
