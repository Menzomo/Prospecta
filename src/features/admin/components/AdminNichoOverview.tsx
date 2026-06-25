import type { NichoStats, AdminCategory } from '@/repositories/adminRepository'

interface Props {
  stats: NichoStats[]
  categories: AdminCategory[]
}

export function AdminNichoOverview({ stats, categories }: Props) {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const total = stats.reduce((sum, s) => sum + s.total, 0)

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Leads por Nicho{' '}
        <span className="text-sm font-normal text-gray-400">({total} total)</span>
      </h2>

      {stats.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
          Nenhum dado disponível.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nicho</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-right font-medium text-green-700">Ativos</th>
                <th className="px-4 py-3 text-right font-medium text-yellow-700">Revisão</th>
                <th className="px-4 py-3 text-right font-medium text-blue-700">Enriquecimento</th>
                <th className="px-4 py-3 text-right font-medium text-red-700">Rejeitados</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => {
                const name = row.category_id
                  ? (categoryNameById.get(row.category_id) ?? '—')
                  : 'Sem categoria'
                return (
                  <tr
                    key={row.category_id ?? '__null__'}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{row.total}</td>
                    <td className="px-4 py-3 text-right text-green-700">{row.active}</td>
                    <td className="px-4 py-3 text-right text-yellow-700">{row.pending_review}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{row.pending_enrichment}</td>
                    <td className="px-4 py-3 text-right text-red-700">{row.rejected}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
