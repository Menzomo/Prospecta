import { disconnectGmailAction } from '@/features/gmail/actions'
import type { GmailConnection } from '@/types/gmail'

type Props = {
  connection: GmailConnection | null
}

export function GmailConnectionCard({ connection }: Props) {
  const isConnected = connection !== null && connection.is_connected

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Gmail</h2>
            <p className="mt-1 text-sm text-gray-500">Nenhuma conta conectada.</p>
          </div>
          <a
            href="/api/gmail/connect"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Conectar Gmail
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Gmail</h2>
          <p className="mt-1 text-sm text-gray-700">{connection.gmail_email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Conectado
          </span>
        </div>
        <form action={disconnectGmailAction}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            Desconectar
          </button>
        </form>
      </div>
    </div>
  )
}
