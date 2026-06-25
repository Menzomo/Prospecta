import { z } from 'zod'

// E.164 regex: + followed by 8–15 digits
const e164 = /^\+[1-9]\d{7,14}$/

export const telephonySettingsSchema = z.object({
  account_sid: z
    .string()
    .min(1, 'Account SID é obrigatório')
    .startsWith('AC', 'Account SID deve começar com AC'),
  auth_token: z
    .string()
    .min(1, 'Auth Token é obrigatório'),
  api_key_sid: z
    .string()
    .optional()
    .transform((v) => v || null),
  api_key_secret: z
    .string()
    .optional()
    .transform((v) => v || null),
  phone_number: z
    .string()
    .min(1, 'Número Twilio é obrigatório')
    .refine((v) => e164.test(v.replace(/[\s\-\(\)]/g, '')), {
      message: 'Número inválido. Use formato E.164: +5511999999999',
    })
    .transform((v) => v.replace(/[\s\-\(\)]/g, '')),
  twiml_app_sid: z
    .string()
    .optional()
    .transform((v) => v || null),
})

export type TelephonySettingsFormValues = z.input<typeof telephonySettingsSchema>
