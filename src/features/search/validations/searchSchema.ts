import { z } from 'zod'

export const SEARCH_CATEGORIES = [
  'Restaurantes',
  'Dentistas',
  'Academias',
  'Mercados',
  'Advogados',
  'Auto Peças',
  'Barbearias',
  'Salões de Beleza',
  'Clínicas',
  'Pet Shops',
  'Contabilidade',
  'Imobiliárias',
  'Mecânicas',
  'Papelarias',
  'Farmácias',
  'Padarias',
  'Materiais Construção',
  'Lojas Roupa',
  'Decoração Infantil',
  'Móveis Planejados',
  'Metalúrgica',
] as const

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]

export const searchSchema = z.object({
  category: z.enum(SEARCH_CATEGORIES, { message: 'Categoria inválida' }),
  city: z.string().min(2, 'Cidade deve ter ao menos 2 caracteres').max(100),
})

export type SearchFormData = z.infer<typeof searchSchema>
