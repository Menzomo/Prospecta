import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'
import { checkAndSendBetaNotification } from '@/services/betaNotificationService'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    // Capture cookies set during exchangeCodeForSession so we can apply them
    // explicitly to the NextResponse.redirect — without this, cookies written
    // via cookieStore.set() do not propagate to an explicit NextResponse object,
    // leaving the browser without a session cookie after the OAuth redirect.
    const pendingCookies: { name: string; value: string; options: object }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              try { cookieStore.set(name, value, options as any) } catch {}
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const next = searchParams.get('next')
      if (next && next.startsWith('/')) {
        const response = NextResponse.redirect(new URL(next, origin))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any))
        return response
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await checkAndSendBetaNotification(user.id)

        const company = await getCompanyProfileByUserId(supabase, user.id)
        const destination = company ? '/dashboard' : '/onboarding'
        const response = NextResponse.redirect(new URL(destination, origin))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any))
        return response
      }
    }
  }

  return NextResponse.redirect(new URL('/login', origin))
}
