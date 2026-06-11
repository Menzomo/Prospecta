'use client'

import { useRef, useState } from 'react'
import type { TemplateAttachment } from '@/repositories/templateAttachmentRepository'

const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

const MAX_SIZE = 10 * 1024 * 1024
const MAX_COUNT = 5

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  templateId: string
  initialAttachments: TemplateAttachment[]
}

export function TemplateAttachments({ templateId, initialAttachments }: Props) {
  const [attachments, setAttachments] = useState<TemplateAttachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setError(null)

    if (attachments.length >= MAX_COUNT) {
      setError(`Máximo de ${MAX_COUNT} anexos por template.`)
      return
    }

    if (file.size > MAX_SIZE) {
      setError('Arquivo excede 10 MB.')
      return
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      setError('Tipo não permitido. Use PDF, PNG, JPG, DOC, DOCX, XLS, XLSX ou TXT.')
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/templates/${templateId}/attachments`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json() as { attachment?: TemplateAttachment; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar arquivo.')
        return
      }
      if (data.attachment) {
        setAttachments((prev) => [...prev, data.attachment!])
      }
    } catch {
      setError('Falha na requisição.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id)
    setError(null)
    try {
      const res = await fetch(`/api/templates/${templateId}/attachments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id))
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erro ao remover anexo.')
      }
    } catch {
      setError('Falha na requisição.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Anexos <span className="text-gray-400">({attachments.length}/{MAX_COUNT})</span>
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || attachments.length >= MAX_COUNT}
          className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : '+ Adicionar arquivo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {attachments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-gray-800">{att.file_name}</span>
                <span className="text-xs text-gray-400 uppercase">{att.file_type} · {formatBytes(att.file_size)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(att.id)}
                disabled={removing === att.id}
                className="ml-4 cursor-pointer shrink-0 text-xs text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removing === att.id ? 'Removendo...' : 'Remover'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">Nenhum anexo. Templates sem anexo funcionam normalmente.</p>
      )}

      <p className="text-xs text-gray-400">
        Permitido: PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, TXT · Máx. 10 MB por arquivo
      </p>
    </div>
  )
}
