// Tipos de eventos do pipeline de chamadas.
// Cada etapa do fluxo (chamada → gravação → transcrição → análise)
// gera um evento tipado. O callService é responsável por disparar esses eventos.
// No futuro: substituir o dispatcher por uma fila real (Inngest, BullMQ, etc.).

export const CALL_EVENT = {
  CALL_STARTED:             'call.started',
  CALL_CONNECTED:           'call.connected',
  CALL_ENDED:               'call.ended',
  RECORDING_AVAILABLE:      'call.recording_available',
  TRANSCRIPTION_STARTED:    'call.transcription_started',
  TRANSCRIPTION_COMPLETED:  'call.transcription_completed',
  ANALYSIS_STARTED:         'call.analysis_started',
  ANALYSIS_COMPLETED:       'call.analysis_completed',
} as const

export type CallEventType = (typeof CALL_EVENT)[keyof typeof CALL_EVENT]

export interface CallEvent<TPayload = Record<string, unknown>> {
  type: CallEventType
  callId: string
  userId: string
  occurredAt: string   // ISO 8601
  payload?: TPayload
}

// Payloads por tipo de evento
export interface CallEndedPayload {
  status: string
  durationSeconds: number | null
}

export interface RecordingAvailablePayload {
  recordingSid: string
  recordingUrl: string
}

export interface AnalysisCompletedPayload {
  analysisId: string
  summary: string | null
}

// Dispatcher simples — logs por enquanto, fila real na Fase 6+
export async function dispatchCallEvent(event: CallEvent): Promise<void> {
  console.log(`[call-event] ${event.type}`, { callId: event.callId, userId: event.userId, payload: event.payload })
  // TODO(fase-6): publicar em fila para processamento assíncrono
}
