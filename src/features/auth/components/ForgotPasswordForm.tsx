'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/features/auth/actions'

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null)

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-on-surface-muted">
          Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em breve. Verifique também a caixa de spam.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-on-surface">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          required
          className="rounded-lg border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Enviando...' : 'Enviar link de redefinição'}
      </button>

      <Link
        href="/login"
        className="text-center text-sm text-on-surface-muted hover:underline"
      >
        Voltar para o login
      </Link>
    </form>
  )
}
