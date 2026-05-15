'use client'

import { useActionState } from 'react'
import { onboardingAction } from '@/app/onboarding/actions'

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(onboardingAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="company_name" className="text-sm font-medium text-gray-700">
          Nome da empresa <span className="text-red-500">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          placeholder="Ex: Minha Empresa Ltda"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.company_name && (
          <p className="text-xs text-red-500">{state.errors.company_name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="O que sua empresa faz?"
          rows={3}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium text-gray-700">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Ex: São Paulo"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(11) 99999-9999"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="commercial_email" className="text-sm font-medium text-gray-700">
          Email comercial
        </label>
        <input
          id="commercial_email"
          name="commercial_email"
          type="email"
          placeholder="contato@empresa.com"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {state?.errors?.commercial_email && (
          <p className="text-xs text-red-500">{state.errors.commercial_email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="website" className="text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          id="website"
          name="website"
          type="text"
          placeholder="https://empresa.com"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Continuar'}
      </button>
    </form>
  )
}
