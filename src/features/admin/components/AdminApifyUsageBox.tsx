type ApifyUsage = {
  available: boolean
  username?: string | null
  plan_id?: string | null
  usage_pct?: number | null
  reason?: string
  consulted_at?: string
}

interface Props {
  usage: ApifyUsage
}

export function AdminApifyUsageBox({ usage }: Props) {
  if (!usage.available) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-800">Saldo Apify indisponível</p>
        <p className="mt-1 text-xs text-yellow-700">
          Não foi possível consultar o saldo automaticamente. Verifique no{' '}
          <a
            href="https://console.apify.com/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            painel da Apify
          </a>{' '}
          antes de importar.
        </p>
      </div>
    )
  }

  const usagePct = usage.usage_pct

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Status Apify</p>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Conectado
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
        {usage.username && (
          <span><span className="text-gray-400">Conta: </span>{usage.username}</span>
        )}
        {usage.plan_id && (
          <span><span className="text-gray-400">Plano: </span>{usage.plan_id}</span>
        )}
        {usagePct !== null && usagePct !== undefined ? (
          <span>
            <span className="text-gray-400">Uso do período: </span>
            <span className={usagePct >= 90 ? 'font-semibold text-red-600' : usagePct >= 70 ? 'font-semibold text-yellow-600' : 'text-gray-700'}>
              {usagePct}%
            </span>
          </span>
        ) : (
          <span className="text-gray-400">Uso do período não disponível neste plano</span>
        )}
      </div>

      {usage.consulted_at && (
        <p className="mt-2 text-xs text-gray-400">
          Consultado às {new Date(usage.consulted_at).toLocaleTimeString('pt-BR')}
        </p>
      )}
    </div>
  )
}
