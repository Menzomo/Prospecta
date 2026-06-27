'use client'

import { useState, useTransition } from 'react'
import type { CallAnalysis } from '@/types/calls'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'
import { applyCallSuggestedStatusAction } from '@/features/calls/actions'
import { FollowupCreateForm } from '@/features/followups/components/FollowupCreateForm'

type Props = {
  analysis: CallAnalysis | null
  hasRecording: boolean
  callId: string
  leadId?: string | null
  userLeadId?: string | null
}

export function CallAnalysisReport({ analysis, hasRecording, callId: _callId, leadId, userLeadId }: Props) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [statusApplied, setStatusApplied] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!analysis) {
    return (
      <p className="text-xs text-on-surface-muted">
        {hasRecording
          ? 'Gravação disponível. Solicite análise ao abrir o modal de ligação.'
          : 'Nenhuma análise solicitada para esta chamada.'}
      </p>
    )
  }

  if (analysis.status === 'pending') {
    return (
      <p className="text-xs text-on-surface-muted">Análise na fila, aguardando processamento.</p>
    )
  }

  if (analysis.status === 'processing') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-on-surface-muted">IA analisando a conversa...</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs text-primary underline"
        >
          Atualizar
        </button>
      </div>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <p className="text-xs text-red-500">
        Falha na análise{analysis.error_message ? `: ${analysis.error_message}` : '.'}
      </p>
    )
  }

  // completed
  const suggestedStatus = LEAD_STATUSES.includes(analysis.suggested_status as LeadStatus)
    ? (analysis.suggested_status as LeadStatus)
    : null
  const suggestedStatusLabel = suggestedStatus ? LEAD_STATUS_LABELS[suggestedStatus] : null

  function handleApplyStatus(formData: FormData) {
    startTransition(async () => {
      await applyCallSuggestedStatusAction(formData)
      setStatusApplied(true)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {analysis.summary && (
        <div>
          <p className="text-xs font-medium text-on-surface mb-1">Resumo</p>
          <p className="text-xs text-on-surface-muted">{analysis.summary}</p>
        </div>
      )}

      {Array.isArray(analysis.key_points) && (analysis.key_points as string[]).length > 0 && (
        <div>
          <p className="text-xs font-medium text-on-surface mb-1">Pontos principais</p>
          <ul className="space-y-1">
            {(analysis.key_points as string[]).map((pt, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-on-surface-muted">
                <span className="mt-0.5 shrink-0 text-primary">•</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(analysis.objections) && (analysis.objections as string[]).length > 0 && (
        <div>
          <p className="text-xs font-medium text-on-surface mb-1">Objeções</p>
          <div className="flex flex-wrap gap-1.5">
            {(analysis.objections as string[]).map((obj, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      {suggestedStatus && suggestedStatusLabel && !statusApplied && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-on-surface-muted">
            Status sugerido:{' '}
            <span className="font-medium text-on-surface">{suggestedStatusLabel}</span>
          </p>
          <form action={handleApplyStatus}>
            <input type="hidden" name="status" value={suggestedStatus} />
            {leadId && <input type="hidden" name="lead_id" value={leadId} />}
            {userLeadId && <input type="hidden" name="user_lead_id" value={userLeadId} />}
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              Aplicar
            </button>
          </form>
        </div>
      )}

      {statusApplied && (
        <p className="text-xs font-medium text-green-600">Status atualizado.</p>
      )}

      {!showFollowupForm && (analysis.suggested_followup_days || analysis.suggested_followup_notes) && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-on-surface-muted">
            Retorno sugerido em {analysis.suggested_followup_days ?? 3} dia(s)
            {analysis.suggested_followup_notes ? `: "${analysis.suggested_followup_notes}"` : ''}
          </p>
          <button
            type="button"
            onClick={() => setShowFollowupForm(true)}
            className="rounded-md border border-outline px-2.5 py-1 text-xs font-medium text-on-surface hover:bg-surface-low"
          >
            Criar acompanhamento
          </button>
        </div>
      )}

      {showFollowupForm && (
        <div className="mt-1">
          <FollowupCreateForm
            leadId={leadId}
            userLeadId={userLeadId}
            defaultTitle={analysis.suggested_followup_notes ?? 'Retorno da ligação'}
            defaultDaysFromNow={analysis.suggested_followup_days ?? 3}
          />
        </div>
      )}

      {analysis.transcript && (
        <div>
          <button
            type="button"
            onClick={() => setTranscriptExpanded((v) => !v)}
            className="text-xs text-primary underline"
          >
            {transcriptExpanded ? 'Ocultar transcrição' : 'Ver transcrição completa'}
          </button>
          {transcriptExpanded && (
            <p className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-surface-low p-3 text-xs text-on-surface-muted whitespace-pre-wrap">
              {analysis.transcript}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
