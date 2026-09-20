'use client'

import { useEffect } from 'react'
import Script from 'next/script'

// Vazio até você configurar (ver .env.example) — sem sitekey o widget some
// e o formulário segue funcionando normal, só sem CAPTCHA.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

type Props = {
  /** Muda esse valor (ex: o error state da action) pra forçar o widget a
   * gerar um token novo — o token do Turnstile é de uso único. */
  resetSignal?: unknown
}

/**
 * Widget de CAPTCHA (Cloudflare Turnstile), usado em qualquer formulário que
 * chame um endpoint de auth do Supabase. Depois que "Enable Captcha
 * protection" é ligado no painel do Supabase (Authentication → Attack
 * Protection), TODOS os endpoints de auth passam a exigir captcha_token —
 * login, signup e recover (esqueci a senha), não só o que a gente pensou
 * primeiro — senão o Supabase recusa com 400 captcha_failed. Usado em
 * LoginForm (login e cadastro) e ForgotPasswordForm.
 */
export function TurnstileWidget({ resetSignal }: Props) {
  useEffect(() => {
    if (resetSignal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).turnstile?.reset?.()
    }
  }, [resetSignal])

  if (!TURNSTILE_SITE_KEY) return null

  return (
    <>
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
      <Script id="cf-turnstile-script" src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
    </>
  )
}
