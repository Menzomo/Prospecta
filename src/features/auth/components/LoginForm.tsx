'use client'

import { useActionState, useState } from 'react'
import { loginAction, signupAction } from '@/features/auth/actions'

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, null)
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, null)

  if (mode === 'signup') {
    return (
      <div className="flex flex-col gap-4">
        <form action={signupFormAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
              Nome completo
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {signupState?.errors?.full_name && (
              <p className="text-xs text-red-500">{signupState.errors.full_name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {signupState?.errors?.email && (
              <p className="text-xs text-red-500">{signupState.errors.email[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {signupState?.errors?.password && (
              <p className="text-xs text-red-500">{signupState.errors.password[0]}</p>
            )}
          </div>

          {signupState?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {signupState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={signupPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {signupPending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <button
            type="button"
            onClick={() => setMode('login')}
            className="font-medium text-blue-600 hover:underline"
          >
            Entrar
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={loginFormAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {loginState?.errors?.email && (
            <p className="text-xs text-red-500">{loginState.errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Sua senha"
            autoComplete="current-password"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {loginState?.errors?.password && (
            <p className="text-xs text-red-500">{loginState.errors.password[0]}</p>
          )}
        </div>

        {loginState?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {loginState.error}
          </p>
        )}

        <button
          type="submit"
          disabled={loginPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loginPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="font-medium text-blue-600 hover:underline"
        >
          Criar conta
        </button>
      </p>
    </div>
  )
}
