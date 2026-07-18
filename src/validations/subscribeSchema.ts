import { z } from 'zod'
import { isValidCpfCnpj } from '@/lib/validation/cpfCnpj'

export const subscribeSchema = z.object({
  cpf_cnpj: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, '') : undefined))
    .refine((v) => !v || isValidCpfCnpj(v), { message: 'CPF ou CNPJ inválido' }),
})

export type SubscribeFormValues = z.input<typeof subscribeSchema>
