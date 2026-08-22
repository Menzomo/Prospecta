// Cria a implementação correta de IRouteProvider a partir da env var ROUTE_PROVIDER.
// A UI e os services obtêm o provedor EXCLUSIVAMENTE por aqui — pra trocar de
// provedor no futuro, basta mudar a env var e implementar um novo arquivo
// (interface já pronta pra receber).

import type { IRouteProvider } from './IRouteProvider'
import { MapboxProvider } from './mapboxProvider'

export function getRouteProvider(): IRouteProvider {
  const provider = process.env.ROUTE_PROVIDER ?? 'mapbox'

  if (provider === 'mapbox') return new MapboxProvider()

  throw new Error(`getRouteProvider: provedor desconhecido "${provider}"`)
}
