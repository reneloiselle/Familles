import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Users, CheckSquare, Plus, List } from 'lucide-react'

async function getUserFamily(supabase: any, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('family_id, families(name)')
    .eq('user_id', userId)
    .single()
  
  return data
}

async function getUpcomingSchedules(supabase: any, familyMemberId: string) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('schedules')
    .select('*, family_members(user_id, families(name))')
    .eq('family_member_id', familyMemberId)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(5)
  
  return data || []
}

async function getPendingTasks(supabase: any, familyId: string) {
  const { data } = await supabase
    .from('tasks')
    .select('*, family_members(id, user_id)')
    .eq('family_id', familyId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(5)
  
  return data || []
}

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const familyMember = await supabase
    .from('family_members')
    .select('id, family_id, role, families(name)')
    .eq('user_id', user.id)
    .single()

  if (!familyMember.data) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Bienvenue sur FamilleWeb !</h2>
          <p className="text-gray-600 mb-6">
            Vous n'êtes membre d'aucune famille pour le moment.
          </p>
          <Link href="/dashboard/family" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Créer ou rejoindre une famille
          </Link>
        </div>
      </div>
    )
  }

  const familyMemberId = familyMember.data.id
  const familyId = familyMember.data.family_id
  const isParent = familyMember.data.role === 'parent'

  const [upcomingSchedules, pendingTasks] = await Promise.all([
    getUpcomingSchedules(supabase, familyMemberId),
    getPendingTasks(supabase, familyId),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue dans la famille {familyMember.data.families?.name} !
        </h1>
        <p className="text-gray-600">
          {isParent ? 'Vue parent - Vous pouvez gérer la famille complète' : 'Vue membre - Gérez votre agenda'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/family" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold">Ma famille</h3>
              <p className="text-sm text-gray-600">Gérer les membres</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/schedule" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Horaires</h3>
              <p className="text-sm text-gray-600">Voir les agendas</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/tasks" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Tâches</h3>
              <p className="text-sm text-gray-600">Gérer les tâches</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/lists" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <List className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Listes partagées</h3>
              <p className="text-sm text-gray-600">Listes de courses, etc.</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Prochains événements</h2>
            <Link href="/dashboard/schedule" className="text-primary-600 hover:underline text-sm">
              Voir tout
            </Link>
          </div>
          {upcomingSchedules.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun événement à venir</p>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((schedule: any) => (
                <div key={schedule.id} className="border-l-4 border-primary-500 pl-4 py-2">
                  <p className="font-medium">{schedule.title}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(schedule.date).toLocaleDateString('fr-FR')} • {schedule.start_time} - {schedule.end_time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tâches en cours</h2>
            <Link href="/dashboard/tasks" className="text-primary-600 hover:underline text-sm">
              Voir tout
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune tâche en cours</p>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-gray-600">
                      {task.due_date ? `Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}` : 'Sans échéance'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status === 'completed' ? 'Terminé' :
                     task.status === 'in_progress' ? 'En cours' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

