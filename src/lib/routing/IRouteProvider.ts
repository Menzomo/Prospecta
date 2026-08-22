// Contrato que todo provedor de rota/geocodificação deve implementar.
// Nenhum arquivo fora de src/lib/routing/ deve importar o SDK/cliente HTTP de qualquer provedor.

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

export interface RouteStop {
  id: string
  lat: number
  lng: number
}

export interface OptimizedRoute {
  orderedStopIds: string[]
  totalDistanceMeters: number
  totalDurationSeconds: number
}

export interface IRouteProvider {
  /**
   * Converte um endereço em texto pra coordenadas. Retorna null se não
   * conseguir localizar o endereço com confiança.
   */
  geocodeAddress(address: string): Promise<GeocodeResult | null>

  /**
   * Calcula a ordem de visita que minimiza a distância total percorrida,
   * partindo de `start` e passando por todas as `stops`.
   */
  optimizeRoute(start: { lat: number; lng: number }, stops: RouteStop[]): Promise<OptimizedRoute>
}
