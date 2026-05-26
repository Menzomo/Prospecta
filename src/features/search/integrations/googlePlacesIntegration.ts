export type PlaceSearchResult = {
  place_id: string
  name: string
}

export type PlaceDetails = {
  name: string
  website: string | null
  phone: string | null
}

type PlacesApiResponse = {
  status: string
  error_message?: string
  results: Array<{ place_id: string; name: string }>
}

type PlaceDetailsApiResponse = {
  status: string
  result: {
    name: string
    website?: string
    formatted_phone_number?: string
  }
}

export async function searchPlaces(
  category: string,
  city: string,
  apiKey: string
): Promise<PlaceSearchResult[]> {
  const query = encodeURIComponent(`${category} em ${city}`)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=pt-BR&key=${apiKey}`

  let data: PlacesApiResponse
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      console.error('[googlePlaces.searchPlaces] HTTP error:', res.status, body.slice(0, 200))
      return []
    }
    data = await res.json()
  } catch (err) {
    console.error('[googlePlaces.searchPlaces] fetch exception:', err)
    return []
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('[googlePlaces.searchPlaces] API error:', data.status, data.error_message ?? '')
    return []
  }

  return (data.results ?? []).slice(0, 15).map((r) => ({
    place_id: r.place_id,
    name: r.name,
  }))
}

export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetails | null> {
  const fields = 'name,website,formatted_phone_number'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${apiKey}`

  let data: PlaceDetailsApiResponse
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    data = await res.json()
  } catch {
    return null
  }

  if (data.status !== 'OK') return null

  const r = data.result
  return {
    name: r.name,
    website: r.website ?? null,
    phone: r.formatted_phone_number ?? null,
  }
}
