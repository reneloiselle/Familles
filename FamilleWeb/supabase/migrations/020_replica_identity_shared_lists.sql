-- Permet à Realtime d'inclure toutes les colonnes dans payload.old (événements DELETE)
-- Voir https://supabase.com/docs/guides/realtime/postgres-changes#delete-events
ALTER TABLE shared_lists REPLICA IDENTITY FULL;
ALTER TABLE shared_list_items REPLICA IDENTITY FULL;
