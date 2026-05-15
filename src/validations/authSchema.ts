import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email({ error: 'Email inválido.' }),
  password: z.string().min(6, { error: 'Senha deve ter no mínimo 6 caracteres.' }),
})

export const signupSchema = z.object({
  email: z.email({ error: 'Email inválido.' }),
  password: z.string().min(6, { error: 'Senha deve ter no mínimo 6 caracteres.' }),
  full_name: z.string().min(2, { error: 'Nome deve ter no mínimo 2 caracteres.' }).trim(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
