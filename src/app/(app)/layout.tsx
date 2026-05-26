import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/layout/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNav isAdmin={isAdmin} />
      {children}
    </div>
  )
}
