import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleManagement } from '@/components/ScheduleManagement'

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
    .select('id, user_id, role, email, name')
    .eq('family_id', familyId)
  
  return data || []
}

async function getSchedules(supabase: any, familyMemberIds: string[], date?: string, weekStart?: string) {
  if (familyMemberIds.length === 0) {
    return []
  }
  
  let query = supabase
    .from('schedules')
    .select('*, family_members(id, user_id, role, email, name)')
    .in('family_member_id', familyMemberIds)
  
  if (date) {
    query = query.eq('date', date)
  } else if (weekStart) {
    // Get schedules for the week (7 days starting from weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    query = query.gte('date', weekStart).lte('date', weekEnd.toISOString().split('T')[0])
  }
  
  const { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true })
  
  if (error) {
    console.error('Error fetching schedules:', error)
    return []
  }
  
  return data || []
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { date?: string; view?: string }
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
  const familyMemberIds = familyMembers.map((m: any) => m.id)
  
  const selectedDate = searchParams.date || new Date().toISOString().split('T')[0]
  const view = searchParams.view || (familyMember.role === 'parent' ? 'family' : 'personal')
  
  // Calculate week start (Monday of the week containing selectedDate)
  const getWeekStart = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(date)
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
    return monday.toISOString().split('T')[0]
  }
  
  const weekStart = view === 'week' ? getWeekStart(selectedDate) : undefined
  
  // For family view, get all schedules for the selected date
  // For week view, get all schedules for the week
  // For personal view, get all schedules without date filter (filtered client-side)
  const schedules = await getSchedules(
    supabase, 
    familyMemberIds, 
    view === 'family' ? selectedDate : undefined,
    weekStart
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des horaires</h1>
        <p className="text-gray-600">
          {familyMember.role === 'parent'
            ? 'Vue complète de la famille - Visualisez tous les horaires'
            : 'Votre agenda personnel'}
        </p>
      </div>

      <ScheduleManagement
        user={user}
        familyMember={familyMember}
        familyMembers={familyMembers}
        schedules={schedules}
        initialDate={selectedDate}
        initialView={view}
      />
    </div>
  )
}

