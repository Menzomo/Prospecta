// Recebe eventos de pagamento do Asaas (assinatura confirmada, recarga confirmada).
// Autenticação: header "asaas-access-token" comparado a ASAAS_WEBHOOK_TOKEN
// (Asaas não assina o corpo — usa token fixo configurado no painel deles).

import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleAsaasWebhook } from '@/services/asaasService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = request.headers.get('asaas-access-token')
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (!expected || token !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Parameters<typeof handleAsaasWebhook>[1]
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  await handleAsaasWebhook(adminSupabase, payload)

  return Response.json({ ok: true })
}
