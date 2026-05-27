/** Erreur PostgREST / Postgres : colonne absente (migration non appliquée). */
export function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (error.message?.includes('column') && error.message?.includes('does not exist')) ||
    error.message?.includes('Could not find the') === true
  )
}
