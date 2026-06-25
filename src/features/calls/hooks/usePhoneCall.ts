'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Estados da chamada do ponto de vista do usuário
export type PhoneCallState =
  | 'idle'          // pronto para iniciar
  | 'initializing'  // buscando token, configurando Device
  | 'connecting'    // device.connect() chamado, aguardando Twilio
  | 'ringing'       // telefone do lead está tocando
  | 'in-progress'   // chamada ativa
  | 'ended'         // chamada encerrada normalmente
  | 'error'         // falha irrecuperável

export interface UsePhoneCallOptions {
  leadId?: string | null
  userLeadId?: string | null
}

export interface UsePhoneCallResult {
  state: PhoneCallState
  error: string | null
  callId: string | null      // UUID do nosso banco (gerado pelo browser antes do connect)
  connectedAt: Date | null
  endedAt: Date | null
  startCall: (toPhone: string) => Promise<void>
  endCall: () => void
  reset: () => void
}

export function usePhoneCall({ leadId, userLeadId }: UsePhoneCallOptions = {}): UsePhoneCallResult {
  const [state, setState]           = useState<PhoneCallState>('idle')
  const [error, setError]           = useState<string | null>(null)
  const [callId, setCallId]         = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [endedAt, setEndedAt]       = useState<Date | null>(null)

  // Refs para o Device e Call do Twilio SDK (não causam re-render)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef   = useRef<any>(null)

  const cleanup = useCallback(() => {
    callRef.current = null
    if (deviceRef.current) {
      try { deviceRef.current.destroy() } catch { /* ignore */ }
      deviceRef.current = null
    }
  }, [])

  // Limpa o Device quando o componente é desmontado
  useEffect(() => () => { cleanup() }, [cleanup])

  const startCall = useCallback(async (toPhone: string) => {
    setState('initializing')
    setError(null)
    setConnectedAt(null)
    setEndedAt(null)

    // Gera o UUID aqui para correlação imediata com o registro do banco
    const newCallId = crypto.randomUUID()
    setCallId(newCallId)

    // Busca token da nossa API (nunca diretamente do Twilio)
    let token: string
    try {
      const res = await fetch('/api/calls/token', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao obter token de telefonia.')
      }
      const data = await res.json()
      token = data.token
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Falha ao iniciar chamada.')
      return
    }

    // Importação dinâmica — SDK é browser-only
    let DeviceClass: Awaited<typeof import('@twilio/voice-sdk')>['Device']
    try {
      const sdk = await import('@twilio/voice-sdk')
      DeviceClass = sdk.Device
    } catch {
      setState('error')
      setError('Falha ao carregar módulo de telefonia.')
      return
    }

    // Inicializa o Device
    let device: InstanceType<typeof DeviceClass>
    try {
      device = new DeviceClass(token, { logLevel: 'warn' })
      deviceRef.current = device
      await device.register()
    } catch {
      setState('error')
      setError('Falha ao inicializar dispositivo de telefonia. Verifique as credenciais.')
      cleanup()
      return
    }

    setState('connecting')

    // Conecta a chamada
    let call: Awaited<ReturnType<typeof device.connect>>
    try {
      call = await device.connect({
        params: {
          To:              toPhone,
          callId:          newCallId,
          callLeadId:      leadId     ?? '',
          callUserLeadId:  userLeadId ?? '',
        },
      })
      callRef.current = call
    } catch {
      setState('error')
      setError('Falha ao conectar a chamada. Verifique o número e tente novamente.')
      cleanup()
      return
    }

    // Eventos do ciclo de vida da chamada
    call.on('ringing', () => setState('ringing'))

    call.on('accept', () => {
      setState('in-progress')
      setConnectedAt(new Date())
    })

    call.on('disconnect', () => {
      setState('ended')
      setEndedAt(new Date())
      cleanup()
    })

    call.on('cancel', () => {
      setState('ended')
      setEndedAt(new Date())
      cleanup()
    })

    call.on('reject', () => {
      setState('ended')
      setEndedAt(new Date())
      cleanup()
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.on('error', (err: any) => {
      const message = err?.message ?? 'Erro durante a chamada.'
      // Erros de microfone ou permissão negada
      if (err?.code === 31401 || message.toLowerCase().includes('microphone')) {
        setError('Permissão de microfone negada. Libere o acesso e tente novamente.')
      } else {
        setError(message)
      }
      setState('error')
      cleanup()
    })
  }, [leadId, userLeadId, cleanup])

  const endCall = useCallback(() => {
    if (callRef.current) {
      try { callRef.current.disconnect() } catch { /* ignore */ }
    }
    // O evento 'disconnect' do SDK transicionará o estado para 'ended'
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setState('idle')
    setError(null)
    setCallId(null)
    setConnectedAt(null)
    setEndedAt(null)
  }, [cleanup])

  return { state, error, callId, connectedAt, endedAt, startCall, endCall, reset }
}
