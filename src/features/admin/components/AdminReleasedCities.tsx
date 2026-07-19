'use client'

import { releaseCityAction, unreleaseCityAction } from '@/features/admin/actions'
import type { AdminCityStat } from '@/repositories/adminRepository'
import type { ReleasedCity } from '@/repositories/releasedCityRepository'

type Props = {
  cities: AdminCityStat[]
  released: ReleasedCity[]
}

function CityRowAction({ city, state, isReleased }: { city: string; state: string | null; isReleased: boolean }) {
  if (isReleased) {
    const boundUnrelease = unreleaseCityAction.bind(null, city)
    return (
      <form action={boundUnrelease}>
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Bloquear
        </button>
      </form>
    )
  }

  const boundRelease = releaseCityAction.bind(null, city, state)
  return (
    <form action={boundRelease}>
      <button
        type="submit"
        className="cursor-pointer rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
      >
        Liberar
      </button>
    </form>
  )
}

export function AdminReleasedCities({ cities, released }: Props) {
  const releasedNames = new Set(released.map((r) => r.city))

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Cidades liberadas pra usuários</h2>
        <p className="mt-1 text-sm text-gray-500">
          Controla quais cidades de global_leads aparecem no select de busca de leads e no onboarding.
          Cidades não liberadas ficam invisíveis pra usuários comuns (mas continuam visíveis pra você como admin).
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Cidade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">UF</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Leads</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cities.map((c) => {
              const isReleased = releasedNames.has(c.city)
              return (
                <tr key={c.city} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.city}</td>
                  <td className="px-4 py-3 text-gray-500">{c.state ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{c.count}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      isReleased ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isReleased ? 'Liberada' : 'Bloqueada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CityRowAction city={c.city} state={c.state} isReleased={isReleased} />
                  </td>
                </tr>
              )
            })}
            {cities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma cidade em global_leads ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
