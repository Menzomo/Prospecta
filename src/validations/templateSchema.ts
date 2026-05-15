import { z } from 'zod'

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Nome deve ter no mínimo 2 caracteres.' })
    .max(100, { error: 'Nome deve ter no máximo 100 caracteres.' })
    .trim(),
  subject: z
    .string()
    .min(2, { error: 'Assunto deve ter no mínimo 2 caracteres.' })
    .max(200, { error: 'Assunto deve ter no máximo 200 caracteres.' })
    .trim(),
  body: z
    .string()
    .min(10, { error: 'Corpo deve ter no mínimo 10 caracteres.' })
    .trim(),
})

export const updateTemplateSchema = createTemplateSchema

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
