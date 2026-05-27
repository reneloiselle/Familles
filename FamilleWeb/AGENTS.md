# FamilleWeb — instructions agents

Application **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + **Supabase**.

## Commandes

```bash
cd FamilleWeb
npm install
npm run dev      # http://localhost:3000 (-H 0.0.0.0)
npm run build
npm run lint
```

Config locale : `.env.local` (voir [README.md](README.md), [GETTING_STARTED.md](GETTING_STARTED.md)). Ne pas commiter les fichiers `.env*`.

## Arborescence clé

| Chemin | Usage |
|--------|--------|
| `app/` | Pages et routes API (`app/api/`) |
| `components/` | UI dashboard (`*Management.tsx`, `MemberAvatar.tsx`) |
| `lib/family/` | Affichage membres (`memberDisplay.ts`) |
| `lib/schedule/` | Dates, layout grille, couleurs (`memberColors.ts`) |
| `lib/supabase/` | Client/serveur, types DB, erreurs colonnes |
| `supabase/migrations/` | Migrations SQL (ordre numérique, voir [MIGRATIONS.md](MIGRATIONS.md)) |
| `.agents/skills/` | Skills Syncfusion React (66 composants) |
| `middleware.ts` | Session Supabase |

### Routes dashboard

| Route | Composant principal |
|-------|---------------------|
| `/dashboard/family` | `FamilyManagement`, `InvitationManager` |
| `/dashboard/planning` | `FamilyPlanningWeekView` |
| `/dashboard/schedule` | `ScheduleManagement`, `CalendarSubscriptionManager` |
| `/dashboard/tasks` | `TaskManagement` |
| `/dashboard/lists` | `SharedListsManagement` |

### Routes API

`app/api/chat/`, `app/api/calendar/sync/`, `app/api/mcp/`

## Membres — conventions

- Table `family_members` : `name`, `avatar_url` (emoji), `color` (hex, migration **022**), `role`, `email`, `invitation_status`.
- Utilitaires : [`lib/family/memberDisplay.ts`](lib/family/memberDisplay.ts) — `getMemberDisplayName`, `getMemberAvatar`, `getMemberColor`, `canEditMember`, `EMOJI_OPTIONS`.
- Composant : [`components/MemberAvatar.tsx`](components/MemberAvatar.tsx) — réutiliser pour avatar + pastille couleur (ne pas dupliquer les helpers dans chaque `*Management.tsx`).
- Couleurs : [`lib/schedule/memberColors.ts`](lib/schedule/memberColors.ts) — palette `MEMBER_COLOR_HEX` + fallback par index si `color` absent en DB.
- **Ne pas** lister `color` dans les `SELECT` tant que la migration 022 n’est pas appliquée sur l’instance cible, ou gérer l’erreur via [`lib/supabase/columnErrors.ts`](lib/supabase/columnErrors.ts) pour les écritures.

## Skills agents (`.agents/skills/`)

66 skills Syncfusion React — lire le `SKILL.md` du composant concerné avant toute intégration Syncfusion. Transverses : `syncfusion-react-common`, `syncfusion-react-themes`, `syncfusion-react-license`.

## Conventions code

- **App Router** : Server Components par défaut ; `'use client'` si état, effets ou événements navigateur.
- **Supabase** : `lib/supabase/client.ts` (navigateur), `lib/supabase/server.ts` (SSR / API).
- **Client Supabase côté client** : instancier avec `useMemo(() => createClient(), [])` dans les composants avec `useEffect` (éviter boucles infinies).
- **Styles** : Tailwind ; suivre les composants existants.
- **Dates** : `date-fns`. **Icônes** : `lucide-react`.
- **Libellés UI** : français. **Identifiants code** : anglais.

## Migrations et schéma

- Nouvelle migration : `supabase/migrations/0NN_description.sql` (numéro suivant le dernier fichier).
- Documenter dans [MIGRATIONS.md](MIGRATIONS.md).
- Mettre à jour [`lib/supabase/database.types.ts`](lib/supabase/database.types.ts) si le schéma change.
- RLS : tester accès parent vs enfant ; ne pas casser `can_user_view_family` / `is_user_parent_of_family`.

## Realtime

- Tables : `shared_lists`, `shared_list_items` (`010`, `020`), `tasks` (`011`), `schedules` (`012`).
- `SharedListsManagement` : pas de filtre serveur sur les channels DELETE ; filtrer côté client par `family_id` / `list_id`.
- Problème synchro listes : vérifier `REPLICA IDENTITY FULL` (migration `020`).

## Variables d’environnement

| Variable | Contexte |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + serveur |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Routes API privilégiées uniquement |
| `OPENAI_API_KEY` | Chat / TTS / stream |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Sélecteur de lieu |

## À éviter

- Commiter `.env`, `appparm` avec vraies clés, ou `service_role` en `NEXT_PUBLIC_*`.
- Dupliquer la logique membre hors de `memberDisplay.ts` / `MemberAvatar`.
- Sur-ingénierie ou refactor hors périmètre de la demande.
- Modifier `archives/plans/` sauf documentation historique demandée.
- Supposer que la migration **022** est appliquée sans vérifier (symptôme : membres/listes vides si requêtes invalides).

## Dépannage rapide (agents)

| Symptôme | Vérifier |
|----------|----------|
| Membres invisibles | Migration `022`, colonne `color` dans les `SELECT` |
| Listes vides | Migration `009`, même `NEXT_PUBLIC_SUPABASE_URL` que les données |
| Realtime DELETE | Migration `020` |
| Boucle chargement | `useMemo` sur `createClient()` dans les `useEffect` |
