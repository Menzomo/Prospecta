import type { SearchLeadProvider, SearchProviderParams, SearchProviderResult } from './types'

export function apifyProvider(): SearchLeadProvider {
  return {
    async search(_params: SearchProviderParams): Promise<SearchProviderResult[]> {
      throw new Error('Apify provider not implemented')
    },
  }
}
