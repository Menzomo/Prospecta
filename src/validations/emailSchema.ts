import { z } from 'zod'

export const sendEmailSchema = z.object({
  template_id: z.string().min(1, { error: 'Selecione um template.' }),
  subject: z.string().min(1, { error: 'Assunto é obrigatório.' }).trim(),
  body: z.string().min(1, { error: 'Corpo do email é obrigatório.' }).trim(),
})
