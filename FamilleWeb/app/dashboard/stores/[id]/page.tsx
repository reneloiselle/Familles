import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoreDetailView } from '@/components/StoreDetailView'

async function getUserFamily(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export default async function StoreDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const familyMember = await getUserFamily(supabase, user.id)
  if (!familyMember) redirect('/dashboard/family')

  return (
    <div className="max-w-4xl mx-auto">
      <StoreDetailView storeId={params.id} familyId={familyMember.family_id} />
    </div>
  )
}
