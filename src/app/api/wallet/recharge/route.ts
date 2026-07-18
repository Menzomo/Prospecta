import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileById, updateProfileSubscription } from '@/repositories/profileRepository'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { createAsaasCustomer, createAsaasPayment, getPixQrCode } from '@/services/asaasService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const amount = Number(body?.amount)

  if (!Number.isFinite(amount) || amount < 30) {
    return Response.json({ error: 'Valor mínimo de recarga é R$ 30,00' }, { status: 400 })
  }

  const company = await getCompanyProfileByUserId(supabase, user.id)
  if (!company?.cpf_cnpj) {
    return Response.json(
      { error: 'Complete seu CPF/CNPJ em Configurações → Telefonia ou Assinatura antes de recarregar.' },
      { status: 422 }
    )
  }

  const adminSupabase = createAdminClient()
  const profile = await getProfileById(supabase, user.id)

  try {
    let customerId = profile?.asaas_customer_id ?? null
    if (!customerId) {
      customerId = await createAsaasCustomer({
        name: company.company_name,
        email: user.email ?? company.commercial_email ?? '',
        cpfCnpj: company.cpf_cnpj,
      })
      await updateProfileSubscription(adminSupabase, user.id, { asaas_customer_id: customerId })
    }

    const paymentId = await createAsaasPayment({
      customerId,
      value: amount,
      description: 'Prospecta — recarga de saldo',
      externalReference: `recharge:${user.id}`,
    })

    const qr = await getPixQrCode(paymentId)

    return Response.json({
      qrCode: qr.encodedImage,
      payload: qr.payload,
      expiresAt: qr.expirationDate,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar recarga.'
    console.error('[api/wallet/recharge]', msg)
    return Response.json({ error: msg }, { status: 502 })
  }
}
