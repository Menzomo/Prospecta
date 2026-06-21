import { LoginForm } from '@/features/auth/components/LoginForm'
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-on-surface font-[--font-heading]">Prospecta</h1>
          <p className="mt-1 text-sm text-on-surface-muted">Prospecção comercial organizada</p>
        </div>

        <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-card">
          <GoogleAuthButton />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-outline" />
            <span className="text-xs text-on-surface-muted">ou</span>
            <div className="h-px flex-1 bg-outline" />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
