import { z } from 'zod'

const followupBaseSchema = z.object({
  title: z.string().min(2, { error: 'Título deve ter no mínimo 2 caracteres.' }).trim(),
  notes: z.string().trim().optional(),
  due_at: z.string().min(1, { error: 'Data prevista é obrigatória.' }),
})

export const createFollowupSchema = followupBaseSchema
export const updateFollowupSchema = followupBaseSchema

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>
export type UpdateFollowupInput = z.infer<typeof updateFollowupSchema>
