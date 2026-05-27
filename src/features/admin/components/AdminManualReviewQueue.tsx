import type { ManualReviewLead } from '@/repositories/leadQualityRepository'

interface Props {
  leads: ManualReviewLead[]
}

export function AdminManualReviewQueue({ leads }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Manual Review Queue{' '}
        <span className="text-sm font-normal text-gray-400">({leads.length} aguardando)</span>
      </h2>

      {leads.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          Nenhum lead aguardando revisão.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      {lead.lead_quality_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
