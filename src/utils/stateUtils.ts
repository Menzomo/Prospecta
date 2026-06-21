const STATE_CODES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
}

/**
 * Expands a 2-letter UF code to the full Brazilian state name.
 * If the value is already a full name (or unknown), returns it unchanged.
 * Example: 'RS' → 'Rio Grande do Sul', 'São Paulo' → 'São Paulo'
 */
export function expandStateCode(value: string): string {
  if (value.length === 2) {
    return STATE_CODES[value.toUpperCase()] ?? value
  }
  return value
}

/**
 * Collapses a full Brazilian state name to its 2-letter UF code.
 * If the value is already a code (or unknown), returns it unchanged.
 * Example: 'Rio Grande do Sul' → 'RS', 'RS' → 'RS'
 */
export function collapseStateName(value: string): string {
  if (!value) return ''
  if (value.length <= 2) return value.toUpperCase()
  const entry = Object.entries(STATE_CODES).find(([, name]) => name === value)
  return entry?.[0] ?? ''
}
