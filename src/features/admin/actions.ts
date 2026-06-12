'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getGlobalLeadById,
  updateGlobalLeadEmailAndPromote,
  markGlobalLeadInvalid,
} from '@/repositories/globalLeadRepository'

const addEmailSchema = z.object({
  email: z.string().trim().email('Email inválido. Verifique o formato.'),
})

export type AddEmailActionState = {
  error?: string
  success?: boolean
} | null

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
