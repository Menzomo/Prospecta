export type SearchProviderParams = {
  category: string
  city: string
  state?: string
  limit: number
}

export type SearchProviderResult = {
  company_name: string
  email: string | null
  phone: string | null
  /** Only results that have a website are returned by the provider */
  website: string
  city: string
  state: string | null
  provider_source: string
  provider_external_id: string | null
}

export interface SearchLeadProvider {
  search(params: SearchProviderParams): Promise<SearchProviderResult[]>
}
