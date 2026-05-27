import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoresManagement } from '@/components/StoresManagement'

async function getUserFamily(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export default async function StoresPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const familyMember = await getUserFamily(supabase, user.id)
  if (!familyMember) redirect('/dashboard/family')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Magasins</h1>
        <p className="text-gray-600">
          Où faire vos courses et où trouver chaque produit (rangée, commentaire).
        </p>
      </div>
      <StoresManagement user={user} familyId={familyMember.family_id} />
    </div>
  )
}
