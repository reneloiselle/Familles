import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TaskManagement } from '@/components/TaskManagement'

async function getUserFamily(supabase: any, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('id, family_id, role, families(id, name)')
    .eq('user_id', userId)
    .single()

  return data
}

async function getFamilyMembers(supabase: any, familyId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('id, user_id, role, avatar_url, name, email')
    .eq('family_id', familyId)

  return data || []
}

async function getTasks(supabase: any, familyId: string, familyMemberId: string, userId: string, status?: string) {
  let query = supabase
    .from('tasks')
    .select('*, family_members(id, user_id, role, avatar_url)')
    .eq('family_id', familyId)
    // Filtrer pour ne montrer que les tâches créées par l'utilisateur ou assignées à l'utilisateur
    .or(`created_by.eq.${userId},assigned_to.eq.${familyMemberId}`)
    // Trier par priorité (high, medium, low) puis par due_date
    .order('priority', { ascending: false, nullsFirst: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // Trier par priorité (high, medium, low) puis par due_date puis par created_at
  const { data } = await query
    .order('priority', { ascending: false, nullsFirst: false })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  // Double vérification côté client pour s'assurer du filtrage
  const filteredData = (data || []).filter((task: any) => 
    task.created_by === userId || task.assigned_to === familyMemberId
  )

  return filteredData
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const familyMember = await getUserFamily(supabase, user.id)

  if (!familyMember) {
    redirect('/dashboard/family')
  }

  const familyMembers = await getFamilyMembers(supabase, familyMember.family_id)
  const status = searchParams.status || 'all'
  const tasks = await getTasks(supabase, familyMember.family_id, familyMember.id, user.id, status)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des tâches</h1>
        <p className="text-gray-600">
          Créez et assignez des tâches aux membres de votre famille
        </p>
      </div>

      <TaskManagement
        user={user}
        familyMember={familyMember}
        familyMembers={familyMembers}
        tasks={tasks}
        initialStatus={status}
      />
    </div>
  )
}

