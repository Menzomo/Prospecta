import { z } from 'zod'

export const searchSchema = z.object({
  category: z.string().min(1, 'Selecione uma categoria').max(100),
  city: z.string().min(2, 'Cidade deve ter ao menos 2 caracteres').max(100),
  state: z.string().length(2).optional(),
})

export type SearchFormData = z.infer<typeof searchSchema>
