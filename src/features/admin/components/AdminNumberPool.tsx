'use client'

import { useActionState } from 'react'
import {
  addTelnyxNumberToPoolAction,
  assignTelnyxNumberToUserAction,
  releaseTelnyxNumberAction,
} from '@/features/admin/actions'
import type { AdminTelnyxNumber } from '@/repositories/adminRepository'

type Props = {
  numbers: AdminTelnyxNumber[]
}

function NumberRowActions({ number }: { number: AdminTelnyxNumber }) {
  const boundAssign = assignTelnyxNumberToUserAction.bind(null, number.id)
  const [state, formAction, pending] = useActionState(boundAssign, null)

  const boundRelease = releaseTelnyxNumberAction.bind(null, number.id)

  if (number.status === 'assigned') {
    return (
      <form action={boundRelease}>
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Liberar
        </button>
      </form>
    )
  }

  if (number.status === 'available') {
    return (
      <form action={formAction} className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <input
            type="email"
            name="email"
            placeholder="email do usuário"
            required
            className="w-40 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </div>
        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      </form>
    )
  }

  return null
}

export function AdminNumberPool({ numbers }: Props) {
  const [state, formAction, pending] = useActionState(addTelnyxNumberToPoolAction, null)

  const available = numbers.filter((n) => n.status === 'available').length
  const assigned  = numbers.filter((n) => n.status === 'assigned').length

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Números Telnyx</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total no pool</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{numbers.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Disponíveis</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{available}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Atribuídos</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{assigned}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form action={formAction} className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="phone_number" className="text-sm font-medium text-gray-700">
              Adicionar número ao pool
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              placeholder="+5511999999999"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-400">
          Certifique-se de associar o número à Application de Voz na Telnyx antes de adicionar ao pool.
        </p>
        {state?.error && <p className="mt-2 text-xs text-red-500">{state.error}</p>}
        {state?.success && <p className="mt-2 text-xs text-green-600">Número adicionado ao pool.</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Número</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Atribuído a</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {numbers.map((n) => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{n.phone_number}</td>
                <td className="px-4 py-3 text-gray-500">{n.assigned_user_email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    n.status === 'available' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {n.status === 'available' ? 'Disponível' : n.status === 'assigned' ? 'Atribuído' : 'Desativado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <NumberRowActions number={n} />
                </td>
              </tr>
            ))}
            {numbers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum número no pool ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
