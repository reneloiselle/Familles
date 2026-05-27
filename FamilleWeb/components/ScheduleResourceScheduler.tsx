'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ActionEventArgs,
  EventSettingsModel,
  GroupModel,
  Inject,
  ResourcesDirective,
  ResourceDirective,
  ScheduleComponent,
  TimelineViews,
  Resize,
  DragAndDrop,
  ViewsDirective,
  ViewDirective,
} from '@syncfusion/ej2-react-schedule'

type FamilyMember = {
  id: string
  user_id: string | null
  role: 'parent' | 'child'
  email?: string | null
  name?: string | null
  avatar_url?: string | null
}

type ScheduleRow = {
  id: string
  family_member_id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  date: string
  subscription_id?: string | null
  external_uid?: string | null
  family_members?: {
    id: string
    user_id: string | null
    role: string
    avatar_url?: string | null
  }
}

type SchedulerEvent = {
  Id: string
  Subject: string
  Description?: string | null
  Location?: string | null
  StartTime: Date
  EndTime: Date
  IsAllDay?: boolean
  FamilyMemberId: string
  subscription_id?: string | null
  external_uid?: string | null
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDateYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatTimeHHmm(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function stableColorFromId(id: string) {
  // Simple hash -> HSL; stable per member without storing in DB
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 70% 45%)`
}

function normalizeTimeToHHmm(time: string) {
  // Accepts `HH:mm` or `HH:mm:ss` (Postgres time often returns seconds).
  const [hh, mm] = time.split(':')
  if (!hh || !mm) return '00:00'
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
}

function parseLocalDateTime(dateYYYYMMDD: string, time: string) {
  // Interpreted in local timezone
  const hhmm = normalizeTimeToHHmm(time)
  return new Date(`${dateYYYYMMDD}T${hhmm}:00`)
}

function getMemberText(member: FamilyMember, currentUserId: string) {
  if (member.user_id === currentUserId) return 'Vous'
  if (member.name) return member.name
  if (member.email) return member.email
  return `Membre ${member.id.slice(0, 8)}`
}

function canMutateSchedule(params: {
  isParent: boolean
  currentUserId: string
  scheduleOwnerUserId?: string | null
  subscription_id?: string | null
}) {
  if (params.subscription_id) return false
  if (params.isParent) return true
  return params.scheduleOwnerUserId != null && params.scheduleOwnerUserId === params.currentUserId
}

export function ScheduleResourceScheduler(props: {
  currentUserId: string
  isParent: boolean
  selectedDate: string
  familyMembers: FamilyMember[]
  schedules: ScheduleRow[]
  onSchedulesChange: (next: ScheduleRow[]) => void
}) {
  const { currentUserId, isParent, selectedDate, familyMembers, schedules, onSchedulesChange } = props
  const supabase = useMemo(() => createClient(), [])
  const scheduleRef = useRef<ScheduleComponent | null>(null)
  const [error, setError] = useState<string>('')

  const resourceData = useMemo(
    () =>
      familyMembers.map((m) => ({
        Id: m.id,
        Text: getMemberText(m, currentUserId),
        Color: stableColorFromId(m.id),
      })),
    [familyMembers, currentUserId]
  )

  const eventData: SchedulerEvent[] = useMemo(
    () =>
      schedules
        .map((s) => ({
          Id: s.id,
          Subject: s.title,
          Description: s.description,
          Location: s.location,
          StartTime: parseLocalDateTime(s.date, s.start_time),
          EndTime: parseLocalDateTime(s.date, s.end_time),
          FamilyMemberId: s.family_member_id,
          subscription_id: s.subscription_id ?? null,
          external_uid: s.external_uid ?? null,
        }))
        .filter(
          (event) =>
            !Number.isNaN(event.StartTime.getTime()) && !Number.isNaN(event.EndTime.getTime())
        ),
    [schedules]
  )

  const eventSettings: EventSettingsModel = useMemo(() => ({ dataSource: eventData }), [eventData])

  const groupSettings: GroupModel = useMemo(() => ({ resources: ['FamilyMembers'] }), [])

  const selectedDateObj = useMemo(() => {
    // selectedDate is YYYY-MM-DD
    return new Date(`${selectedDate}T00:00:00`)
  }, [selectedDate])

  const onActionBegin = async (args: ActionEventArgs) => {
    try {
      setError('')

      // Syncfusion sets requestType for CRUD ops
      if (!('requestType' in args) || !args.requestType) return

      // Normalize data payload
      const data = (args.data ?? args.addedRecords ?? args.changedRecords ?? args.deletedRecords) as
        | SchedulerEvent
        | SchedulerEvent[]
        | undefined

      const records = Array.isArray(data) ? data : data ? [data] : []
      if (records.length === 0) return

      const requestType = String(args.requestType)

      if (requestType === 'eventCreate') {
        // For allowMultiple resource, Syncfusion may create multiple records; we support batch insert.
        for (const ev of records) {
          // Guard iCal/permissions (should not happen on create but safe)
          if (!canMutateSchedule({ isParent, currentUserId, scheduleOwnerUserId: currentUserId, subscription_id: ev.subscription_id })) {
            args.cancel = true
            return
          }

          const start = new Date(ev.StartTime)
          const end = new Date(ev.EndTime)
          const insertPayload = {
            family_member_id: ev.FamilyMemberId,
            title: ev.Subject,
            description: ev.Description ?? null,
            location: ev.Location ?? null,
            date: formatDateYYYYMMDD(start),
            start_time: formatTimeHHmm(start),
            end_time: formatTimeHHmm(end),
          }

          const { data: inserted, error: insertError } = await supabase
            .from('schedules')
            .insert(insertPayload)
            .select('*, family_members(id, user_id, role, avatar_url), subscription_id, external_uid')
            .single()

          if (insertError) throw insertError

          // Replace temporary client event (if any) by refreshing from DB row
          onSchedulesChange([...schedules, inserted as ScheduleRow])
        }
      }

      if (requestType === 'eventChange') {
        for (const ev of records) {
          const existing = schedules.find((s) => s.id === ev.Id)
          if (!existing) continue

          if (
            !canMutateSchedule({
              isParent,
              currentUserId,
              scheduleOwnerUserId: existing.family_members?.user_id ?? null,
              subscription_id: existing.subscription_id ?? null,
            })
          ) {
            args.cancel = true
            return
          }

          const start = new Date(ev.StartTime)
          const end = new Date(ev.EndTime)
          const updatePayload = {
            family_member_id: ev.FamilyMemberId,
            title: ev.Subject,
            description: ev.Description ?? null,
            location: ev.Location ?? null,
            date: formatDateYYYYMMDD(start),
            start_time: formatTimeHHmm(start),
            end_time: formatTimeHHmm(end),
          }

          const { data: updated, error: updateError } = await supabase
            .from('schedules')
            .update(updatePayload)
            .eq('id', ev.Id)
            .select('*, family_members(id, user_id, role, avatar_url), subscription_id, external_uid')
            .single()

          if (updateError) throw updateError

          onSchedulesChange(schedules.map((s) => (s.id === ev.Id ? (updated as ScheduleRow) : s)))
        }
      }

      if (requestType === 'eventRemove') {
        for (const ev of records) {
          const existing = schedules.find((s) => s.id === ev.Id)
          if (!existing) continue

          if (
            !canMutateSchedule({
              isParent,
              currentUserId,
              scheduleOwnerUserId: existing.family_members?.user_id ?? null,
              subscription_id: existing.subscription_id ?? null,
            })
          ) {
            args.cancel = true
            return
          }

          const { error: deleteError } = await supabase.from('schedules').delete().eq('id', ev.Id)
          if (deleteError) throw deleteError

          onSchedulesChange(schedules.filter((s) => s.id !== ev.Id))
        }
      }
    } catch (e: any) {
      console.error('Scheduler action error:', e)
      setError(e?.message ?? 'Erreur lors de la mise à jour des horaires')
      // Prevent UI from committing inconsistent local changes
      args.cancel = true
    }
  }

  if (familyMembers.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Aucun membre dans la famille pour afficher les horaires</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        <ScheduleComponent
          ref={(c: ScheduleComponent | null) => {
            scheduleRef.current = c
          }}
          height="780px"
          selectedDate={selectedDateObj}
          currentView="TimelineWeek"
          eventSettings={eventSettings}
          group={groupSettings}
          actionBegin={onActionBegin}
        >
          <ViewsDirective>
            <ViewDirective option="TimelineWeek" />
            <ViewDirective option="TimelineDay" />
          </ViewsDirective>
          <ResourcesDirective>
            <ResourceDirective
              field="FamilyMemberId"
              title="Membre"
              name="FamilyMembers"
              allowMultiple={false}
              dataSource={resourceData}
              textField="Text"
              idField="Id"
              colorField="Color"
            />
          </ResourcesDirective>
          <Inject services={[TimelineViews, Resize, DragAndDrop]} />
        </ScheduleComponent>
      </div>
    </div>
  )
}

