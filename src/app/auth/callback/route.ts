import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyProfileByUserId } from '@/repositories/companyProfileRepository'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const company = await getCompanyProfileByUserId(supabase, user.id)
        const destination = company ? '/dashboard' : '/onboarding'
        return NextResponse.redirect(new URL(destination, origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/login', origin))
}
