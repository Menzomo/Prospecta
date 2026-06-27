'use client'

import { useState, useRef } from 'react'

type Props = {
  callId: string
}

export function CallAudioPlayer({ callId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  async function handleLoad() {
    if (url) return
    setStatus('loading')
    const res = await fetch(`/api/calls/${callId}/recording-url`).catch(() => null)
    if (!res?.ok) { setStatus('error'); return }
    const data = await res.json().catch(() => ({}))
    if (!data.url) { setStatus('error'); return }
    setUrl(data.url)
    setStatus('ready')
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500">Erro ao carregar gravação.</span>
        <button type="button" onClick={() => { setStatus('idle'); setUrl(null) }} className="text-xs text-primary underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {status !== 'ready' && (
        <button
          type="button"
          onClick={handleLoad}
          disabled={status === 'loading'}
          className="flex items-center gap-2 self-start rounded-lg border border-outline bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
        >
          {status === 'loading' ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Carregando…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-primary">
                <path d="M8 5v14l11-7z" />
              </svg>
              Ouvir gravação
            </>
          )}
        </button>
      )}
      {url && (
        <audio
          ref={audioRef}
          controls
          src={url}
          className="w-full"
          style={{ height: '36px' }}
          autoPlay
        />
      )}
    </div>
  )
}
