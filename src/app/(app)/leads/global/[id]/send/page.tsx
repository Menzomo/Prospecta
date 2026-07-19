import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listTemplates } from '@/repositories/templateRepository'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getProfileById, isAdminUser } from '@/repositories/profileRepository'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { listAttachmentsByTemplateIds } from '@/repositories/templateAttachmentRepository'
import { sendEmailFromUserLeadAction } from '@/features/email/actions'
import { SendEmailForm } from '@/features/email/components/SendEmailForm'
import { SubscriptionGateCard } from '@/components/SubscriptionGateCard'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SendEmailFromGlobalLeadPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userLeadData, error } = await supabase
    .from('user_leads')
    .select('id, global_leads(company_name, email)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !userLeadData || !userLeadData.global_leads) notFound()

  const gl = userLeadData.global_leads as unknown as {
    company_name: string
    email: string | null
  }

  const [templates, company, profile, connection] = await Promise.all([
    listTemplates(supabase, user.id),
    getCompanyProfileByUserId(supabase, user.id),
    getProfileById(supabase, user.id),
    getGmailConnection(supabase, user.id),
  ])

  const allAttachments =
    templates.length > 0
      ? await listAttachmentsByTemplateIds(supabase, templates.map((t) => t.id))
      : []

  const attachmentsByTemplate = allAttachments.reduce<Record<string, typeof allAttachments>>(
    (acc, att) => {
      if (!acc[att.template_id]) acc[att.template_id] = []
      acc[att.template_id].push(att)
      return acc
    },
    {}
  )

  const isGmailConnected = connection !== null && connection.is_connected
  const boundAction = sendEmailFromUserLeadAction.bind(null, id)
  const canWrite = isAdminUser(user.id) || profile?.subscription_status === 'active'

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href={`/leads/global/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {gl.company_name}
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Enviar email</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          {!isGmailConnected && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Conta Gmail não conectada.{' '}
              <Link href="/settings/gmail" className="font-medium underline">
                Conectar Gmail
              </Link>
            </div>
          )}

          {!gl.email && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Este lead não possui email cadastrado.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Destinatário</p>
            <p className="mt-0.5 font-medium text-gray-900">{gl.company_name}</p>
            {gl.email && <p className="text-sm text-gray-500">{gl.email}</p>}
          </div>

          {!canWrite ? (
            <SubscriptionGateCard description="Assine o Prospecta pra enviar emails pros seus leads." />
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-500">Nenhum template criado ainda.</p>
              <Link
                href="/templates/new"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                Criar template
              </Link>
            </div>
          ) : isGmailConnected && gl.email ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SendEmailForm
                boundAction={boundAction}
                templates={templates}
                variables={{
                  lead_company_name: gl.company_name,
                  user_company_name: company?.company_name ?? '',
                  user_name: profile?.full_name ?? '',
                }}
                attachmentsByTemplate={attachmentsByTemplate}
                followup={{ userLeadId: id }}
              />
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
