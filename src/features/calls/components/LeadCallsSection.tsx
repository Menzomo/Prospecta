'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CallWithAnalysis } from '@/types/calls'
import { CallAudioPlayer } from './CallAudioPlayer'
import { CallAnalysisReport } from './CallAnalysisReport'

type Props = {
  calls: CallWithAnalysis[]
  leadId?: string | null
  userLeadId?: string | null
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}min ${s}s` : `${s}s`
}

// Estimativa — reflete a mesma regra de handleStatusCallbackWebhook (minuto arredondado pra cima × R$0,20).
// Chamadas de entrada não são cobradas (custo absorvido pela Prospecta).
function formatCallCost(call: CallWithAnalysis): string | null {
  if (call.direction === 'inbound') return null
  if (call.status !== 'completed' || !call.duration_seconds) return null
  const minutos = Math.ceil(call.duration_seconds / 60)
  const custo = minutos * 0.20
  return custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CALL_STATUS_LABELS: Record<string, string> = {
  initiated: 'Iniciando',
  ringing: 'Chamando',
  'in-progress': 'Em andamento',
  completed: 'Concluída',
  failed: 'Falha',
  'no-answer': 'Sem resposta',
  busy: 'Ocupado',
  canceled: 'Cancelada',
}

function callStatusClass(status: string): string {
  if (status === 'completed') return 'bg-green-100 text-green-700'
  if (status === 'failed' || status === 'no-answer') return 'bg-red-100 text-red-700'
  return 'bg-surface-low text-on-surface-muted'
}

function CallsModal({
  calls,
  leadId,
  userLeadId,
  onClose,
}: {
  calls: CallWithAnalysis[]
  leadId?: string | null
  userLeadId?: string | null
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const total = calls.length
  const call = calls[idx]
  const analysesArr = Array.isArray(call.call_analyses)
    ? call.call_analyses
    : call.call_analyses
    ? [call.call_analyses]
    : []
  const analysis = analysesArr[0] ?? null

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-surface-container shadow-2xl" style={{ maxHeight: '88vh' }}>
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-outline px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-on-surface">Ligações</span>
            <span className="rounded-full bg-surface-low px-2.5 py-0.5 text-xs font-semibold text-on-surface-muted">
              {total}
            </span>
          </div>

          {/* Carousel navigation */}
          {total > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => setIdx((i) => i - 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-outline text-on-surface-muted transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mais recente"
              >
                ‹
              </button>
              <span className="text-xs text-on-surface-muted">{idx + 1} / {total}</span>
              <button
                type="button"
                disabled={idx === total - 1}
                onClick={() => setIdx((i) => i + 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-outline text-on-surface-muted transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mais antiga"
              >
                ›
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-muted transition-colors hover:bg-surface-low hover:text-on-surface"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div key={call.id} className="flex flex-col gap-5">
            {/* Call meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface">{formatDateTime(call.created_at)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${callStatusClass(call.status)}`}>
                {CALL_STATUS_LABELS[call.status] ?? call.status}
              </span>
              {call.duration_seconds != null && (
                <span className="text-xs text-on-surface-muted">{formatDuration(call.duration_seconds)}</span>
              )}
              {formatCallCost(call) && (
                <span className="text-xs text-on-surface-muted">R$ {formatCallCost(call)}</span>
              )}
              {call.to_number && (
                <span className="text-xs text-on-surface-muted">{call.to_number}</span>
              )}
            </div>

            {call.notes && (
              <p className="text-sm italic text-on-surface-muted">Notas: {call.notes}</p>
            )}

            {/* Audio player */}
            {call.recording_url && (
              <div>
                <p className="mb-2 text-sm font-semibold text-on-surface">Gravação</p>
                <CallAudioPlayer callId={call.id} />
              </div>
            )}

            {/* AI Analysis */}
            <div>
              <p className="mb-3 text-sm font-semibold text-on-surface">Análise de IA</p>
              <CallAnalysisReport
                analysis={analysis}
                hasRecording={!!call.recording_url}
                callId={call.id}
                leadId={leadId}
                userLeadId={userLeadId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function LeadCallsSection({ calls, leadId, userLeadId }: Props) {
  const [open, setOpen] = useState(false)

  const sorted = [...calls].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (sorted.length === 0) return null

  return (
    <>
      <div className="rounded-xl border border-outline bg-surface-container shadow-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-low"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-on-surface">
              Ligações
              <span className="ml-2 rounded-full bg-surface-low px-2 py-0.5 text-xs font-medium text-on-surface-muted">
                {sorted.length}
              </span>
            </span>
            <span className="text-xs text-on-surface-muted">
              Última: {formatDateTime(sorted[0].created_at)}
            </span>
          </div>
          <span className="ml-4 shrink-0 text-xs font-medium text-primary">Ver ligações</span>
        </button>
      </div>

      {open && (
        <CallsModal
          calls={sorted}
          leadId={leadId}
          userLeadId={userLeadId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
