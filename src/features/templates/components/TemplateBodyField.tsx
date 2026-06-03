'use client'

import { useState, useRef } from 'react'

const VARIABLES = [
  { label: 'Nome do lead', value: '{{lead_company_name}}', description: 'Empresa do lead' },
  { label: 'Minha empresa', value: '{{user_company_name}}', description: 'Sua empresa' },
  { label: 'Meu nome', value: '{{user_name}}', description: 'Seu nome' },
]

interface Props {
  name: string
  defaultValue?: string
  rows?: number
  error?: string
}

export function TemplateBodyField({ name, defaultValue = '', rows = 10, error }: Props) {
  const [value, setValue] = useState(defaultValue)
  const ref = useRef<HTMLTextAreaElement>(null)

  function insertVariable(variable: string) {
    const el = ref.current
    if (!el) {
      setValue((prev) => prev + variable)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + variable + value.slice(end)
    setValue(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + variable.length, start + variable.length)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-gray-500">Inserir variável no corpo</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              type="button"
              title={`${v.description}: ${v.value}`}
              onClick={() => insertVariable(v.value)}
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={ref}
        id={name}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className="resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
