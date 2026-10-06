'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLeadNoteAction } from '@/features/leads/actions'

type Props = { target: { leadId: string } | { userLeadId: string } }

export function LeadNoteCard({ target }: Props) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const result = await createLeadNoteAction(target, content)
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Erro ao salvar.')
      return
    }
    setContent('')
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
      <h2 className="mb-1 text-base font-semibold text-on-surface font-[--font-heading]">Notas</h2>
      <p className="mb-4 text-xs text-on-surface-muted">Cada nota fica salva no histórico do lead.</p>
      <div className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => { setContent(e.target.value); setSaved(false) }}
          placeholder="Escreva uma nota sobre esse lead..."
          className="resize-none rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar nota'}
          </button>
          {saved && <span className="text-xs text-green-600">Nota salva no histórico.</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}
