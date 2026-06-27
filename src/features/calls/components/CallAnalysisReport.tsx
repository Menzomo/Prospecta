'use client'

import { useState, useTransition } from 'react'
import type { CallAnalysis } from '@/types/calls'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/types/leads'
import type { LeadStatus } from '@/types/leads'
import { applyCallSuggestedStatusAction } from '@/features/calls/actions'
import { FollowupCreateForm } from '@/features/followups/components/FollowupCreateForm'

type ReanalyzeButtonProps = {
  state: 'idle' | 'loading' | 'done' | 'error'
  onReanalyze: () => void
  onReset: () => void
}

function ReanalyzeButton({ state, onReanalyze, onReset }: ReanalyzeButtonProps) {
  if (state === 'done') {
    return <p className="text-xs text-green-600">Reanálise solicitada. Atualize a página em alguns minutos.</p>
  }
  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-red-500">Erro ao solicitar reanálise.</p>
        <button type="button" onClick={onReset} className="text-xs text-primary underline">Tentar novamente</button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onReanalyze}
      disabled={state === 'loading'}
      className="self-start text-xs text-on-surface-muted underline hover:text-on-surface disabled:opacity-60"
    >
      {state === 'loading' ? 'Solicitando…' : 'Reanalisar com IA'}
    </button>
  )
}

type Props = {
  analysis: CallAnalysis | null
  hasRecording: boolean
  callId: string
  leadId?: string | null
  userLeadId?: string | null
}

export function CallAnalysisReport({ analysis, hasRecording, callId, leadId, userLeadId }: Props) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [statusApplied, setStatusApplied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [reanalyzeState, setReanalyzeState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleRequestAnalysis() {
    setRequestState('loading')
    const res = await fetch(`/api/calls/${callId}/request-analysis`, { method: 'POST' })
    if (res.ok) setRequestState('done')
    else setRequestState('error')
  }

  async function handleReanalyze() {
    setReanalyzeState('loading')
    const res = await fetch(`/api/calls/${callId}/reanalyze`, { method: 'POST' })
    if (res.ok) setReanalyzeState('done')
    else setReanalyzeState('error')
  }

  if (!analysis) {
    if (!hasRecording) {
      return <p className="text-xs text-on-surface-muted">Nenhuma gravação disponível para esta chamada.</p>
    }
    return (
      <div className="flex flex-col gap-2">
        {requestState === 'idle' && (
          <button
            type="button"
            onClick={handleRequestAnalysis}
            className="self-start cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Solicitar análise de IA
          </button>
        )}
        {requestState === 'loading' && (
          <p className="text-xs text-on-surface-muted">Solicitando análise…</p>
        )}
        {requestState === 'done' && (
          <p className="text-xs text-green-600">Análise solicitada. Recarregue a página em alguns minutos para ver o resultado.</p>
        )}
        {requestState === 'error' && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-red-500">Erro ao solicitar análise.</p>
            <button type="button" onClick={() => setRequestState('idle')} className="self-start text-xs text-primary underline">
              Tentar novamente
            </button>
          </div>
        )}
      </div>
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
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-500">
          Falha na análise{analysis.error_message ? `: ${analysis.error_message}` : '.'}
        </p>
        <ReanalyzeButton state={reanalyzeState} onReanalyze={handleReanalyze} onReset={() => setReanalyzeState('idle')} />
      </div>
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

      <div className="border-t border-outline pt-3">
        <ReanalyzeButton state={reanalyzeState} onReanalyze={handleReanalyze} onReset={() => setReanalyzeState('idle')} />
      </div>
    </div>
  )
}
