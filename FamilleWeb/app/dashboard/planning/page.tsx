import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FamilyPlanningWeekView } from '@/components/FamilyPlanningWeekView'
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

  if (!data) return []

  const membersWithEmails = await Promise.all(
    data.map(async (member: { user_id: string | null; email: string | null }) => {
      if (member.user_id) {
        const { data: email } = await supabase.rpc('get_user_email', {
          user_uuid: member.user_id,
        })
        return { ...member, email: email || member.email }
      }
      return member
    })
  )

  return membersWithEmails
}

async function getWeekSchedules(
  supabase: any,
  familyMemberIds: string[],
  weekStart: string,
  weekEnd: string
) {
  if (familyMemberIds.length === 0) return []

  const { data, error } = await supabase
    .from('schedules')
    .select('*, family_members(id, user_id, role, email, name, avatar_url)')
    .in('family_member_id', familyMemberIds)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching planning schedules:', error)
    return []
  }

  return data || []
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: { date?: string }
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
  const familyMemberIds = familyMembers.map((m: { id: string }) => m.id)

  const selectedDate = searchParams.date || getLocalDateString()
  const weekStart = getWeekStart(selectedDate)
  const weekEnd = getWeekEnd(weekStart)

  const schedules = await getWeekSchedules(
    supabase,
    familyMemberIds,
    weekStart,
    weekEnd
  )

  return (
    <div className="max-w-[1400px] mx-auto">
      <FamilyPlanningWeekView
        user={user}
        familyMember={familyMember}
        familyMembers={familyMembers}
        schedules={schedules}
        initialDate={selectedDate}
      />
    </div>
  )
}
