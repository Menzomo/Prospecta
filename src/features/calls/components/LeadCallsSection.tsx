'use client'

import { useState } from 'react'
import type { CallWithAnalysis } from '@/types/calls'
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

function analysisBadge(status: string): { label: string; cls: string } | null {
  switch (status) {
    case 'completed': return { label: 'Análise disponível', cls: 'bg-blue-100 text-blue-700' }
    case 'processing': return { label: 'Analisando...', cls: 'bg-amber-100 text-amber-700' }
    case 'pending': return { label: 'Na fila', cls: 'bg-gray-100 text-gray-500' }
    case 'failed': return { label: 'Análise falhou', cls: 'bg-red-100 text-red-700' }
    default: return null
  }
}

export function LeadCallsSection({ calls, leadId, userLeadId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  if (calls.length === 0) return null

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
              {calls.length}
            </span>
          </span>
          <span className="text-xs text-on-surface-muted">
            Última: {formatDateTime(calls[0].created_at)}
          </span>
        </div>
        <span className="ml-4 shrink-0 text-xs font-medium text-primary">
          {expanded ? 'Fechar' : 'Ver ligações'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-outline px-6 py-4">
          <div className="flex flex-col gap-3">
            {calls.map((call) => {
              const analysis = (call.call_analyses ?? [])[0] ?? null
              const isOpen = expandedCallId === call.id
              const badge = analysis ? analysisBadge(analysis.status) : null

              return (
                <div key={call.id} className="rounded-lg border border-outline bg-surface p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedCallId(isOpen ? null : call.id)}
                    className="flex w-full items-start justify-between text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-on-surface">
                          {formatDateTime(call.created_at)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${callStatusClass(call.status)}`}
                        >
                          {CALL_STATUS_LABELS[call.status] ?? call.status}
                        </span>
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-on-surface-muted">
                        <span>Duração: {formatDuration(call.duration_seconds)}</span>
                        <span>{call.to_number}</span>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-on-surface-muted">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 border-t border-outline pt-3">
                      {call.notes && (
                        <p className="mb-3 text-xs italic text-on-surface-muted">
                          Notas: {call.notes}
                        </p>
                      )}
                      <CallAnalysisReport
                        analysis={analysis}
                        hasRecording={!!call.recording_url}
                        callId={call.id}
                        leadId={leadId}
                        userLeadId={userLeadId}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
