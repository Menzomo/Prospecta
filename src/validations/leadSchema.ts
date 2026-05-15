import { z } from 'zod'
import { LEAD_STATUSES } from '@/types/leads'

export const createLeadSchema = z.object({
  company_name: z.string().min(2, { error: 'Nome da empresa deve ter no mínimo 2 caracteres.' }).trim(),
  contact_name: z.string().trim().optional(),
  email: z.union([z.email({ error: 'Email inválido.' }), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  city: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const updateLeadSchema = z.object({
  company_name: z.string().min(2, { error: 'Nome da empresa deve ter no mínimo 2 caracteres.' }).trim(),
  contact_name: z.string().trim().optional(),
  email: z.union([z.email({ error: 'Email inválido.' }), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES, { error: 'Status inválido.' }),
  notes: z.string().trim().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
