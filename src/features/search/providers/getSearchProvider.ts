import { googlePlacesProvider } from './googlePlacesProvider'
import { apifyProvider } from './apifyProvider'
import type { SearchLeadProvider } from './types'

const SUPPORTED_PROVIDERS = ['google_maps', 'apify'] as const
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]

export function getSearchProvider(): SearchLeadProvider {
  const name = (process.env.SEARCH_PROVIDER ?? 'google_maps') as SupportedProvider

  if (name === 'google_maps') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY não configurada')
    return googlePlacesProvider(apiKey)
  }

  if (name === 'apify') {
    return apifyProvider()
  }

  throw new Error(`Provedor de busca desconhecido: "${name}". Use: ${SUPPORTED_PROVIDERS.join(', ')}`)
}
