import { z } from 'zod'

export const companyProfileSchema = z.object({
  company_name: z.string().min(2, { error: 'Nome da empresa deve ter no mínimo 2 caracteres.' }).trim(),
  description: z.string().trim().optional(),
  city: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  commercial_email: z.union([z.email({ error: 'Email comercial inválido.' }), z.literal('')]).optional(),
  website: z.string().trim().optional(),
})

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>
