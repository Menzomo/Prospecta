import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGlobalLeadByIdForAdmin } from '@/repositories/adminRepository'
import { listLeadCategories } from '@/repositories/leadCategoryRepository'
import { GlobalLeadEmailForm } from '@/features/admin/components/GlobalLeadEmailForm'

type Props = {
  params: Promise<{ id: string }>
}

const QUALITY_BADGES: Record<string, { label: string; className: string }> = {
  email_found: { label: 'Email Found', className: 'bg-green-50 text-green-700' },
  website_only: { label: 'Website Only', className: 'bg-blue-50 text-blue-700' },
  manual_review: { label: 'Manual Review', className: 'bg-yellow-50 text-yellow-700' },
  invalid: { label: 'Invalid', className: 'bg-red-50 text-red-700' },
}

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  hidden: 'bg-gray-100 text-gray-500',
  invalid: 'bg-red-50 text-red-700',
}

export default async function AdminGlobalLeadDetailPage({ params }: Props) {
  const { id } = await params

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

  const [lead, categories] = await Promise.all([
    getGlobalLeadByIdForAdmin(supabase, id),
    listLeadCategories(supabase),
  ])

  if (!lead) notFound()

  const category = categories.find((c) => c.id === lead.category_id)
  const quality = QUALITY_BADGES[lead.lead_quality_status] ?? { label: lead.lead_quality_status, className: 'bg-gray-100 text-gray-500' }
  const needsEmail = lead.lead_quality_status !== 'email_found'

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Admin
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">{lead.company_name}</h1>
        </div>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Status overview */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500">Qualidade</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${quality.className}`}>
                  {quality.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {lead.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Categoria</p>
                <p className="mt-0.5 text-sm text-gray-700">{category?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fonte</p>
                <p className="mt-0.5 text-sm text-gray-700">{lead.provider_source ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Lead data */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Dados do lead</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-500">Empresa</dt>
                <dd className="font-medium text-gray-800">{lead.company_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-500">Email</dt>
                <dd className={lead.email ? 'text-blue-600' : 'text-gray-300'}>
                  {lead.email ?? 'Sem email'}
                </dd>
              </div>
              {lead.website && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Site</dt>
                  <dd>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      {lead.website}
                    </a>
                  </dd>
                </div>
              )}
              {lead.phone && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Telefone</dt>
                  <dd className="text-gray-800">{lead.phone}</dd>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500">Localização</dt>
                  <dd className="text-gray-800">
                    {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-500">Importado</dt>
                <dd className="text-gray-600">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Email form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              {needsEmail ? 'Adicionar email' : 'Editar email'}
            </h2>
            {needsEmail && (
              <p className="mb-4 text-xs text-gray-500">
                Ao salvar, o lead será promovido para <strong>email_found</strong> e ficará
                disponível nas buscas dos usuários.
              </p>
            )}
            <GlobalLeadEmailForm leadId={lead.id} currentEmail={lead.email} />
          </div>
        </div>
      </main>
    </>
  )
}
