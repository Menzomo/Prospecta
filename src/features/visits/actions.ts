'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLeadById } from '@/repositories/leadRepository'
import { getUserLeadById } from '@/repositories/userLeadRepository'
import { createVisit, getVisitsByDate, saveOptimizedOrder, updateVisitStatus, deleteVisit } from '@/repositories/leadVisitRepository'
import { getBalance, debitWallet } from '@/repositories/walletRepository'
import { isAdminUser } from '@/repositories/profileRepository'
import { getRouteProvider } from '@/lib/routing/factory'
import { buildGoogleMapsRouteUrl } from '@/lib/routing/buildMapsUrl'
import type { VisitStatus } from '@/types/visits'

const CUSTO_CALCULO_ROTA = 0.5

// --- Criar visita ---

export type CreateVisitState = { error?: string; success?: boolean } | null

export async function createVisitAction(
  leadId: string | null,
  userLeadId: string | null,
  _state: CreateVisitState,
  formData: FormData
): Promise<CreateVisitState> {
  const scheduledDate = formData.get('scheduled_date') as string | null
  if (!scheduledDate) return { error: 'Escolha a data da visita.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (leadId) {
    const lead = await getLeadById(supabase, leadId)
    if (!lead || lead.user_id !== user.id) return { error: 'Lead não encontrado.' }
  } else if (userLeadId) {
    const userLead = await getUserLeadById(supabase, userLeadId)
    if (!userLead || userLead.user_id !== user.id) return { error: 'Lead não encontrado.' }
  } else {
    return { error: 'Nenhum lead informado.' }
  }

  const created = await createVisit(supabase, user.id, {
    lead_id: leadId,
    user_lead_id: userLeadId,
    scheduled_date: scheduledDate,
  })
  if (!created) return { error: 'Falha ao agendar visita.' }

  revalidatePath('/visitas')
  return { success: true }
}

// --- Status da visita ---

export async function updateVisitStatusAction(id: string, formData: FormData): Promise<void> {
  const status = formData.get('status') as VisitStatus | null
  if (!status) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await updateVisitStatus(supabase, id, status)
  revalidatePath('/visitas')
}

// --- Excluir visita ---

export async function deleteVisitAction(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await deleteVisit(supabase, id)
  revalidatePath('/visitas')
}

// --- Calcular rota otimizada ---

export type CalculateRouteState = {
  error?: string
  result?: { mapsUrl: string; totalDistanceMeters: number; totalDurationSeconds: number }
} | null

export async function calculateRouteAction(
  scheduledDate: string,
  _state: CalculateRouteState,
  formData: FormData
): Promise<CalculateRouteState> {
  const startAddress = (formData.get('start_address') as string | null)?.trim()
  if (!startAddress) return { error: 'Informe o ponto de partida.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const visits = await getVisitsByDate(supabase, user.id, scheduledDate)
  const stops = visits.filter(
    (v) => v.status === 'planejada' && v.latitude != null && v.longitude != null
  )
  if (stops.length === 0) {
    return { error: 'Nenhuma visita planejada com endereço confirmado nesse dia.' }
  }

  const isAdmin = isAdminUser(user.id)
  if (!isAdmin) {
    const balance = await getBalance(supabase, user.id)
    if (balance < CUSTO_CALCULO_ROTA) {
      return { error: `Saldo insuficiente. Calcular rota custa R$ ${CUSTO_CALCULO_ROTA.toFixed(2)}.` }
    }
  }

  const provider = getRouteProvider()

  const start = await provider.geocodeAddress(startAddress).catch(() => null)
  if (!start) return { error: 'Não foi possível localizar o ponto de partida informado.' }

  let optimized
  try {
    optimized = await provider.optimizeRoute(
      { lat: start.lat, lng: start.lng },
      stops.map((v) => ({ id: v.id, lat: v.latitude!, lng: v.longitude! }))
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao calcular a rota.' }
  }

  // Só debita depois que o cálculo teve sucesso — nunca cobra por um cálculo que falhou.
  if (!isAdmin) {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    try {
      await debitWallet(
        adminSupabase,
        user.id,
        CUSTO_CALCULO_ROTA,
        'route',
        crypto.randomUUID(),
        `Cálculo de rota — ${stops.length} paradas`
      )
    } catch {
      return { error: 'Saldo insuficiente pra calcular rota.' }
    }
  }

  await saveOptimizedOrder(supabase, optimized.orderedStopIds)

  const orderedCoords = optimized.orderedStopIds
    .map((id) => stops.find((v) => v.id === id))
    .filter((v): v is (typeof stops)[number] => !!v)
    .map((v) => ({ lat: v.latitude!, lng: v.longitude! }))

  const mapsUrl = buildGoogleMapsRouteUrl({ lat: start.lat, lng: start.lng }, orderedCoords)

  revalidatePath('/visitas')
  return {
    result: {
      mapsUrl,
      totalDistanceMeters: optimized.totalDistanceMeters,
      totalDurationSeconds: optimized.totalDurationSeconds,
    },
  }
}
