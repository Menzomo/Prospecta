import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-on-surface font-[--font-heading]">Nova senha</h1>
          <p className="mt-1 text-sm text-on-surface-muted">Escolha uma nova senha para sua conta.</p>
        </div>

        <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
