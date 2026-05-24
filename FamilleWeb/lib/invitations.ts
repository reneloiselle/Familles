import type { SupabaseClient } from '@supabase/supabase-js'

/** Accepte toutes les invitations en attente pour l'email de l'utilisateur connecté. */
export async function acceptPendingInvitations(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.rpc('accept_pending_invitations')
}
