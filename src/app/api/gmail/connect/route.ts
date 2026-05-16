import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGoogleOAuthUrl } from '@/services/gmailService'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL))
  }

  let oauthUrl: string
  try {
    const state = crypto.randomUUID()
    oauthUrl = buildGoogleOAuthUrl(state)

    const response = NextResponse.redirect(oauthUrl)
    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('[gmail/connect] Failed to build OAuth URL:', err)
    return NextResponse.redirect('/settings/gmail?error=oauth_config')
  }
}
