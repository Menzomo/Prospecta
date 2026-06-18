'use client'

import { useState } from 'react'
import { disconnectGmailAction } from '@/features/gmail/actions'
import { requestGmailAccessAction } from '@/features/gmail/actions'
import type { GmailConnection, GmailRequestStatus } from '@/types/gmail'

type Props = {
  connection: GmailConnection | null
  requestStatus: GmailRequestStatus
  requestEmail: string | null
}

export function GmailConnectionCard({ connection, requestStatus, requestEmail }: Props) {
  const isConnected = connection !== null && connection.is_connected

  // Request form state (only used when not_requested)
  const [gmailInput, setGmailInput] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [justRequested, setJustRequested] = useState(false)

  async function handleRequest() {
    if (!gmailInput.trim()) return
    setRequesting(true)
    setRequestError(null)
    const result = await requestGmailAccessAction(gmailInput.trim())
    setRequesting(false)
    if (result.error) {
      setRequestError(result.error)
    } else {
      setJustRequested(true)
    }
  }

  // ── connected ──
  if (isConnected) {
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
              className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Desconectar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── approved — ready to connect ──
  if (requestStatus === 'approved') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Gmail</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sua conta <span className="font-medium text-gray-700">{requestEmail}</span> foi liberada.
          </p>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <span>✓</span>
          <span>Gmail liberado — você já pode conectar</span>
        </div>
        <a
          href="/api/gmail/connect"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Conectar Gmail
        </a>
      </div>
    )
  }

  // ── pending — waiting for approval ──
  if (requestStatus === 'pending' || justRequested) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Gmail</h2>
        <div className="rounded-lg bg-amber-50 p-4">
          <p className="font-medium text-amber-800">⏳ Aguardando liberação</p>
          {requestEmail && (
            <p className="mt-1 text-sm text-amber-700">
              Solicitação enviada para <span className="font-medium">{requestEmail}</span>.
            </p>
          )}
          <p className="mt-2 text-sm text-amber-700">
            Estamos liberando sua conta para uso do Gmail. Você receberá acesso em breve.
          </p>
        </div>
      </div>
    )
  }

  // ── not_requested — show request form ──
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Gmail</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Como estamos em fase beta, precisamos liberar seu Gmail antes da conexão.
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="gmail_settings_request" className="text-sm font-medium text-gray-700">
            Gmail que deseja utilizar
          </label>
          <input
            id="gmail_settings_request"
            type="email"
            placeholder="usuario@gmail.com"
            value={gmailInput}
            onChange={(e) => setGmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRequest()}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {requestError && <p className="text-xs text-red-500">{requestError}</p>}
        </div>
        <button
          type="button"
          onClick={handleRequest}
          disabled={requesting || !gmailInput.trim()}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requesting ? 'Enviando...' : 'Solicitar liberação'}
        </button>
      </div>
    </div>
  )
}
