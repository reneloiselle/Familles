# Récapitulatif — FamilleWeb

État fonctionnel du sous-projet web (monorepo Familles). Dernière mise à jour : gestion des profils membres (nom, emoji, couleur) et documentation migrations.

## Fonctionnalités implémentées

### Famille (`/dashboard/family`)

- Création et renommage de la famille (parents)
- Invitations par email (avec nom, emoji et couleur optionnels)
- Édition des membres : nom, emoji (`avatar_url`), couleur hex (`color`), rôle (parents)
- Auto-édition du profil par chaque membre connecté (nom, emoji, couleur)
- Retrait de membres (parents, sauf soi-même)
- Membres sans compte (enfants invités par email)

### Planning (`/dashboard/planning`)

- Grille hebdomadaire multi-membres
- Couleur par membre (persistée en base après migration `022`, sinon palette calculée)
- Création / édition d’horaires, conflits, événements iCal

### Horaires (`/dashboard/schedule`)

- Vues personnelle, famille, semaine, mois
- Abonnements calendrier iCal (`CalendarSubscriptionManager`)
- Lieu optionnel (Google Maps)
- Affichage membre : avatar + couleur sur cartes et grilles

### Tâches (`/dashboard/tasks`)

- CRUD, assignation, priorités, échéances
- Statuts : à faire / complété
- Realtime
- Avatar et couleur de l’assigné sur les cartes

### Listes partagées (`/dashboard/lists`)

- Listes collaboratives avec items cochables
- Couleur par liste, Realtime (migrations `009`, `010`, `020`)

### Autres

- Auth (inscription, connexion, middleware)
- Accueil dashboard avec aperçu tâches / horaires
- Clés API (`/dashboard/api-keys`) et route `/api/mcp`
- Chat serveur : `/api/chat`, `/api/chat/stream`, `/api/chat/tts` (clé OpenAI)
- Sync iCal : `/api/calendar/sync` (service role)

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Realtime), date-fns, lucide-react, node-ical, Google Maps (optionnel).

## Structure actuelle (extraits)

```
FamilleWeb/
├── app/dashboard/
│   ├── family/      # Gestion famille
│   ├── planning/    # Grille semaine famille
│   ├── schedule/    # Horaires + iCal
│   ├── tasks/
│   ├── lists/
│   └── api-keys/
├── components/
│   ├── FamilyManagement.tsx
│   ├── InvitationManager.tsx
│   ├── MemberAvatar.tsx          # Avatar + couleur membre
│   ├── FamilyPlanningWeekView.tsx
│   ├── ScheduleManagement.tsx
│   ├── TaskManagement.tsx
│   ├── SharedListsManagement.tsx
│   └── ...
├── lib/
│   ├── family/memberDisplay.ts   # Nom, avatar, couleur, permissions
│   ├── schedule/memberColors.ts  # Palette + fallback
│   └── supabase/
├── supabase/migrations/          # 001 … 022
├── README.md
├── GETTING_STARTED.md
├── MIGRATIONS.md
└── AGENTS.md
```

## Schéma `family_members` (champs UI)

| Colonne | Usage |
|---------|--------|
| `name` | Nom affiché |
| `email` | Invitation / membre sans compte |
| `role` | `parent` \| `child` |
| `avatar_url` | Emoji (ex. 👦) |
| `color` | Couleur hex `#RRGGBB` (migration `022`) |
| `invitation_status` | pending / accepted / declined |

## Migrations

22 fichiers SQL — voir [MIGRATIONS.md](MIGRATIONS.md). **Toutes doivent être appliquées** sur l’instance Supabase utilisée par `.env.local`.

## Pistes d’évolution (hors scope actuel)

- Upload photo membre (Supabase Storage)
- Statut « en ligne » (Presence)
- Alignement FamilleMobile sur `color` + `avatar_url`
- FamilleMobile : même URL Supabase que FamilleWeb en dev

## Documentation

| Fichier | Rôle |
|---------|------|
| [README.md](README.md) | Vue d’ensemble, config, commandes |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Démarrage rapide |
| [MIGRATIONS.md](MIGRATIONS.md) | Migrations SQL et dépannage |
| [AGENTS.md](AGENTS.md) | Consignes pour les agents IA |
| [DOCKER.md](DOCKER.md) | Conteneur et déploiement |
| `archives/plans/` | Guides historiques (invitations, listes, Realtime) |
