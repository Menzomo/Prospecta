// Validação de dígito verificador — não só formato. Recebe string já sem máscara (só dígitos).

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(digits[i], 10) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calc(9) === parseInt(digits[9], 10) && calc(10) === parseInt(digits[10], 10)
}

export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits)) return false
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(digits[i], 10) * weights[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return calc(12) === parseInt(digits[12], 10) && calc(13) === parseInt(digits[13], 10)
}

export function isValidCpfCnpj(digits: string): boolean {
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}
