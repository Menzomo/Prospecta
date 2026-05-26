import { searchPlaces, getPlaceDetails } from '../integrations/googlePlacesIntegration'
import { extractEmailFromWebsite } from '../integrations/emailExtractorIntegration'
import type { SearchLeadProvider, SearchProviderParams, SearchProviderResult } from './types'

export function googlePlacesProvider(apiKey: string): SearchLeadProvider {
  return {
    async search({ category, city, state }: SearchProviderParams): Promise<SearchProviderResult[]> {
      const places = await searchPlaces(category, city, apiKey)
      if (places.length === 0) return []

      const detailsList = await Promise.all(
        places.map((p) => getPlaceDetails(p.place_id, apiKey))
      )

      // Flatten to a simple structure, keeping only places that have a website
      const enriched: Array<{
        place_id: string
        name: string
        website: string
        phone: string | null
      }> = []

      for (let i = 0; i < places.length; i++) {
        const details = detailsList[i]
        if (details !== null && details.website !== null) {
          enriched.push({
            place_id: places[i].place_id,
            name: details.name,
            website: details.website,
            phone: details.phone,
          })
        }
      }

      if (enriched.length === 0) return []

      const emails = await Promise.all(
        enriched.map((item) => extractEmailFromWebsite(item.website))
      )

      return enriched.map((item, i) => ({
        company_name: item.name,
        email: emails[i],
        phone: item.phone,
        website: item.website,
        city,
        state: state ?? null,
        provider_source: 'google_maps',
        provider_external_id: item.place_id,
      }))
    },
  }
}
