'use client'

import { useActionState } from 'react'
import { closeAccountAction } from '@/features/settings/actions'

const CONFIRM_MESSAGE =
  'Tem certeza? Isso cancela sua assinatura, libera seu número de telefone e desconecta você de todos os dispositivos. Não é possível desfazer sozinho — só o suporte reativa.'

export function CloseAccountForm() {
  const [state, formAction, pending] = useActionState(closeAccountAction, null)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(CONFIRM_MESSAGE)) e.preventDefault()
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-on-surface-muted">
        Encerrar sua conta cancela a cobrança recorrente, libera seu número de telefone pra outro
        usuário e derruba o acesso em todos os dispositivos. Seus dados (leads, ligações, etc.)
        ficam guardados — só o suporte consegue reativar depois.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="close-account-password" className="text-sm font-medium text-gray-700">
          Confirme sua senha
        </label>
        <input
          id="close-account-password"
          name="password"
          type="password"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Encerrando...' : 'Encerrar conta'}
      </button>
    </form>
  )
}
