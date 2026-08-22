'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLeadById, updateLead } from '@/repositories/leadRepository'
import { getUserLeadById } from '@/repositories/userLeadRepository'
import { enrichAddressFromCnpj } from '@/services/cnpjEnrichmentService'
import { getRouteProvider } from '@/lib/routing/factory'
import type { Database } from '@/lib/supabase/types'
import type { LeadStatus } from '@/types/leads'

export type SetLeadAddressState = {
  error?: string
  success?: boolean
} | null

type AddressPayload = {
  address: string
  latitude: number
  longitude: number
  cnpj: string | null
}

/**
 * Grava endereço/coordenadas (e opcionalmente CNPJ) de um lead — usada tanto
 * pela busca via CNPJ quanto pela digitação direta do endereço.
 *
 * leads (privada por usuário): grava direto via client autenticado.
 * global_leads (compartilhada, escrita normalmente só de admin): grava via
 * client admin, mas só depois de confirmar que o usuário realmente tem esse
 * lead em user_leads — ação estreita, não abre escrita geral na tabela.
 */
async function saveLeadAddress(
  supabase: SupabaseClient<Database>,
  userId: string,
  leadId: string | null,
  userLeadId: string | null,
  payload: AddressPayload
): Promise<SetLeadAddressState> {
  if (leadId) {
    const lead = await getLeadById(supabase, leadId)
    if (!lead || lead.user_id !== userId) return { error: 'Lead não encontrado.' }

    const updated = await updateLead(supabase, leadId, {
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      city: lead.city,
      status: lead.status as LeadStatus,
      notes: lead.notes,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      cnpj: payload.cnpj ?? lead.cnpj,
    })
    if (!updated) return { error: 'Falha ao salvar endereço.' }

    revalidatePath(`/leads/${leadId}`)
    revalidatePath('/visitas')
    return { success: true }
  }

  if (userLeadId) {
    const userLead = await getUserLeadById(supabase, userLeadId)
    if (!userLead || userLead.user_id !== userId) return { error: 'Lead não encontrado.' }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
      .from('global_leads')
      .update({
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        ...(payload.cnpj ? { cnpj: payload.cnpj } : {}),
      })
      .eq('id', userLead.global_lead_id)

    if (error) {
      console.error('[saveLeadAddress] global_leads update failed', error.message)
      return { error: 'Falha ao salvar endereço.' }
    }

    revalidatePath(`/leads/global/${userLeadId}`)
    revalidatePath('/visitas')
    return { success: true }
  }

  return { error: 'Nenhum lead informado.' }
}

export async function setLeadCnpjAction(
  leadId: string | null,
  userLeadId: string | null,
  _state: SetLeadAddressState,
  formData: FormData
): Promise<SetLeadAddressState> {
  const cnpj = formData.get('cnpj') as string | null
  if (!cnpj?.trim()) return { error: 'Informe o CNPJ.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  let enrichment
  try {
    enrichment = await enrichAddressFromCnpj(cnpj)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao buscar CNPJ.' }
  }

  return saveLeadAddress(supabase, user.id, leadId, userLeadId, {
    address: enrichment.address,
    latitude: enrichment.latitude,
    longitude: enrichment.longitude,
    cnpj: enrichment.cnpj,
  })
}

/**
 * Caminho direto pra quando o usuário já sabe o endereço (achou no site da
 * empresa, por exemplo) — evita depender do CNPJ. Só geocodifica e salva.
 */
export async function setLeadAddressAction(
  leadId: string | null,
  userLeadId: string | null,
  _state: SetLeadAddressState,
  formData: FormData
): Promise<SetLeadAddressState> {
  const address = (formData.get('address') as string | null)?.trim()
  if (!address) return { error: 'Informe o endereço.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const geocoded = await getRouteProvider().geocodeAddress(address).catch(() => null)
  if (!geocoded) return { error: 'Não foi possível localizar esse endereço no mapa.' }

  return saveLeadAddress(supabase, user.id, leadId, userLeadId, {
    address: geocoded.formattedAddress,
    latitude: geocoded.lat,
    longitude: geocoded.lng,
    cnpj: null,
  })
}
