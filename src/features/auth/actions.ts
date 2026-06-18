'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/validations/authSchema'
import { checkAndSendBetaNotification } from '@/services/betaNotificationService'

async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export type AuthActionState = {
  errors?: {
    email?: string[]
    password?: string[]
    full_name?: string[]
  }
  error?: string
} | null

export async function loginAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validation = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(validation.data)

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: 'Email não confirmado. Verifique sua caixa de entrada.' }
    }
    return { error: 'Email ou senha inválidos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) await checkAndSendBetaNotification(user.id)

  redirect('/dashboard')
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validation = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
  })

  if (!validation.success) {
    return { errors: validation.error.flatten().fieldErrors }
  }

  const origin = await getRequestOrigin()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      data: { full_name: validation.data.full_name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    await checkAndSendBetaNotification(data.user.id)
  }

  redirect('/onboarding')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export type ForgotPasswordActionState = { success?: boolean; error?: string } | null

export async function forgotPasswordAction(
  _state: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  if (!email) return { error: 'Informe o email.' }

  const origin = await getRequestOrigin()
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  return { success: true }
}

export type ResetPasswordActionState = { error?: string } | null

export async function resetPasswordAction(
  _state: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const password = (formData.get('password') as string | null) ?? ''
  const confirm = (formData.get('confirm') as string | null) ?? ''

  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  if (password !== confirm) return { error: 'As senhas não coincidem.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: 'Não foi possível redefinir a senha. Tente novamente.' }

  redirect('/login')
}
