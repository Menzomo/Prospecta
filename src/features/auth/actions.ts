'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/validations/authSchema'

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
    return { error: 'Email ou senha inválidos.' }
  }

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

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      data: { full_name: validation.data.full_name },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/onboarding')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
