'use client'

import { useState, useEffect, useRef } from 'react'
import { usePhoneCall } from '../hooks/usePhoneCall'
import { CallTimer } from './CallTimer'
import { CallStatusIndicator } from './CallStatusIndicator'
import { saveCallNotesAction, getAnalysisCreditsAction } from '../actions'

type Props = {
  phone: string
  companyName: string
  leadId?: string | null
  userLeadId?: string | null
  onClose: () => void
}

export function PhoneCallModal({ phone, companyName, leadId, userLeadId, onClose }: Props) {
  const [editablePhone, setEditablePhone] = useState(phone)
  const [notes, setNotes]                 = useState('')
  const [notesSaved, setNotesSaved]       = useState(false)
  const [credits, setCredits]             = useState<number | null>(null)
  const [analysisState, setAnalysisState] = useState<
    'idle' | 'loading' | 'requested' | 'no_recording' | 'no_credits' | 'error' | 'ignored'
  >('idle')
  const [recordingReady, setRecordingReady] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { state, error, callId, connectedAt, endedAt, startCall, endCall, reset } = usePhoneCall({
    leadId,
    userLeadId,
  })

  const isActive    = state === 'in-progress'
  const isEnded     = state === 'ended'
  const isBusy      = ['initializing', 'connecting', 'ringing', 'in-progress'].includes(state)
  const canStart    = state === 'idle' || state === 'error'

  // Ao encerrar: foca notas, busca créditos e inicia polling de gravação
  useEffect(() => {
    if (!isEnded) return
    notesRef.current?.focus()
    getAnalysisCreditsAction().then(c => {
      if (c) setCredits(c.credits_total - c.credits_used)
    })
    if (connectedAt && callId) {
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/calls/${callId}/recording-ready`).catch(() => null)
        if (!res?.ok) return
        const data = await res.json().catch(() => ({}))
        if (data.ready) {
          setRecordingReady(true)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }, 15_000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnded])

  function handleClose() {
    if (isBusy) return   // não fechar durante chamada ativa
    reset()
    setAnalysisState('idle')
    setCredits(null)
    onClose()
  }

  async function handleRequestAnalysis() {
    if (!callId) return
    setAnalysisState('loading')

    const res = await fetch(`/api/calls/${callId}/request-analysis`, { method: 'POST' })
    const data: { error?: string } = await res.json().catch(() => ({}))

    if (res.ok) {
      setAnalysisState('requested')
      setCredits(prev => (prev !== null ? prev - 1 : null))
    } else if (res.status === 402) {
      setAnalysisState('no_credits')
    } else if (res.status === 422) {
      setAnalysisState('no_recording')
    } else {
      setAnalysisState('error')
    }
  }

  async function handleSaveNotes() {
    if (!callId || !notes.trim()) return
    await saveCallNotesAction(callId, notes)
    setNotesSaved(true)
  }

  function formatDuration(start: Date | null, end: Date | null): string {
    if (!start || !end) return '—'
    const s = Math.floor((end.getTime() - start.getTime()) / 1000)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return m > 0 ? `${m}min ${rem}s` : `${rem}s`
  }

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Realizar chamada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-outline bg-surface-container shadow-xl">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-outline px-5 py-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-muted" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.61a16 16 0 0 0 6.29 6.29l.91-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="text-sm font-semibold text-on-surface">{companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <CallStatusIndicator state={state} />
            {!isBusy && (
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer rounded-lg p-1 text-on-surface-muted hover:bg-surface-low hover:text-on-surface"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Corpo */}
        <div className="flex flex-col gap-5 px-5 py-5">

          {/* — Tela: idle / error — número editável e botão iniciar */}
          {canStart && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="call-phone" className="text-xs font-medium text-on-surface-muted">
                  Número
                </label>
                <input
                  id="call-phone"
                  type="tel"
                  value={editablePhone}
                  onChange={(e) => setEditablePhone(e.target.value)}
                  className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}

              <button
                type="button"
                disabled={!editablePhone.trim()}
                onClick={() => startCall(editablePhone.trim())}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.61a16 16 0 0 0 6.29 6.29l.91-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Iniciar Ligação
              </button>
            </>
          )}

          {/* — Tela: initializing / connecting / ringing — aguardando */}
          {(state === 'initializing' || state === 'connecting' || state === 'ringing') && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-blue-600" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.61a16 16 0 0 0 6.29 6.29l.91-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <p className="font-mono text-sm text-on-surface-muted">{editablePhone}</p>
            </div>
          )}

          {/* — Tela: in-progress — timer e encerrar */}
          {isActive && connectedAt && (
            <div className="flex flex-col items-center gap-5 py-2">
              <CallTimer startedAt={connectedAt} />
              <p className="text-xs text-on-surface-muted">Ligação em andamento • gravando</p>
              <button
                type="button"
                onClick={endCall}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" />
                </svg>
                Encerrar Chamada
              </button>
            </div>
          )}

          {/* — Tela: ended — resumo e notas */}
          {isEnded && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">Chamada encerrada</p>
                  <p className="text-xs text-on-surface-muted">
                    Duração: {formatDuration(connectedAt, endedAt)}
                  </p>
                </div>
              </div>

              {/* — Prompt de análise com IA — só se a chamada chegou a ser atendida */}
              {analysisState !== 'ignored' && connectedAt !== null && (
                <div className="rounded-xl border border-outline px-4 py-3">
                  {/* Processando gravação */}
                  {!recordingReady && analysisState === 'idle' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0 animate-spin text-on-surface-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <p className="text-sm font-medium text-on-surface">Processando gravação…</p>
                      </div>
                      <p className="text-xs text-on-surface-muted">
                        Isso pode levar alguns minutos. A opção de análise de IA aparecerá assim que estiver pronta.
                      </p>
                    </div>
                  )}

                  {/* Pronta para análise */}
                  {(recordingReady || analysisState === 'loading') && (analysisState === 'idle' || analysisState === 'loading') && (
                    <>
                      <p className="text-sm font-medium text-on-surface">
                        Analisar conversa com IA?
                      </p>
                      {credits !== null && (
                        <p className="mt-0.5 text-xs text-on-surface-muted">
                          {credits} crédito{credits !== 1 ? 's' : ''} disponível{credits !== 1 ? 'is' : ''}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={analysisState === 'loading' || credits === 0}
                          onClick={handleRequestAnalysis}
                          className="flex-1 cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {analysisState === 'loading' ? 'Solicitando…' : 'Analisar'}
                        </button>
                        <button
                          type="button"
                          disabled={analysisState === 'loading'}
                          onClick={() => setAnalysisState('ignored')}
                          className="flex-1 cursor-pointer rounded-lg border border-outline px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low disabled:opacity-50"
                        >
                          Ignorar
                        </button>
                      </div>
                    </>
                  )}

                  {analysisState === 'requested' && (
                    <p className="text-sm text-green-600">
                      Análise iniciada. O resultado ficará disponível no histórico desta chamada.
                    </p>
                  )}

                  {analysisState === 'no_recording' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-amber-600">
                        Gravação ainda não disponível. Se a chamada foi atendida, aguarde alguns minutos e tente novamente.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAnalysisState('idle')}
                        className="self-start text-xs text-primary underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {analysisState === 'no_credits' && (
                    <p className="text-sm text-red-500">
                      Sem créditos disponíveis para análise.
                    </p>
                  )}

                  {analysisState === 'error' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-red-500">
                        Erro ao solicitar análise. Tente novamente.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAnalysisState('idle')}
                        className="self-start text-xs text-primary underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* — Notas — */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="call-notes" className="text-xs font-medium text-on-surface-muted">
                  Notas da ligação <span className="font-normal">(opcional)</span>
                </label>
                <textarea
                  id="call-notes"
                  ref={notesRef}
                  rows={3}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
                  placeholder="Resumo, próximos passos, objeções…"
                  className="resize-none rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {notesSaved && (
                <p className="text-xs text-green-600">Notas salvas.</p>
              )}

              <div className="flex gap-2">
                {notes.trim() && !notesSaved && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="flex-1 cursor-pointer rounded-lg border border-outline px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low"
                  >
                    Salvar notas
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
