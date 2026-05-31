import Link from 'next/link'
import type { UserNichoStock } from '@/repositories/adminRepository'
import type { AdminCategory } from '@/repositories/adminRepository'

const LOW_STOCK = 200

interface Props {
  stock: UserNichoStock[]
  categories: AdminCategory[]
}

export function AdminUserStockOverview({ stock, categories }: Props) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  if (stock.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Estoque por Usuário e Nicho</h2>
        <p className="text-sm text-gray-400">Nenhum usuário com leads consumidos ainda.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Estoque por Usuário e Nicho</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Usuário</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Nicho</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Disponíveis</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Consumidos</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">Total Global</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stock.map((row) => {
              const category = categoryMap.get(row.category_id)
              const isLow = row.available < LOW_STOCK
              return (
                <tr
                  key={`${row.user_id}:${row.category_id}`}
                  className={isLow ? 'bg-yellow-50' : undefined}
                >
                  <td className="px-4 py-2.5 text-gray-700">{row.user_email}</td>
                  <td className="px-4 py-2.5 text-gray-700">{category?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={isLow ? 'font-semibold text-yellow-700' : 'text-gray-700'}>
                      {row.available}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{row.consumed}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{row.total_global}</td>
                  <td className="px-4 py-2.5 text-center">
                    {isLow ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        Baixo estoque
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isLow && category && (
                      <Link
                        href={`/admin/import-apify?categoryId=${category.id}`}
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
    </section>
  )
}
