import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-on-surface font-[--font-heading]">Redefinir senha</h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            Informe seu email para receber o link de redefinição.
          </p>
        </div>

        <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
