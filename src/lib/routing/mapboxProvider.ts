// ÚNICO arquivo no projeto que chama a API da Mapbox.
// Nenhum outro módulo deve fazer fetch pra api.mapbox.com diretamente.

import type { IRouteProvider, GeocodeResult, RouteStop, OptimizedRoute } from './IRouteProvider'

const BASE_URL = 'https://api.mapbox.com'
const DEFAULT_HEADERS = { 'User-Agent': 'Prospecta/1.0', Accept: 'application/json' }

// Só aceita resultado de nível de endereço/rua real — igual fazíamos na
// OpenRouteService, pra não aceitar silenciosamente um fallback de bairro
// inteiro como se fosse a localização exata do lead.
const PRECISE_FEATURE_TYPES = new Set(['address', 'street'])

type MapboxGeocodeResponse = {
  features?: Array<{
    geometry: { coordinates: [number, number] } // [lng, lat]
    properties: { name?: string; full_address?: string; feature_type?: string }
  }>
}

type MapboxOptimizationResponse = {
  code: string
  waypoints?: Array<{ waypoint_index: number }>
  trips?: Array<{ distance: number; duration: number }>
}

export class MapboxProvider implements IRouteProvider {
  constructor(private readonly token: string = process.env.MAPBOX_ACCESS_TOKEN ?? '') {}

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.token) throw new Error('Mapbox: MAPBOX_ACCESS_TOKEN não configurado')

    const url = `${BASE_URL}/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${encodeURIComponent(this.token)}&country=BR&limit=1`
    const res = await fetch(url, { headers: DEFAULT_HEADERS })
    if (!res.ok) throw new Error(`Mapbox geocode falhou: HTTP ${res.status}`)

    const data: MapboxGeocodeResponse = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null

    const [lng, lat] = feature.geometry.coordinates
    return {
      lat,
      lng,
      formattedAddress: feature.properties.full_address ?? feature.properties.name ?? address,
      precise: PRECISE_FEATURE_TYPES.has(feature.properties.feature_type ?? ''),
    }
  }

  async optimizeRoute(
    start: { lat: number; lng: number },
    stops: RouteStop[]
  ): Promise<OptimizedRoute> {
    if (!this.token) throw new Error('Mapbox: MAPBOX_ACCESS_TOKEN não configurado')
    if (stops.length === 0) throw new Error('Mapbox: nenhuma parada informada')
    if (stops.length > 11) throw new Error('Mapbox: no máximo 11 paradas por cálculo de rota')

    // Primeira coordenada é sempre o ponto de partida (source=first) — com
    // roundtrip=true (padrão), a API já monta a volta pro início sozinha.
    const points = [start, ...stops]
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
    const url = `${BASE_URL}/optimized-trips/v1/mapbox/driving/${coords}?source=first&roundtrip=true&access_token=${encodeURIComponent(this.token)}`

    const res = await fetch(url, { headers: DEFAULT_HEADERS })
    if (!res.ok) throw new Error(`Mapbox optimization falhou: HTTP ${res.status}`)

    const data: MapboxOptimizationResponse = await res.json()
    const trip = data.trips?.[0]
    if (data.code !== 'Ok' || !trip || !data.waypoints) {
      throw new Error('Mapbox: nenhuma rota retornada')
    }

    // waypoints[] vem na mesma ordem das coordenadas de entrada (índice 0 é
    // sempre o ponto de partida) — cada item traz sua posição real dentro da
    // rota otimizada em waypoint_index. Ordena pelas paradas (exclui o
    // início) por essa posição pra saber a sequência final de visita.
    const orderedStopIds = data.waypoints
      .map((wp, inputIndex) => ({ inputIndex, order: wp.waypoint_index }))
      .filter((w) => w.inputIndex !== 0)
      .sort((a, b) => a.order - b.order)
      .map((w) => stops[w.inputIndex - 1].id)

    return {
      orderedStopIds,
      totalDistanceMeters: trip.distance,
      totalDurationSeconds: trip.duration,
    }
  }
}
