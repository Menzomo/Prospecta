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
  const rawQuery = `${category} em ${city}`
  const query = encodeURIComponent(rawQuery)
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=pt-BR&key=${apiKey}`

  console.log('[DIAG][googlePlaces.searchPlaces] query:', rawQuery)
  console.log('[DIAG][googlePlaces.searchPlaces] endpoint: textsearch/json')

  let data: PlacesApiResponse
  try {
    const res = await fetch(url)
    console.log('[DIAG][googlePlaces.searchPlaces] HTTP status:', res.status)
    if (!res.ok) {
      const body = await res.text()
      console.error('[DIAG][googlePlaces.searchPlaces] HTTP error body:', body)
      return []
    }
    data = await res.json()
  } catch (err) {
    console.error('[DIAG][googlePlaces.searchPlaces] fetch exception:', err)
    return []
  }

  console.log('[DIAG][googlePlaces.searchPlaces] API status:', data.status)
  if (data.error_message) {
    console.error('[DIAG][googlePlaces.searchPlaces] error_message:', data.error_message)
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('[DIAG][googlePlaces.searchPlaces] non-OK status, returning []')
    return []
  }

  const results = (data.results ?? []).slice(0, 15).map((r) => ({
    place_id: r.place_id,
    name: r.name,
  }))
  console.log('[DIAG][googlePlaces.searchPlaces] places found:', results.length)
  return results
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
