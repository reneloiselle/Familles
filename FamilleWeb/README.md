# FamilleWeb

Application web (**Next.js 14** / App Router) pour gérer une famille : membres, planning, horaires, tâches et listes partagées. Backend **Supabase** (PostgreSQL, Auth, Realtime).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack](#stack)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Migrations Supabase](#migrations-supabase)
- [Structure du projet](#structure-du-projet)
- [Commandes](#commandes)
- [Docker / déploiement](#docker--déploiement)
- [MCP et chat](#mcp-et-chat)
- [Agents Cursor](#agents-cursor)
- [Documentation](#documentation)

## Fonctionnalités

| Domaine | Route | Description |
|---------|--------|-------------|
| **Famille** | `/dashboard/family` | Création famille, invitations, édition membres (nom, emoji, couleur, rôle) |
| **Planning** | `/dashboard/planning` | Grille hebdomadaire par membre avec couleurs |
| **Horaires** | `/dashboard/schedule` | Agenda, vues semaine/mois/famille, sync **iCal**, lieux |
| **Tâches** | `/dashboard/tasks` | Assignation, priorités, statuts, Realtime |
| **Listes** | `/dashboard/lists` | Listes partagées collaboratives (items cochables) |
| **Accueil** | `/dashboard` | Aperçu tâches et prochains horaires |
| **Clés API** | `/dashboard/api-keys` | Clés pour intégrations / MCP |
| **Auth** | `/auth/*` | Inscription, connexion |
| **Invitations** | `/invitation/accept` | Accepter une invitation par token |

**Identité visuelle des membres** : chaque membre a un **emoji** (`avatar_url`) et une **couleur** (`color`, migration `022`), affichés dans la navbar, les tâches, les horaires et le planning. Les couleurs sont modifiables sur la page Famille ; sans migration `022`, une palette par défaut est utilisée côté client.

## Stack

- **Next.js 14** — App Router, Server / Client Components
- **TypeScript**
- **Supabase** — PostgreSQL, Auth, Realtime, RLS
- **Tailwind CSS**
- **date-fns**, **lucide-react**
- **node-ical** — synchronisation calendriers externes
- **@react-google-maps/api** — lieux sur les horaires (optionnel)

## Démarrage rapide

```bash
cd FamilleWeb
npm install
```

Créer **`.env.local`** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon

SUPABASE_SERVICE_ROLE_KEY=votre_service_role

# Optionnel
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Appliquer les **migrations SQL** (voir [MIGRATIONS.md](MIGRATIONS.md)), puis :

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) (écoute sur `0.0.0.0`).

Guide détaillé : [GETTING_STARTED.md](GETTING_STARTED.md).

## Configuration

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé anon (client + serveur) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅* | Sync iCal, `/api/mcp` |
| `OPENAI_API_KEY` | — | `/api/chat`, stream, TTS |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — | Sélecteur de lieu |

\* Requis pour `app/api/calendar/sync` et `app/api/mcp`.

**Sécurité** : ne jamais commiter `.env`, `.env.local` ni `appparm` avec de vraies clés ; ne pas exposer `service_role` côté navigateur.

## Migrations Supabase

Tous les scripts : `supabase/migrations/` (**001 → 022**, ordre numérique).

- Sans **009** : les listes partagées ne fonctionnent pas.
- Sans **022** : pas de colonne `color` (l’app reste utilisable avec repli palette ; exécuter **022** pour persister les couleurs).

Référence complète et dépannage : **[MIGRATIONS.md](MIGRATIONS.md)**.

## Structure du projet

```
FamilleWeb/
├── app/
│   ├── auth/                    # login, signup
│   ├── dashboard/
│   │   ├── family/              # Gestion membres
│   │   ├── planning/            # Grille semaine
│   │   ├── schedule/            # Horaires + iCal
│   │   ├── tasks/
│   │   ├── lists/
│   │   └── api-keys/
│   ├── invitation/accept/
│   └── api/
│       ├── calendar/sync/       # iCal (service role)
│       ├── chat/                # + stream, tts
│       └── mcp/                 # Clés API
├── components/
│   ├── FamilyManagement.tsx
│   ├── InvitationManager.tsx
│   ├── MemberAvatar.tsx         # Affichage membre (emoji + couleur)
│   ├── FamilyPlanningWeekView.tsx
│   ├── ScheduleManagement.tsx
│   ├── TaskManagement.tsx
│   ├── SharedListsManagement.tsx
│   ├── CalendarSubscriptionManager.tsx
│   ├── Navbar.tsx
│   └── ...
├── lib/
│   ├── family/memberDisplay.ts  # Helpers nom / avatar / couleur
│   ├── schedule/
│   │   ├── memberColors.ts
│   │   ├── dateUtils.ts
│   │   └── scheduleLayout.ts
│   └── supabase/
│       ├── client.ts            # Navigateur
│       ├── server.ts            # SSR
│       ├── database.types.ts
│       └── columnErrors.ts      # Repli si colonne absente
├── supabase/migrations/
├── .agents/skills/              # Syncfusion React (agents Cursor)
├── middleware.ts
├── README.md
├── GETTING_STARTED.md
├── MIGRATIONS.md
├── PROJET_RECAP.md
└── AGENTS.md
```

## Commandes

```bash
npm run dev      # Développement (port 3000, -H 0.0.0.0)
npm run build    # Build production
npm start        # Serveur production
npm run lint     # ESLint
```

## Docker / déploiement

- Build **standalone** Next.js (`next.config.js`)
- `Dockerfile`, `podman-compose.yml`, `deploy.sh`
- Scripts : `build-and-push.sh`, `build-and-push-docker.sh`

Voir [DOCKER.md](DOCKER.md) et [CADDY_SETUP.md](CADDY_SETUP.md).

## MCP et chat

- **Serveur MCP** (dossier `mcp-server/` à la racine du monorepo) : outils tâches, horaires, listes, clés API — voir `mcp-server/README.md`.
- **Route web** `app/api/mcp/route.ts` : gestion des clés API depuis l’interface (≠ serveur MCP stdio).
- **Chat** : routes `app/api/chat/*` (clé OpenAI côté serveur) — voir [OPENAI_SERVER_SETUP.md](OPENAI_SERVER_SETUP.md).

## Agents Cursor

- Consignes projet : [AGENTS.md](AGENTS.md)
- Skills **Syncfusion React** : `.agents/skills/` (66 composants, lire le `SKILL.md` concerné avant d’intégrer un composant Syncfusion)

## Documentation

| Document | Contenu |
|----------|---------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Installation et premier usage |
| [MIGRATIONS.md](MIGRATIONS.md) | Liste des migrations + dépannage |
| [PROJET_RECAP.md](PROJET_RECAP.md) | État des fonctionnalités |
| [AGENTS.md](AGENTS.md) | Instructions pour agents IA |
| [DOCKER.md](DOCKER.md) | Image et déploiement |
| [CADDY_SETUP.md](CADDY_SETUP.md) | Reverse proxy |
| [OPENAI_SERVER_SETUP.md](OPENAI_SERVER_SETUP.md) | Chat OpenAI |
| `archives/plans/` | Guides historiques (invitations, listes, Realtime, etc.) |

## Notes métier

- Les **parents** gèrent les membres, invitations et rôles ; chaque membre **connecté** peut modifier son propre profil (nom, emoji, couleur).
- Les **invitations** peuvent cibler des personnes sans compte (email + nom).
- **Realtime** : tâches, horaires, listes (selon migrations `010`–`012`, `020`).
- Utiliser le **même projet Supabase** en local et en prod pour éviter une base vide ou des migrations manquantes.

## Licence

Exemple d’application SaaS de gestion familiale.
