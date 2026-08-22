'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLeadById, updateLead } from '@/repositories/leadRepository'
import { getUserLeadById } from '@/repositories/userLeadRepository'
import { enrichAddressFromCnpj } from '@/services/cnpjEnrichmentService'
import type { LeadStatus } from '@/types/leads'

export type SetLeadAddressState = {
  error?: string
  success?: boolean
} | null

/**
 * Preenche endereço/coordenadas de um lead a partir do CNPJ — caminho pra
 * leads manuais ou de busca que ainda não têm address/latitude/longitude
 * (não vieram da importação Apify, que já traz isso automaticamente).
 *
 * leads (privada por usuário): grava direto via client autenticado.
 * global_leads (compartilhada, escrita normalmente só de admin): grava via
 * client admin, mas só depois de confirmar que o usuário realmente tem esse
 * lead em user_leads — ação estreita, não abre escrita geral na tabela.
 */
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

  if (leadId) {
    const lead = await getLeadById(supabase, leadId)
    if (!lead || lead.user_id !== user.id) return { error: 'Lead não encontrado.' }

    const updated = await updateLead(supabase, leadId, {
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      city: lead.city,
      status: lead.status as LeadStatus,
      notes: lead.notes,
      address: enrichment.address,
      latitude: enrichment.latitude,
      longitude: enrichment.longitude,
      cnpj: enrichment.cnpj,
    })
    if (!updated) return { error: 'Falha ao salvar endereço.' }

    revalidatePath(`/leads/${leadId}`)
    return { success: true }
  }

  if (userLeadId) {
    const userLead = await getUserLeadById(supabase, userLeadId)
    if (!userLead || userLead.user_id !== user.id) return { error: 'Lead não encontrado.' }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
      .from('global_leads')
      .update({
        address: enrichment.address,
        latitude: enrichment.latitude,
        longitude: enrichment.longitude,
        cnpj: enrichment.cnpj,
      })
      .eq('id', userLead.global_lead_id)

    if (error) {
      console.error('[setLeadCnpjAction] global_leads update failed', error.message)
      return { error: 'Falha ao salvar endereço.' }
    }

    revalidatePath(`/leads/global/${userLeadId}`)
    return { success: true }
  }

  return { error: 'Nenhum lead informado.' }
}
