# Migrations Supabase — FamilleWeb

Les scripts SQL se trouvent dans [`supabase/migrations/`](supabase/migrations/). **Exécutez-les dans l’ordre numérique** via le **SQL Editor** de votre projet Supabase (ou `supabase db push` si le CLI est lié au projet).

## Liste des migrations

| Fichier | Contenu principal |
|---------|-------------------|
| `001_initial_schema.sql` | Schéma initial (familles, membres, horaires, tâches) + RLS |
| `002_add_user_email_function.sql` | Fonctions email, vue `family_members_with_email` |
| `003_fix_family_members_rls.sql` | RLS membres sans récursion |
| `004_fix_families_rls.sql` | RLS familles |
| `005_add_invitations_system.sql` | Invitations, nom/email sur membres |
| `006_update_rls_for_members_without_accounts.sql` | Membres sans compte |
| `007_fix_invitations_rls_auth_users.sql` | RLS invitations |
| `008_fix_schedules_rls_for_all_members.sql` | RLS horaires pour tous les membres |
| `009_add_shared_lists.sql` | Listes partagées + items |
| `010_enable_realtime_shared_lists.sql` | Realtime listes |
| `011_enable_realtime_tasks.sql` | Realtime tâches |
| `012_enable_realtime_schedules.sql` | Realtime horaires |
| `013_add_avatar_to_members.sql` | Colonne `avatar_url` (emoji) |
| `014_add_calendar_subscriptions.sql` | Abonnements iCal |
| `015_update_schedules_for_sync.sql` | Sync calendrier externe |
| `016_add_chat_conversations.sql` | Conversations chat |
| `017_simplify_task_status.sql` | Statuts tâches simplifiés |
| `018_add_task_priority.sql` | Priorité des tâches |
| `019_add_location_to_schedules.sql` | Lieu sur les horaires |
| `020_replica_identity_shared_lists.sql` | `REPLICA IDENTITY FULL` (Realtime DELETE) |
| `021_accept_pending_invitations.sql` | Acceptation invitations en attente |
| `022_add_member_color.sql` | Colonne `color`, couleurs par défaut, auto-édition profil |
| `023_add_products_and_stores.sql` | Catalogue `products`, `stores`, `product_store_placements` + RLS |
| `024_extend_shared_list_items_products.sql` | `product_id` sur items, RPC résolution/création produit |
| `025_enable_realtime_products.sql` | Realtime catalogue + `REPLICA IDENTITY FULL` |
| `026_find_product_validate_list.sql` | `find_product` (sans création) + validation à l’ajout en liste |

**Fichier tout-en-un (SQL Editor)** : [`supabase/migrations/APPLY_023_025_products_catalog.sql`](supabase/migrations/APPLY_023_025_products_catalog.sql) — collez son contenu en une fois dans le SQL Editor du projet lié à votre `.env` (`NEXT_PUBLIC_SUPABASE_URL`).

**En ligne de commande** (mot de passe DB requis) :

```bash
cd FamilleWeb
SUPABASE_DB_PASSWORD='votre_mot_de_passe' node scripts/apply-migrations.mjs 023 024 025
```

## Migrations critiques pour l’UI actuelle

Sans ces migrations, certaines pages échouent silencieusement ou affichent des listes vides :

- **`009`** — page Listes (`/dashboard/lists`)
- **`013` + `022`** — avatars et couleurs membres (page Famille, tâches, horaires, planning, navbar)
- **`023`–`026`** — catalogue produits, magasins, listes hybrides (`/dashboard/products`, `/dashboard/stores`)

## Après une migration

1. Vérifier dans *Table Editor* que les colonnes existent (`family_members.color`, tables `shared_lists`, etc.).
2. Mettre à jour [`lib/supabase/database.types.ts`](lib/supabase/database.types.ts) si le schéma a changé.
3. Redémarrer `npm run dev` si le cache PostgREST semble obsolète (« schema cache »).

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| Membres de famille invisibles | `022` non appliquée alors que le code demandait `color` | Exécuter `022` ou utiliser une version du code sans colonne `color` dans les `SELECT` |
| Listes vides, table absente | `009` non appliquée | Exécuter `009` |
| Realtime listes / suppressions | `010` ou `020` manquantes | Exécuter `010` puis `020` |
| « Could not find the table shared_lists » | `009` manquante | Exécuter `009` |

## Nouvelle migration

1. Créer `supabase/migrations/027_description.sql` (numéro suivant).
2. Documenter le fichier dans ce document.
3. Mettre à jour `database.types.ts`.
4. Tester RLS en tant que parent et enfant.
