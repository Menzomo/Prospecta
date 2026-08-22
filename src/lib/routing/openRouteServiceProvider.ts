// ÚNICO arquivo no projeto que chama a API da OpenRouteService.
// Nenhum outro módulo deve fazer fetch pra api.openrouteservice.org diretamente.

import type { IRouteProvider, GeocodeResult, RouteStop, OptimizedRoute } from './IRouteProvider'

// A nota de depreciação (https://status.openrouteservice.org/) fala em migrar
// pra api.heigit.org, mas testado ao vivo em 22/08/2026: api.heigit.org só
// responde 404 nos paths reais (domínio existe, API não está lá) enquanto
// api.openrouteservice.org funciona normalmente. Usar o domínio antigo até
// confirmarmos que o novo está de fato servindo a API.
const BASE_URL = 'https://api.openrouteservice.org'

type OrsGeocodeResponse = {
  features?: Array<{
    geometry: { coordinates: [number, number] } // [lng, lat]
    properties: { label?: string }
  }>
}

type OrsOptimizationResponse = {
  routes?: Array<{
    steps: Array<{ type: string; id?: number }>
    distance: number
    duration: number
  }>
}

export class OpenRouteServiceProvider implements IRouteProvider {
  constructor(private readonly apiKey: string = process.env.ORS_API_KEY ?? '') {}

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) throw new Error('OpenRouteService: ORS_API_KEY não configurada')

    const url = `${BASE_URL}/geocode/search?api_key=${encodeURIComponent(this.apiKey)}&text=${encodeURIComponent(address)}&boundary.country=BR&size=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenRouteService geocode falhou: HTTP ${res.status}`)

    const data: OrsGeocodeResponse = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null

    const [lng, lat] = feature.geometry.coordinates
    return { lat, lng, formattedAddress: feature.properties.label ?? address }
  }

  async optimizeRoute(
    start: { lat: number; lng: number },
    stops: RouteStop[]
  ): Promise<OptimizedRoute> {
    if (!this.apiKey) throw new Error('OpenRouteService: ORS_API_KEY não configurada')
    if (stops.length === 0) throw new Error('OpenRouteService: nenhuma parada informada')

    // A API de otimização (VROOM) exige job.id numérico — mapeia os IDs
    // string das visitas pra índices numéricos e desfaz o mapeamento na volta.
    const idByIndex = stops.map((s) => s.id)

    const body = {
      jobs: stops.map((stop, index) => ({
        id: index,
        location: [stop.lng, stop.lat],
      })),
      vehicles: [
        {
          id: 1,
          profile: 'driving-car',
          start: [start.lng, start.lat],
          end: [start.lng, start.lat],
        },
      ],
      // options.g pede o cálculo de distância — sem isso a resposta só traz
      // duration, sem distance (confirmado testando ao vivo em 22/08/2026).
      options: { g: true },
    }

    const res = await fetch(`${BASE_URL}/optimization`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenRouteService optimization falhou: HTTP ${res.status}`)

    const data: OrsOptimizationResponse = await res.json()
    const route = data.routes?.[0]
    if (!route) throw new Error('OpenRouteService: nenhuma rota retornada')

    const orderedStopIds = route.steps
      .filter((step) => step.type === 'job' && step.id !== undefined)
      .map((step) => idByIndex[step.id!])

    return {
      orderedStopIds,
      totalDistanceMeters: route.distance,
      totalDurationSeconds: route.duration,
    }
  }
}
