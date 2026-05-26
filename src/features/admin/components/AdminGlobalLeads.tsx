import type { AdminGlobalLead } from '@/repositories/adminRepository'

interface Props {
  leads: AdminGlobalLead[]
}

export function AdminGlobalLeads({ leads }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Global Leads{' '}
        <span className="text-sm font-normal text-gray-400">({leads.length} mais recentes)</span>
      </h2>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          Nenhum lead encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">UF</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.state ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        lead.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.confidence_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
