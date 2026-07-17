'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getGlobalLeadById,
  updateGlobalLeadEmailAndPromote,
  markGlobalLeadInvalid,
  approveGlobalLead,
  rejectGlobalLead,
  reprocessGlobalLead,
} from '@/repositories/globalLeadRepository'

const addEmailSchema = z.object({
  email: z.string().trim().email('Email inválido. Verifique o formato.'),
})

export type AddEmailActionState = {
  error?: string
  success?: boolean
} | null

const addTelnyxNumberSchema = z.object({
  phone_number: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Formato E.164 inválido. Ex.: +5511999999999'),
})

export type AddTelnyxNumberActionState = {
  error?: string
  success?: boolean
} | null

export async function addTelnyxNumberToPoolAction(
  _state: AddTelnyxNumberActionState,
  formData: FormData
): Promise<AddTelnyxNumberActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const validation = addTelnyxNumberSchema.safeParse({
    phone_number: formData.get('phone_number'),
  })

  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors.phone_number?.[0] ?? 'Número inválido.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('telnyx_numbers')
    .insert({ phone_number: validation.data.phone_number, status: 'available' })

  if (error) {
    return { error: error.code === '23505' ? 'Esse número já está no pool.' : 'Erro ao adicionar número. Tente novamente.' }
  }

  revalidatePath('/admin')
  return { success: true }
}

const assignTelnyxNumberSchema = z.object({
  email: z.string().trim().email('Email inválido.'),
})

export type AssignTelnyxNumberActionState = {
  error?: string
  success?: boolean
} | null

/**
 * Atribui manualmente um número do pool a um usuário, por fora do fluxo de
 * assinatura/Asaas — usado pra testes ou clientes que pagam fora do fluxo
 * automático (ex.: dinheiro). Reaproveita a mesma RPC atômica do fluxo
 * self-service (claim_telnyx_number aceita qualquer p_user_id).
 */
export async function assignTelnyxNumberToUserAction(
  numberId: string,
  _state: AssignTelnyxNumberActionState,
  formData: FormData
): Promise<AssignTelnyxNumberActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const validation = assignTelnyxNumberSchema.safeParse({ email: formData.get('email') })
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors.email?.[0] ?? 'Email inválido.' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  const { data: targetProfile } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('email', validation.data.email)
    .maybeSingle()

  if (!targetProfile) {
    return { error: 'Usuário não encontrado com esse email.' }
  }

  const { claimTelnyxNumber } = await import('@/repositories/telnyxNumberRepository')

  try {
    await claimTelnyxNumber(adminSupabase, targetProfile.id, numberId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('number_not_available')) return { error: 'Esse número não está mais disponível.' }
    if (msg.includes('user_already_has_number')) return { error: 'Esse usuário já tem um número atribuído — libere o dele primeiro.' }
    return { error: 'Erro ao atribuir número. Tente novamente.' }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Libera um número atribuído, devolvendo pro pool (status='available').
 * Não zera cpf_cnpj/forwarding_cell_phone do usuário — se ele reivindicar
 * outro número depois, os dados já preenchidos continuam valendo.
 */
export async function releaseTelnyxNumberAction(numberId: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  await adminSupabase
    .from('telnyx_numbers')
    .update({ status: 'available', user_id: null, assigned_at: null })
    .eq('id', numberId)
    .eq('status', 'assigned')

  revalidatePath('/admin')
}

export async function addEmailToGlobalLeadAction(
  leadId: string,
  _state: AddEmailActionState,
  formData: FormData
): Promise<AddEmailActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const validation = addEmailSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors.email?.[0] ?? 'Email inválido.' }
  }

  const { email } = validation.data

  const lead = await getGlobalLeadById(supabase, leadId)
  if (!lead) return { error: 'Lead não encontrado.' }

  const ok = await updateGlobalLeadEmailAndPromote(supabase, leadId, email)
  if (!ok) return { error: 'Erro ao salvar email. Tente novamente.' }

  revalidatePath(`/admin/global-leads/${leadId}`)
  revalidatePath('/admin')

  return { success: true }
}

export async function dismissGlobalLeadAction(leadId: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const ok = await markGlobalLeadInvalid(supabase, leadId)
  if (ok) {
    console.log(`[dismissGlobalLeadAction] Admin ${user.email} dismissed lead ${leadId}`)
  }

  revalidatePath('/admin')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, user }
}

export async function approveGlobalLeadAction(leadId: string, _formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const ok = await approveGlobalLead(supabase, leadId, user.id)
  if (ok) console.log(`[approveGlobalLeadAction] Admin ${user.email} approved lead ${leadId}`)
  revalidatePath('/admin')
}

export async function rejectGlobalLeadAction(leadId: string, _formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const ok = await rejectGlobalLead(supabase, leadId, 'rejected_by_admin')
  if (ok) console.log(`[rejectGlobalLeadAction] Admin ${user.email} rejected lead ${leadId}`)
  revalidatePath('/admin')
}

export async function reprocessGlobalLeadAction(leadId: string, _formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const ok = await reprocessGlobalLead(supabase, leadId)
  if (ok) console.log(`[reprocessGlobalLeadAction] Admin ${user.email} reprocessed lead ${leadId}`)
  revalidatePath('/admin')
}
