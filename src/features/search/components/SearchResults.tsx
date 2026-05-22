import type { SearchApiResponse, SearchOutcome } from '../types'

type Props = {
  response: SearchApiResponse
}

const OUTCOME_CONFIG: Record<SearchOutcome, { label: string; className: string }> = {
  saved: { label: 'Salvo', className: 'bg-green-100 text-green-700' },
  duplicate: { label: 'Duplicado', className: 'bg-gray-100 text-gray-600' },
  no_email: { label: 'Sem email', className: 'bg-yellow-100 text-yellow-700' },
  fetch_error: { label: 'Site inacessível', className: 'bg-red-100 text-red-700' },
  limit_reached: { label: 'Limite atingido', className: 'bg-orange-100 text-orange-700' },
}

export function SearchResults({ response }: Props) {
  const saved = response.results.filter((r) => r.outcome === 'saved')
  const others = response.results.filter((r) => r.outcome !== 'saved')

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{response.saved}</p>
            <p className="mt-0.5 text-sm text-gray-500">leads salvos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{response.daily_remaining}</p>
            <p className="mt-0.5 text-sm text-gray-500">restantes hoje</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{response.results.length}</p>
            <p className="mt-0.5 text-sm text-gray-500">empresas analisadas</p>
          </div>
        </div>

        {response.daily_remaining === 0 && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
            Limite diário atingido. Volte amanhã para buscar mais leads.
          </p>
        )}
      </div>

      {/* No results */}
      {response.results.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-500">Nenhuma empresa encontrada para essa busca.</p>
          <p className="mt-1 text-xs text-gray-400">Tente outra categoria ou cidade.</p>
        </div>
      )}

      {/* Saved leads */}
      {saved.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Leads salvos</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {saved.map((item, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.company_name}</p>
                    <p className="mt-0.5 text-xs font-medium text-blue-600">{item.email}</p>
                    {item.website && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{item.website}</p>
                    )}
                    {item.phone && (
                      <p className="mt-0.5 text-xs text-gray-400">{item.phone}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Salvo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other results */}
      {others.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Demais resultados</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {others.map((item, i) => {
              const cfg = OUTCOME_CONFIG[item.outcome]
              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">{item.company_name}</p>
                      {item.website && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">{item.website}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
