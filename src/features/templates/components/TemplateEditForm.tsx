'use client'

import { useActionState } from 'react'
import { updateTemplateAction } from '@/features/templates/actions'
import type { Template } from '@/types/templates'

type Props = {
  template: Template
}

export function TemplateEditForm({ template }: Props) {
  const boundAction = updateTemplateAction.bind(null, template.id)
  const [state, formAction, pending] = useActionState(boundAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Nome do template <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={template.name}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.name && (
          <p className="text-xs text-red-500">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="subject" className="text-sm font-medium text-gray-700">
          Assunto do email <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          defaultValue={template.subject}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.subject && (
          <p className="text-xs text-red-500">{state.errors.subject[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="body" className="text-sm font-medium text-gray-700">
          Corpo do email <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          defaultValue={template.body}
          className="resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.body && (
          <p className="text-xs text-red-500">{state.errors.body[0]}</p>
        )}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <p className="mb-1 font-medium">Variáveis disponíveis</p>
        <ul className="space-y-0.5 text-xs">
          <li>
            <code className="font-mono">{'{{lead_company_name}}'}</code> — nome da empresa do lead
          </li>
          <li>
            <code className="font-mono">{'{{user_company_name}}'}</code> — nome da sua empresa
          </li>
          <li>
            <code className="font-mono">{'{{user_name}}'}</code> — seu nome
          </li>
        </ul>
      </div>

      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Template atualizado com sucesso.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
