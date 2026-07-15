import type { AdminUserWallet } from '@/repositories/adminRepository'

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatUSD(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type TelnyxBalance = {
  balance: string
  available_credit: string
  currency: string
} | null

type Props = {
  telnyxBalance: TelnyxBalance
  wallets: AdminUserWallet[]
}

export function AdminWalletOverview({ telnyxBalance, wallets }: Props) {
  const totalUserBalance = wallets.reduce((sum, w) => sum + w.balance, 0)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Créditos e Saldos</h2>

      {/* Cards de visão geral */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Saldo Telnyx */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Saldo Telnyx (conta)
          </p>
          {telnyxBalance ? (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {telnyxBalance.currency} {formatUSD(Number(telnyxBalance.balance))}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Disponível: {telnyxBalance.currency} {formatUSD(Number(telnyxBalance.available_credit))}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">
              {process.env.TELEPHONY_PROVIDER === 'telnyx'
                ? 'Erro ao buscar saldo'
                : 'Telnyx não ativo'}
            </p>
          )}
        </div>

        {/* Total em carteiras de usuários */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total em carteiras (usuários)
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            R$ {formatBRL(totalUserBalance)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{wallets.length} usuário(s)</p>
        </div>

        {/* Usuários com saldo baixo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Saldo insuficiente (&lt; R$0,20)
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {wallets.filter((w) => w.balance < 0.20).length}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">usuário(s) bloqueados para ligações</p>
        </div>
      </div>

      {/* Tabela de saldos por usuário */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                Usuário
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Saldo (R$)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400 hidden sm:table-cell">
                Última movimentação
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wallets.map((w) => {
              const insufficient = w.balance < 0.20
              return (
                <tr key={w.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                    {w.email}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${insufficient ? 'text-amber-600' : 'text-gray-900'}`}>
                    R$ {formatBRL(w.balance)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                    {w.updated_at
                      ? new Date(w.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {insufficient ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Insuficiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {wallets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
