import type { Database } from '@/lib/supabase/types'

export type Template = Database['public']['Tables']['templates']['Row']

export type CreateTemplateDto = {
  name: string
  subject: string
  body: string
}

export type UpdateTemplateDto = {
  name: string
  subject: string
  body: string
}
