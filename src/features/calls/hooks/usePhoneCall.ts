'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type PhoneCallState =
  | 'idle'          // pronto para iniciar
  | 'initializing'  // buscando token, configurando Device
  | 'connecting'    // connect() chamado, aguardando provedor
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
  callId: string | null
  connectedAt: Date | null
  endedAt: Date | null
  startCall: (toPhone: string) => Promise<void>
  endCall: () => void
  reset: () => void
}

export function usePhoneCall({ leadId, userLeadId }: UsePhoneCallOptions = {}): UsePhoneCallResult {
  const [state, setState]             = useState<PhoneCallState>('idle')
  const [error, setError]             = useState<string | null>(null)
  const [callId, setCallId]           = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [endedAt, setEndedAt]         = useState<Date | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef   = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef     = useRef<any>(null)
  const providerRef = useRef<'twilio' | 'telnyx' | null>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)

  const cleanup = useCallback(() => {
    callRef.current = null
    if (audioRef.current) {
      audioRef.current.srcObject = null
      audioRef.current = null
    }
    if (deviceRef.current) {
      try {
        if (providerRef.current === 'telnyx') {
          deviceRef.current.disconnect()
        } else {
          deviceRef.current.destroy()
        }
      } catch { /* ignore */ }
      deviceRef.current = null
    }
    providerRef.current = null
  }, [])

  useEffect(() => () => { cleanup() }, [cleanup])

  // ── Twilio ────────────────────────────────────────────────────────────────

  const startCallTwilio = useCallback(async (
    toPhone: string,
    token: string,
    newCallId: string
  ) => {
    let DeviceClass: Awaited<typeof import('@twilio/voice-sdk')>['Device']
    try {
      const sdk = await import('@twilio/voice-sdk')
      DeviceClass = sdk.Device
    } catch {
      setState('error')
      setError('Falha ao carregar módulo de telefonia.')
      return
    }

    let device: InstanceType<typeof DeviceClass>
    try {
      device = new DeviceClass(token, { logLevel: 'warn' })
      deviceRef.current  = device
      providerRef.current = 'twilio'
      await device.register()
    } catch {
      setState('error')
      setError('Falha ao inicializar dispositivo de telefonia. Verifique as credenciais.')
      cleanup()
      return
    }

    setState('connecting')

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

    call.on('ringing',    () => setState('ringing'))
    call.on('accept',     () => { setState('in-progress'); setConnectedAt(new Date()) })
    call.on('disconnect', () => { setState('ended'); setEndedAt(new Date()); cleanup() })
    call.on('cancel',     () => { setState('ended'); setEndedAt(new Date()); cleanup() })
    call.on('reject',     () => { setState('ended'); setEndedAt(new Date()); cleanup() })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.on('error', (err: any) => {
      const message = err?.message ?? 'Erro durante a chamada.'
      if (err?.code === 31401 || message.toLowerCase().includes('microphone')) {
        setError('Permissão de microfone negada. Libere o acesso e tente novamente.')
      } else {
        setError(message)
      }
      setState('error')
      cleanup()
    })
  }, [leadId, userLeadId, cleanup])

  // ── Telnyx ────────────────────────────────────────────────────────────────

  const startCallTelnyx = useCallback(async (
    toPhone: string,
    token: string,
    newCallId: string,
    identity: string,
    phoneNumber: string
  ) => {
    let TelnyxRTC: Awaited<typeof import('@telnyx/webrtc')>['TelnyxRTC']
    let NOTIFICATION_TYPE: Awaited<typeof import('@telnyx/webrtc')>['NOTIFICATION_TYPE']
    try {
      const sdk = await import('@telnyx/webrtc')
      TelnyxRTC = sdk.TelnyxRTC
      NOTIFICATION_TYPE = sdk.NOTIFICATION_TYPE
    } catch {
      setState('error')
      setError('Falha ao carregar módulo de telefonia Telnyx.')
      return
    }

    const rtcClient = new TelnyxRTC({ login_token: token })
    deviceRef.current   = rtcClient
    providerRef.current = 'telnyx'

    // Captura microfone explicitamente — stream passado direto ao SDK via localStream
    let localStream: MediaStream
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setState('error')
      setError('Permissão de microfone negada. Libere o acesso ao microfone e tente novamente.')
      cleanup()
      return
    }

    // Aguarda o cliente estar pronto (autenticado no servidor Telnyx)
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Tempo limite ao conectar com Telnyx')),
          15_000
        )

        rtcClient.on('telnyx.ready', () => { clearTimeout(timeout); resolve() })
        rtcClient.on('telnyx.error', (err: unknown) => {
          clearTimeout(timeout)
          reject(new Error((err as { message?: string })?.message ?? 'Erro ao conectar com Telnyx'))
        })

        rtcClient.connect().catch(reject)
      })
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Falha ao conectar com Telnyx.')
      cleanup()
      return
    }

    setState('connecting')

    // SIP custom headers — aparecem no webhook TeXML como SipHeader_X-Prospecta*
    // Com "Park all outbound calls" ativo na SIP Connection, o Telnyx parca a chamada,
    // chama o webhook TeXML com params['To']=toPhone e executa o <Dial> retornado.
    const call = rtcClient.newCall({
      destinationNumber: toPhone,
      callerNumber: phoneNumber,
      id: newCallId,
      localStream,
      audio: true,
      video: false,
      customHeaders: [
        { name: 'X-ProspectaCallId',     value: newCallId },
        { name: 'X-ProspectaUserId',     value: identity },
        { name: 'X-ProspectaLeadId',     value: leadId     ?? '' },
        { name: 'X-ProspectaUserLeadId', value: userLeadId ?? '' },
      ],
    })
    callRef.current = call

    // Estado de chamada via telnyx.notification (callUpdate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rtcClient.on('telnyx.notification', (notification: { type: string; call?: any }) => {
      if (notification.type !== NOTIFICATION_TYPE.callUpdate) return
      const callState = notification.call?.state

      if (callState === 'ringing') {
        setState('ringing')
      } else if (callState === 'active') {
        setState('in-progress')
        setConnectedAt(new Date())
        // Anexa o stream remoto a um elemento <audio> para o usuário ouvir o lead
        try {
          const remoteStream: MediaStream | undefined =
            notification.call?.remoteStream ?? callRef.current?.remoteStream
          if (remoteStream) {
            if (audioRef.current) audioRef.current.srcObject = null
            const audio = new Audio()
            audio.srcObject = remoteStream
            audio.autoplay = true
            audioRef.current = audio
            audio.play().catch(() => { /* política de autoplay — usuário já interagiu */ })
          }
        } catch { /* ignore */ }
      } else if (callState === 'hangup' || callState === 'destroy') {
        setState('ended')
        setEndedAt(new Date())
        cleanup()
      }
    })
  }, [leadId, userLeadId, cleanup])

  // ── startCall (ponto de entrada público) ──────────────────────────────────

  const startCall = useCallback(async (toPhone: string) => {
    setState('initializing')
    setError(null)
    setConnectedAt(null)
    setEndedAt(null)

    const newCallId = crypto.randomUUID()
    callIdRef.current = newCallId
    setCallId(newCallId)

    let tokenData: { token: string; identity: string; phoneNumber: string; provider: 'twilio' | 'telnyx' }
    try {
      const res = await fetch('/api/calls/token', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao obter token de telefonia.')
      }
      tokenData = await res.json()
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Falha ao iniciar chamada.')
      return
    }

    if (tokenData.provider === 'telnyx') {
      await startCallTelnyx(toPhone, tokenData.token, newCallId, tokenData.identity, tokenData.phoneNumber)
    } else {
      await startCallTwilio(toPhone, tokenData.token, newCallId)
    }
  }, [startCallTwilio, startCallTelnyx])

  const callIdRef = useRef<string | null>(null)

  const endCall = useCallback(() => {
    const currentCall     = callRef.current
    const currentProvider = providerRef.current
    const currentCallId   = callIdRef.current

    setState('ended')
    setEndedAt(new Date())

    setTimeout(() => {
      // Encerramento server-side via Telnyx Call Control API (caminho confiável)
      if (currentCallId) {
        fetch('/api/calls/hangup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: currentCallId }),
        }).catch(() => {})
      }

      // BYE WebRTC — fire-and-forget (não await para não travar a thread)
      if (currentCall) {
        try {
          if (currentProvider === 'telnyx') {
            currentCall.hangup().catch?.(() => {})
          } else {
            currentCall.disconnect()
          }
        } catch { /* ignore */ }
      }
      cleanup()
    }, 0)
  }, [cleanup])

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
