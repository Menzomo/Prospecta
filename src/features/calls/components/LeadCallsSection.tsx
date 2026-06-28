'use client'

import { useState } from 'react'
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

export function LeadCallsSection({ calls, leadId, userLeadId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [idx, setIdx] = useState(0)

  // newest first (repository already returns this order, but guard anyway)
  const sorted = [...calls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (sorted.length === 0) return null

  const total = sorted.length
  const call = sorted[idx]
  const analysesArr = Array.isArray(call.call_analyses) ? call.call_analyses : call.call_analyses ? [call.call_analyses] : []
  const analysis = analysesArr[0] ?? null

  return (
    <div className="rounded-xl border border-outline bg-surface-container shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-low"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-on-surface">
            Ligações
            <span className="ml-2 rounded-full bg-surface-low px-2 py-0.5 text-xs font-medium text-on-surface-muted">
              {total}
            </span>
          </span>
          <span className="text-xs text-on-surface-muted">
            Última: {formatDateTime(sorted[0].created_at)}
          </span>
        </div>
        <span className="ml-4 shrink-0 text-xs font-medium text-primary">
          {expanded ? 'Fechar' : 'Ver ligações'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-outline px-6 py-4">
          {/* Carrossel navigation */}
          {total > 1 && (
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => setIdx((i) => i - 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-outline text-on-surface-muted transition-colors hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Mais recente"
              >
                ‹
              </button>
              <span className="text-xs text-on-surface-muted">
                {idx + 1} / {total}
              </span>
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

          {/* Call card — key força remount ao navegar, resetando estado interno */}
          <div key={call.id} className="rounded-lg border border-outline bg-surface p-4 flex flex-col gap-4">
            {/* Header info */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-on-surface">
                {formatDateTime(call.created_at)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${callStatusClass(call.status)}`}>
                {CALL_STATUS_LABELS[call.status] ?? call.status}
              </span>
              {call.duration_seconds != null && (
                <span className="text-xs text-on-surface-muted">
                  {formatDuration(call.duration_seconds)}
                </span>
              )}
              {call.to_number && (
                <span className="text-xs text-on-surface-muted">{call.to_number}</span>
              )}
            </div>

            {call.notes && (
              <p className="text-xs italic text-on-surface-muted">Notas: {call.notes}</p>
            )}

            {/* Audio player */}
            {call.recording_url && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-on-surface">Gravação</p>
                <CallAudioPlayer callId={call.id} />
              </div>
            )}

            {/* Analysis section */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-on-surface">Análise de IA</p>
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
      )}
    </div>
  )
}
