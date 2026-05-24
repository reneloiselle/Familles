export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 22
export const SLOT_HEIGHT_PX = 48

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatTimeLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function getEventTopPx(startTime: string): number {
  const startMin = timeToMinutes(startTime)
  const dayStartMin = DAY_START_HOUR * 60
  return ((startMin - dayStartMin) / 60) * SLOT_HEIGHT_PX
}

export function getEventHeightPx(startTime: string, endTime: string): number {
  const startMin = timeToMinutes(startTime)
  const endMin = timeToMinutes(endTime)
  const height = ((endMin - startMin) / 60) * SLOT_HEIGHT_PX
  return Math.max(height, 20)
}

export const GRID_HEIGHT_PX = (DAY_END_HOUR - DAY_START_HOUR) * SLOT_HEIGHT_PX

interface TimedEvent {
  id: string
  start_time: string
  end_time: string
  family_member_id: string
  date: string
}

export function schedulesOverlap(a: TimedEvent, b: TimedEvent): boolean {
  if (a.date !== b.date) return false
  const start1 = timeToMinutes(a.start_time)
  const end1 = timeToMinutes(a.end_time)
  const start2 = timeToMinutes(b.start_time)
  const end2 = timeToMinutes(b.end_time)
  return start1 < end2 && end1 > start2
}

/** Même membre + chevauchement horaire */
export function sameMemberConflict(a: TimedEvent, b: TimedEvent): boolean {
  return a.family_member_id === b.family_member_id && schedulesOverlap(a, b)
}

export interface EventLayout {
  column: number
  totalColumns: number
  hasConflict: boolean
}

/** Colonnes parallèles pour événements qui se chevauchent (même jour) */
export function computeDayEventLayouts<T extends TimedEvent>(events: T[]): Map<string, EventLayout> {
  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  )
  const layouts = new Map<string, EventLayout>()
  const columns: T[][] = []

  for (const event of sorted) {
    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const overlaps = columns[col].some((e) => schedulesOverlap(e, event))
      if (!overlaps) {
        columns[col].push(event)
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push([event])
    }
  }

  const totalColumns = Math.max(columns.length, 1)

  for (const colEvents of columns) {
    for (const event of colEvents) {
      const colIndex = columns.indexOf(colEvents)
      const hasConflict = events.some(
        (other) =>
          other.id !== event.id &&
          sameMemberConflict(event, other)
      )
      layouts.set(event.id, {
        column: colIndex,
        totalColumns,
        hasConflict,
      })
    }
  }

  return layouts
}
