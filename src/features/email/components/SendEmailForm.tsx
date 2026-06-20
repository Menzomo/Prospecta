'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { PostSendFollowupPrompt } from '@/features/email/components/PostSendFollowupPrompt'
import { renderTemplate } from '@/utils/renderTemplate'
import type { SendEmailActionState } from '@/features/email/actions'
import type { Template } from '@/types/templates'
import type { TemplateAttachment } from '@/repositories/templateAttachmentRepository'
import type { TemplateVariables } from '@/utils/renderTemplate'

type Props = {
  boundAction: (state: SendEmailActionState, formData: FormData) => Promise<SendEmailActionState>
  templates: Template[]
  variables: TemplateVariables
  attachmentsByTemplate?: Record<string, TemplateAttachment[]>
  // Show the followup prompt after send — pass leadId for legacy leads, userLeadId for global leads
  followup?: { leadId: string } | { userLeadId: string }
  // For global leads without followup prompt: redirect straight to this path after send
  returnPath?: string
}

export function SendEmailForm({
  boundAction,
  templates,
  variables,
  attachmentsByTemplate = {},
  followup,
  returnPath,
}: Props) {
  const [state, formAction, pending] = useActionState(boundAction, null)
  const router = useRouter()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [body, setBody] = useState<string>('')

  const selectedAttachments = selectedTemplateId ? (attachmentsByTemplate[selectedTemplateId] ?? []) : []

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setSelectedTemplateId(id)
    const tmpl = templates.find((t) => t.id === id)
    if (tmpl) {
      setSubject(renderTemplate(tmpl.subject, variables))
      setBody(renderTemplate(tmpl.body, variables))
    } else {
      setSubject('')
      setBody('')
    }
  }

  if (state?.success && state.emailMessageId) {
    if (followup) {
      const leadId = 'leadId' in followup ? followup.leadId : null
      const userLeadId = 'userLeadId' in followup ? followup.userLeadId : null
      return (
        <PostSendFollowupPrompt
          leadId={leadId}
          userLeadId={userLeadId}
          emailMessageId={state.emailMessageId}
        />
      )
    }

    if (returnPath) {
      router.push(returnPath)
      return (
        <p className="text-sm text-green-700 font-medium">Email enviado com sucesso!</p>
      )
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="template_id" className="text-sm font-medium text-gray-700">
          Template <span className="text-red-500">*</span>
        </label>
        <select
          id="template_id"
          name="template_id"
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecione um template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {state?.errors?.template_id && (
          <p className="text-xs text-red-500">{state.errors.template_id[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="subject" className="text-sm font-medium text-gray-700">
          Assunto <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Selecione um template para preencher"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.subject && (
          <p className="text-xs text-red-500">{state.errors.subject[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="body" className="text-sm font-medium text-gray-700">
          Mensagem <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Selecione um template para preencher"
          className="resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.body && (
          <p className="text-xs text-red-500">{state.errors.body[0]}</p>
        )}
      </div>

      {selectedAttachments.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-700">Anexos do template</p>
          <ul className="flex flex-col gap-1">
            {selectedAttachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                <span className="uppercase font-medium text-gray-400">{att.file_type}</span>
                <span className="truncate">{att.file_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !selectedTemplateId}
        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Enviando...' : 'Enviar email'}
      </button>
    </form>
  )
}
