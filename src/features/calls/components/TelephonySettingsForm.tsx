'use client'

import { useActionState } from 'react'
import { saveTelephonySettingsAction } from '@/features/calls/actions'
import type { TelephonySettings } from '@/types/calls'

type Props = {
  initialData: TelephonySettings | null
}

export function TelephonySettingsForm({ initialData }: Props) {
  const [state, formAction, pending] = useActionState(saveTelephonySettingsAction, null)

  const isConfigured = initialData !== null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isConfigured && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Telefonia configurada. Atualize os campos abaixo para alterar as credenciais.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="account_sid" className="text-sm font-medium text-on-surface">
          Account SID <span className="text-red-500">*</span>
        </label>
        <input
          id="account_sid"
          name="account_sid"
          type="text"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={initialData?.account_sid ?? ''}
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state?.errors?.account_sid && (
          <p className="text-xs text-red-500">{state.errors.account_sid[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="auth_token" className="text-sm font-medium text-on-surface">
          Auth Token <span className="text-red-500">*</span>
        </label>
        <input
          id="auth_token"
          name="auth_token"
          type="password"
          placeholder={isConfigured ? '••••••••••••••••••••••••••••••••' : ''}
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state?.errors?.auth_token && (
          <p className="text-xs text-red-500">{state.errors.auth_token[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="api_key_sid" className="text-sm font-medium text-on-surface">
            API Key SID
          </label>
          <input
            id="api_key_sid"
            name="api_key_sid"
            type="text"
            placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            defaultValue={initialData?.api_key_sid ?? ''}
            className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state?.errors?.api_key_sid && (
            <p className="text-xs text-red-500">{state.errors.api_key_sid[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="api_key_secret" className="text-sm font-medium text-on-surface">
            API Key Secret
          </label>
          <input
            id="api_key_secret"
            name="api_key_secret"
            type="password"
            placeholder={isConfigured && initialData?.api_key_secret_encrypted ? 'Deixe em branco para manter o atual' : ''}
            className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state?.errors?.api_key_secret && (
            <p className="text-xs text-red-500">{state.errors.api_key_secret[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone_number" className="text-sm font-medium text-on-surface">
          Número Twilio <span className="text-red-500">*</span>
        </label>
        <input
          id="phone_number"
          name="phone_number"
          type="tel"
          placeholder="+5511999999999"
          defaultValue={initialData?.phone_number ?? ''}
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-on-surface-muted">Formato E.164: +5511999999999</p>
        {state?.errors?.phone_number && (
          <p className="text-xs text-red-500">{state.errors.phone_number[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="twiml_app_sid" className="text-sm font-medium text-on-surface">
          TwiML App SID
          <span className="ml-1 text-xs text-on-surface-muted">(opcional)</span>
        </label>
        <input
          id="twiml_app_sid"
          name="twiml_app_sid"
          type="text"
          placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={initialData?.twiml_app_sid ?? ''}
          className="rounded-lg border border-outline px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state?.errors?.twiml_app_sid && (
          <p className="text-xs text-red-500">{state.errors.twiml_app_sid[0]}</p>
        )}
      </div>

      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Configurações salvas com sucesso.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </form>
  )
}
