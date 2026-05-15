import { LoginForm } from '@/features/auth/components/LoginForm'
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Prospecta</h1>
          <p className="mt-1 text-sm text-gray-500">Prospecção comercial organizada</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <GoogleAuthButton />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
