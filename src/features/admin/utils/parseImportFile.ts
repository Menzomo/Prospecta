// Shared types used by both the client component and the API route
export type ImportRow = {
  company_name: string
  email: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
}

export type ImportSummary = {
  imported: number
  skipped_duplicate: number
  invalid: number
  email_found: number
  website_only: number
  manual_review: number
}

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

function splitCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return []

  const headers = splitCsvRow(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvRow(lines[i])
    if (values.every((v) => v.trim() === '')) continue
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? ''
    })
    rows.push(row)
  }

  return rows
}

function normalizeRaw(raw: Record<string, unknown>): ImportRow | null {
  const get = (keys: string[]): string | null => {
    for (const key of keys) {
      const v = raw[key]
      if (typeof v === 'string' && v.trim().length > 0) return v.trim()
      // Apify sometimes returns emails as an array: ["email@example.com"]
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string' && v[0].trim().length > 0) {
        return v[0].trim()
      }
    }
    return null
  }

  const company_name = get(['company_name', 'title', 'name', 'empresa', 'company'])
  if (!company_name) return null

  return {
    company_name,
    email: get(['email', 'emails', 'e-mail', 'contactEmail', 'contact_email']),
    website: get(['website', 'url', 'site', 'web', 'websiteUrl', 'website_url']),
    phone: get(['phone', 'phoneNumber', 'telefone', 'phone_number', 'tel']),
    city: get(['city', 'cidade', 'addressCity', 'address_city']),
    state: get(['state', 'estado', 'stateCode', 'state_code', 'uf', 'addressState', 'address_state']),
  }
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

export function parseImportFile(text: string, filename: string): ImportRow[] {
  const isJson = filename.toLowerCase().endsWith('.json')
  const isCsv = filename.toLowerCase().endsWith('.csv')

  let rawRows: Record<string, unknown>[] = []

  if (isJson) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    rawRows = parsed as Record<string, unknown>[]
  } else if (isCsv) {
    rawRows = parseCsvText(text) as Record<string, unknown>[]
  } else {
    return []
  }

  return rawRows
    .map((raw) => normalizeRaw(raw))
    .filter((row): row is ImportRow => row !== null)
}
