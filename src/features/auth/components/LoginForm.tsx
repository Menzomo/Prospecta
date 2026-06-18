'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { loginAction, signupAction } from '@/features/auth/actions'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, null)
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, null)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)

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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {signupState?.errors?.email && (
              <p className="text-xs text-red-500">{signupState.errors.email[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showSignupPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon open={showSignupPassword} />
              </button>
            </div>
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
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signupPending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <button
            type="button"
            onClick={() => setMode('login')}
            className="cursor-pointer font-medium text-blue-600 hover:underline"
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
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {loginState?.errors?.email && (
            <p className="text-xs text-red-500">{loginState.errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showLoginPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 [-webkit-text-fill-color:#111827] placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
              aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <EyeIcon open={showLoginPassword} />
            </button>
          </div>
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
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="cursor-pointer font-medium text-blue-600 hover:underline"
        >
          Criar conta
        </button>
      </p>
    </div>
  )
}
