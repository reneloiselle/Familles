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

/** Plage de N jours consécutifs à partir de startDateStr (inclus). */
export function getConsecutiveDayRange(startDateStr: string, dayCount: number): { start: string; end: string } {
  return {
    start: startDateStr,
    end: addDays(startDateStr, Math.max(0, dayCount - 1)),
  }
}

/** Liste des dates YYYY-MM-DD sur N jours consécutifs à partir de startDateStr. */
export function getConsecutiveDays(startDateStr: string, dayCount: number): string[] {
  const days: string[] = []
  for (let i = 0; i < dayCount; i++) {
    days.push(addDays(startDateStr, i))
  }
  return days
}

/** Premier jour du mois contenant dateStr */
export function getMonthStart(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Dernier jour du mois contenant dateStr */
export function getMonthEnd(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return getLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/** Ajoute ou retire des mois à une date YYYY-MM-DD */
export function addMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr)
  d.setMonth(d.getMonth() + months)
  return getLocalDateString(d)
}

/** Plage lun→dim couvrant toute la grille du mois (jours hors mois inclus) */
export function getMonthGridRange(dateStr: string): { start: string; end: string } {
  const monthStart = getMonthStart(dateStr)
  const monthEnd = getMonthEnd(dateStr)
  return {
    start: getWeekStart(monthStart),
    end: getWeekEnd(getWeekStart(monthEnd)),
  }
}

/** Dates de la grille calendrier (lun→dim, semaines complètes) pour le mois de dateStr */
export function getMonthGridDays(dateStr: string): string[] {
  const { start, end } = getMonthGridRange(dateStr)
  const days: string[] = []
  let current = start
  while (current <= end) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

/** Libellé mois + année en français */
export function formatMonthYear(dateStr: string): string {
  const d = parseLocalDate(getMonthStart(dateStr))
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
