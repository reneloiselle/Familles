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

async function getPendingTasks(supabase: any, familyId: string, familyMemberId: string, userId: string) {
  const { data } = await supabase
    .from('tasks')
    .select('*, family_members(id, user_id)')
    .eq('family_id', familyId)
    .eq('status', 'todo')
    .or(`created_by.eq.${userId},assigned_to.eq.${familyMemberId}`)
    .order('due_date', { ascending: true })
    .limit(10) // Limiter à 10 pour avoir assez après filtrage
  
  // Double vérification côté client pour s'assurer du filtrage
  const filteredData = (data || []).filter((task: any) => 
    task.created_by === userId || task.assigned_to === familyMemberId
  ).slice(0, 5) // Prendre les 5 premières après filtrage
  
  return filteredData
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
      <div className="max-w-2xl mx-auto text-center animate-in fade-in">
        <div className="card">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Bienvenue sur FamilleWeb !
            </h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Vous n'êtes membre d'aucune famille pour le moment.
            </p>
          </div>
          <Link href="/dashboard/family" className="btn btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center">
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
  const familyName = (familyMember.data.families as any)?.name || ''

  const [upcomingSchedules, pendingTasks] = await Promise.all([
    getUpcomingSchedules(supabase, familyMemberId),
    getPendingTasks(supabase, familyId, familyMemberId, user.id),
  ])

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
          Bienvenue dans la famille {familyName} !
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          {isParent ? 'Vue parent - Vous pouvez gérer la famille complète' : 'Vue membre - Gérez votre agenda'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Link href="/dashboard/family" className="card group">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">Ma famille</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gérer les membres</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/schedule" className="card group">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">Horaires</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Voir les agendas</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/tasks" className="card group">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
            <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">Tâches</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gérer les tâches</p>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/lists" className="card group">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <List className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">Listes</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Listes partagées</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Prochains événements</h2>
            <Link href="/dashboard/schedule" className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
              Voir tout →
            </Link>
          </div>
          {upcomingSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun événement à venir</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((schedule: any) => (
                <div key={schedule.id} className="border-l-4 border-primary-500 pl-4 py-2 rounded-r-lg bg-primary-50/50 hover:bg-primary-50 transition-colors">
                  <p className="font-medium text-sm sm:text-base">{schedule.title}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {new Date(schedule.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {schedule.start_time} - {schedule.end_time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Mes tâches à faire</h2>
            <Link href="/dashboard/tasks" className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
              Voir tout →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucune tâche à faire</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task: any) => (
                <div key={task.id} className="flex items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{task.title}</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {task.due_date ? `Échéance: ${new Date(task.due_date).toLocaleDateString('fr-FR')}` : 'Sans échéance'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {task.status === 'completed' ? 'Complété' : 'À faire'}
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

