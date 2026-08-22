// Cria a implementação correta de IRouteProvider a partir da env var ROUTE_PROVIDER.
// A UI e os services obtêm o provedor EXCLUSIVAMENTE por aqui — pra trocar de
// OpenRouteService pra Google Routes API no futuro, basta mudar a env var e
// implementar googleRoutesProvider.ts (interface já pronta pra receber).

import type { IRouteProvider } from './IRouteProvider'
import { OpenRouteServiceProvider } from './openRouteServiceProvider'

export function getRouteProvider(): IRouteProvider {
  const provider = process.env.ROUTE_PROVIDER ?? 'openrouteservice'

  if (provider === 'openrouteservice') return new OpenRouteServiceProvider()

  throw new Error(`getRouteProvider: provedor desconhecido "${provider}"`)
}
