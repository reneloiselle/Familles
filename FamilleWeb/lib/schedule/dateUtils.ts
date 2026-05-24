/** Date locale YYYY-MM-DD sans décalage fuseau */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse YYYY-MM-DD en Date locale */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Lundi de la semaine contenant dateStr */
export function getWeekStart(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  return getLocalDateString(monday)
}

/** Fin de semaine (dimanche) à partir du lundi weekStartStr */
export function getWeekEnd(weekStartStr: string): string {
  const weekEnd = parseLocalDate(weekStartStr)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return getLocalDateString(weekEnd)
}

/** 7 jours lun → dim pour la semaine contenant dateStr */
export function getWeekDays(dateStr: string): string[] {
  const monday = parseLocalDate(getWeekStart(dateStr))
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(getLocalDateString(d))
  }
  return days
}

/** Ajoute ou retire des jours à une date YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  return getLocalDateString(d)
}
