'use client'

import { useState, useEffect } from 'react'

type Props = {
  startedAt: Date
}

export function CallTimer({ startedAt }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const update = () => setSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const parts = [
    h > 0 ? String(h).padStart(2, '0') : null,
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].filter(Boolean)

  return (
    <span className="font-mono text-2xl font-semibold tabular-nums text-on-surface">
      {parts.join(':')}
    </span>
  )
}
