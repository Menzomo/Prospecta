import Link from 'next/link'
import type { NichoStockStats } from '@/repositories/adminRepository'
import type { AdminCategory } from '@/repositories/adminRepository'

const LOW_STOCK = 200

interface Props {
  stock: NichoStockStats[]
  categories: AdminCategory[]
}

export function AdminStockOverview({ stock, categories }: Props) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const rows = stock
    .map((s) => ({ ...s, name: categoryMap.get(s.category_id) ?? 'Sem categoria' }))
    .sort((a, b) => a.available - b.available)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Estoque de Leads Disponíveis</h2>
        <Link
          href="/admin/import-apify"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Importar via Apify
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum lead com email encontrado no banco.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Nicho</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Disponíveis</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Consumidos</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const isLow = row.available < LOW_STOCK
                return (
                  <tr key={row.category_id} className={isLow ? 'bg-yellow-50' : undefined}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={isLow ? 'font-semibold text-yellow-700' : 'text-gray-700'}>
                        {row.available}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.consumed}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.total_stock}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isLow && (
                        <Link
                          href={`/admin/import-apify?categoryId=${row.category_id}`}
                          className="rounded bg-yellow-500 px-2 py-1 text-xs font-medium text-white hover:bg-yellow-600"
                        >
                          Importar Mais
                        </Link>
                      )}
                    </td>
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
