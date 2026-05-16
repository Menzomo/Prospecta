import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLeadById } from '@/repositories/leadRepository'
import { listTemplates } from '@/repositories/templateRepository'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { getProfileById } from '@/repositories/profileRepository'
import { getGmailConnection } from '@/repositories/gmailRepository'
import { SendEmailForm } from '@/features/email/components/SendEmailForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SendEmailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [lead, templates, company, profile, connection] = await Promise.all([
    getLeadById(supabase, id),
    listTemplates(supabase, user.id),
    getCompanyProfileByUserId(supabase, user.id),
    getProfileById(supabase, user.id),
    getGmailConnection(supabase, user.id),
  ])

  if (!lead) notFound()

  const isGmailConnected = connection !== null && connection.is_connected

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href={`/leads/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {lead.company_name}
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

          {!lead.email && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Este lead não possui email cadastrado. Adicione um email antes de enviar.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Destinatário</p>
            <p className="mt-0.5 font-medium text-gray-900">{lead.company_name}</p>
            {lead.email && (
              <p className="text-sm text-gray-500">{lead.email}</p>
            )}
          </div>

          {templates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-500">Nenhum template criado ainda.</p>
              <Link href="/templates/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                Criar template
              </Link>
            </div>
          ) : isGmailConnected && lead.email ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SendEmailForm
                leadId={id}
                templates={templates}
                variables={{
                  lead_company_name: lead.company_name,
                  user_company_name: company?.company_name ?? '',
                  user_name: profile?.full_name ?? '',
                }}
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
