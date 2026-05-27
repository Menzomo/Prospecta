export type SearchOutcome = 'saved' | 'duplicate' | 'no_email' | 'fetch_error' | 'limit_reached'

export type SearchResultItem = {
  company_name: string
  website: string | null
  email: string
  phone: string | null
  outcome: SearchOutcome
}

export type SearchApiResponse = {
  results: SearchResultItem[]
  saved: number
  daily_remaining: number
  message?: string
}
