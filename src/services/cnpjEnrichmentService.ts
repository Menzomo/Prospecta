// Enriquecimento de endereço a partir do CNPJ — caminho alternativo pra leads
// que não vieram da importação Apify (manuais ou antigos) e por isso não têm
// address/latitude/longitude ainda. BrasilAPI é gratuita, sem chave, mantida
// com dados oficiais da Receita Federal.

import { isValidCnpj } from '@/lib/validation/cpfCnpj'
import { getRouteProvider } from '@/lib/routing/factory'

export type CnpjEnrichmentResult = {
  cnpj: string
  address: string
  latitude: number
  longitude: number
}

type BrasilApiCnpjResponse = {
  logradouro?: string
  numero?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
}

export async function enrichAddressFromCnpj(rawCnpj: string): Promise<CnpjEnrichmentResult> {
  const digits = rawCnpj.replace(/\D/g, '')
  if (!isValidCnpj(digits)) throw new Error('CNPJ inválido.')

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
  if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.')
  if (!res.ok) throw new Error(`Falha ao consultar CNPJ: HTTP ${res.status}`)

  const data: BrasilApiCnpjResponse = await res.json()
  const addressParts = [data.logradouro, data.numero, data.bairro, data.municipio, data.uf, data.cep]
    .filter((part): part is string => !!part && part.trim().length > 0)
  const rawAddress = addressParts.join(', ')

  if (!rawAddress) throw new Error('Receita Federal não retornou endereço pra esse CNPJ.')

  const geocoded = await getRouteProvider().geocodeAddress(rawAddress)
  if (!geocoded) throw new Error('Não foi possível localizar esse endereço no mapa.')

  return {
    cnpj: digits,
    address: geocoded.formattedAddress,
    latitude: geocoded.lat,
    longitude: geocoded.lng,
  }
}
