import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SharedListsManagement } from '@/components/SharedListsManagement'

async function getUserFamily(supabase: any, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('id, family_id, role, families(id, name)')
    .eq('user_id', userId)
    .single()
  
  return data
}

export default async function ListsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const familyMember = await getUserFamily(supabase, user.id)
  
  if (!familyMember) {
    redirect('/dashboard/family')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Listes partagées</h1>
        <p className="text-gray-600">
          Créez et partagez des listes avec votre famille (liste de courses, tâches, etc.)
        </p>
      </div>

      <SharedListsManagement
        user={user}
        familyId={familyMember.family_id}
      />
    </div>
  )
}

