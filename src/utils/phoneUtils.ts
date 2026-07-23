// Aceita o usuário digitando só DDD + número (com ou sem formatação, ex: "(54) 99999-9999"
// ou "5499999999") e normaliza pra E.164 (+55...), que é o formato exigido pra discar via Telnyx.
export function normalizeBrazilianPhone(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`
  }

  const digits = trimmed.replace(/\D/g, '')

  // Já veio com 55 na frente, sem o "+" (12 = DDI+DDD+8, 13 = DDI+DDD+9)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`
  }

  // Só DDD + número (10 = fixo, 11 = celular)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`
  }

  // Formato não reconhecido — mantém como veio pra não inventar um número errado
  return trimmed
}
