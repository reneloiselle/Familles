import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleManagement } from '@/components/ScheduleManagement'
import {
  getLocalDateString,
  getWeekStart,
  getWeekEnd,
} from '@/lib/schedule/dateUtils'

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
    .select('id, user_id, role, email, name, avatar_url')
    .eq('family_id', familyId)

  return data || []
}

async function getSchedules(
  supabase: any, 
  familyMemberIds: string[], 
  date?: string, 
  weekStart?: string,
  dateRange?: { start: string; end: string }
) {
  if (familyMemberIds.length === 0) {
    return []
  }

  let query = supabase
    .from('schedules')
    .select('*, family_members(id, user_id, role, email, name, avatar_url)')
    .in('family_member_id', familyMemberIds)

  if (dateRange) {
    // Plage de dates (pour la vue family par défaut : aujourd'hui + 7 jours)
    query = query.gte('date', dateRange.start).lte('date', dateRange.end)
  } else if (date) {
    query = query.eq('date', date)
  } else if (weekStart) {
    query = query.gte('date', weekStart).lte('date', getWeekEnd(weekStart))
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

  const selectedDate = searchParams.date || getLocalDateString()
  const view = searchParams.view || (familyMember.role === 'parent' ? 'family' : 'personal')

  // Pour la vue family, calculer la plage de 7 jours à partir d'aujourd'hui
  const today = getLocalDateString()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const endDateStr = getLocalDateString(endDate)

  const weekStart = view === 'week' ? getWeekStart(selectedDate) : undefined
  const familyDateRange = view === 'family' ? { start: today, end: endDateStr } : undefined

  const schedules = await getSchedules(
    supabase,
    familyMemberIds,
    view === 'family' ? undefined : view === 'week' ? undefined : selectedDate,
    weekStart,
    familyDateRange
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des horaires</h1>
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

