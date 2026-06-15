'use client'

import { useActionState } from 'react'
import { createTemplateAction } from '@/features/templates/actions'
import { TemplateBodyField } from './TemplateBodyField'

export function TemplateCreateForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction, pending] = useActionState(createTemplateAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Nome do template <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Ex: Apresentação inicial"
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
          placeholder="Ex: Apresentação da {{user_company_name}}"
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
        <TemplateBodyField
          name="body"
          defaultValue="Olá, meu nome é {{user_name}} da {{user_company_name}}..."
          error={state?.errors?.body?.[0]}
        />
      </div>

      <p className="text-xs text-gray-400">
        Você poderá adicionar anexos (PDF, imagens, documentos) após criar o template.
      </p>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Criar template'}
      </button>
    </form>
  )
}
