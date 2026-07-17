import { z } from 'zod'
import { isValidCpfCnpj } from '@/lib/validation/cpfCnpj'

const e164 = /^\+[1-9]\d{7,14}$/

export const claimTelnyxNumberSchema = z.object({
  number_id: z.string().min(1, 'Selecione um número'),
  cpf_cnpj: z
    .string()
    .min(1, 'CPF ou CNPJ é obrigatório')
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => isValidCpfCnpj(v), { message: 'CPF ou CNPJ inválido' }),
  forwarding_cell_phone: z
    .string()
    .min(1, 'Celular para encaminhamento é obrigatório')
    .refine((v) => e164.test(v.replace(/[\s\-\(\)]/g, '')), {
      message: 'Número inválido. Use formato E.164: +5511999999999',
    })
    .transform((v) => v.replace(/[\s\-\(\)]/g, '')),
})

export type ClaimTelnyxNumberFormValues = z.input<typeof claimTelnyxNumberSchema>
