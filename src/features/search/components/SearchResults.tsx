'use client'

import type { LeadPreviewItem } from '../types'

type Props = {
  leads: LeadPreviewItem[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  disabled?: boolean
}

export function SearchResults({ leads, selectedIds, onToggle, disabled = false }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {leads.length} {leads.length === 1 ? 'lead encontrado' : 'leads encontrados'}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Selecione os que deseja adicionar em Meus Leads
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {leads.map((lead) => {
          const isSelected = selectedIds.has(lead.id)
          return (
            <div
              key={lead.id}
              onClick={() => !disabled && onToggle(lead.id)}
              className={`cursor-pointer px-5 py-4 transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => !disabled && onToggle(lead.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={disabled}
                  readOnly
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{lead.company_name}</p>
                  <p className="mt-0.5 text-xs font-medium text-blue-600">{lead.email}</p>
                  {lead.website && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">{lead.website}</p>
                  )}
                  {lead.phone && (
                    <p className="mt-0.5 text-xs text-gray-400">{lead.phone}</p>
                  )}
                </div>
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Selecionado
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
