# FamilleWeb

Application web (Next.js) pour gérer votre famille, organiser les horaires et coordonner les tâches.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technologique](#stack-technologique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration (variables d'environnement)](#configuration-variables-denvironnement)
- [Supabase (base de données & migrations)](#supabase-base-de-données--migrations)
- [Structure du projet](#structure-du-projet)
- [Commandes](#commandes)
- [Docker / Podman](#docker--podman)
- [Serveur MCP](#serveur-mcp)
- [Docs du repo](#docs-du-repo)
- [Licence](#licence)

## Fonctionnalités

- 👨‍👩‍👧‍👦 **Gestion de famille** : Créez votre famille et invitez les membres avec des rôles (parent/enfant)
- 📅 **Horaires synchronisés** : Gérez les horaires de chaque membre avec une vue complète pour les parents
- 🔄 **Synchronisation calendrier** : Importez des calendriers externes via flux iCal (Google Calendar, Apple Calendar…)
- ✅ **Tâches assignées** : Créez et assignez des tâches avec priorité et statut
- 📝 **Listes partagées** : Listes collaboratives (courses, to-do…) avec cases à cocher
- 🤖 **Chat IA** : Assistant côté serveur (texte, streaming, synthèse vocale TTS) — clé OpenAI non exposée
- 📍 **Localisation** : Ajoutez un lieu à vos événements via Google Maps
- 🖼️ **Avatars** : Chaque membre de la famille peut avoir un avatar personnalisé
- 🔑 **Gestion des clés API** : Interface pour gérer vos clés d'intégration directement depuis le dashboard
- 📱 **Interface responsive** : Navigation adaptée mobile (header et sidebar dédiés)
- 🔐 **Authentification sécurisée** : Authentification et invitations via Supabase Auth
- ⚡ **Realtime** : Mises à jour instantanées pour les tâches, les agendas et les listes partagées

## Stack technologique

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique
- **Supabase** : Base de données PostgreSQL, authentification et Realtime
- **Tailwind CSS** : Framework CSS utilitaire
- **node-ical** : Parsing de flux iCal pour la sync calendrier
- **@react-google-maps/api** : Intégration Google Maps pour la localisation
- **react-calendar** : Composant calendrier React
- **lucide-react** : Icônes
- **date-fns** : Utilitaires de manipulation de dates

## Prérequis

- Node.js **18+** (Node **20** recommandé) et npm
- Un compte Supabase (gratuit disponible sur [supabase.com](https://supabase.com))

## Démarrage rapide

1. **Installer les dépendances**

```bash
cd FamilleWeb
npm install
```

2. **Créer le fichier `.env.local`**

Créez un fichier `FamilleWeb/.env.local` et renseignez au minimum Supabase :

```env
# Obligatoire (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici

# Obligatoire pour certaines routes serveur (ex: /api/calendar/sync, /api/mcp)
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici

# Optionnel (chat côté serveur + TTS + streaming)
OPENAI_API_KEY=sk-votre-cle-openai-ici

# Optionnel (sélection de localisation Google Maps côté client)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre-cle-google-maps-ici
```

3. **Lancer l'application**

```bash
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

Note : le script `dev` lance Next avec `-H 0.0.0.0`, donc l'app peut aussi être accessible depuis votre réseau local (selon votre pare-feu).

## Structure du projet

```
FamilleWeb/
├── app/                          # Pages Next.js (App Router)
│   ├── auth/                    # Pages d'authentification
│   ├── dashboard/               # Pages du tableau de bord
│   │   ├── family/             # Gestion de la famille
│   │   ├── schedule/           # Horaires et calendrier
│   │   ├── tasks/              # Tâches
│   │   ├── lists/              # Listes partagées
│   │   └── api-keys/           # Gestion des clés API
│   ├── invitation/             # Acceptation d'invitations
│   │   └── accept/
│   ├── api/                     # Routes API
│   │   ├── calendar/sync/      # Synchronisation iCal
│   │   ├── chat/               # Chat (route principale)
│   │   │   ├── stream/         # Chat en streaming
│   │   │   └── tts/            # Synthèse vocale
│   │   └── mcp/                # Proxy MCP
│   ├── layout.tsx
│   ├── providers.tsx
│   └── page.tsx
├── components/                   # Composants React réutilisables
│   ├── ApiKeysManagement.tsx    # Gestion des clés API
│   ├── CalendarSubscriptionManager.tsx  # Abonnements iCal
│   ├── DashboardLayout.tsx      # Layout du dashboard
│   ├── FamilyManagement.tsx     # Gestion de la famille
│   ├── InvitationManager.tsx    # Invitations
│   ├── LocationPicker.tsx       # Sélection de lieu (Google Maps)
│   ├── LocationViewer.tsx       # Affichage d'un lieu
│   ├── MobileHeader.tsx         # En-tête mobile
│   ├── MobileSidebar.tsx        # Sidebar mobile
│   ├── Navbar.tsx               # Navigation principale
│   ├── ScheduleManagement.tsx   # Gestion des horaires
│   ├── SharedListsManagement.tsx # Listes partagées
│   └── TaskManagement.tsx       # Gestion des tâches
├── lib/                          # Utilitaires et configuration
│   └── supabase/               # Configuration Supabase
├── supabase/                     # Scripts SQL et migrations
│   └── migrations/
└── package.json
```

## Configuration (variables d'environnement)

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase (côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role (routes serveur uniquement, ne jamais exposer) |
| `OPENAI_API_KEY` | Optionnel | Requis pour le chat, le streaming et le TTS |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optionnel | Requis pour la localisation des événements |

Sécurité :

- **Ne commitez jamais** vos fichiers `.env*`.
- Le repo contient un fichier `appparm` avec des exemples de variables. **Ne le considérez pas comme une config sûre**.

## Supabase (base de données & migrations)

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com).
2. **Récupérer les clés** dans *Settings → API* :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Exécuter les migrations** dans *SQL Editor*, **dans l'ordre numérique** :

| Fichier | Description |
|---|---|
| `001_initial_schema.sql` | Schéma initial (families, members, schedules, tasks) |
| `002_add_user_email_function.sql` | Fonction email utilisateur |
| `003_fix_family_members_rls.sql` | Correction RLS membres |
| `004_fix_families_rls.sql` | Correction RLS familles |
| `005_add_invitations_system.sql` | Système d'invitations |
| `006_update_rls_for_members_without_accounts.sql` | RLS membres sans compte |
| `007_fix_invitations_rls_auth_users.sql` | Correction RLS invitations |
| `008_fix_schedules_rls_for_all_members.sql` | RLS agendas pour tous les membres |
| `009_add_shared_lists.sql` | Listes partagées |
| `010_enable_realtime_shared_lists.sql` | Realtime listes partagées |
| `011_enable_realtime_tasks.sql` | Realtime tâches |
| `012_enable_realtime_schedules.sql` | Realtime agendas |
| `013_add_avatar_to_members.sql` | Avatars des membres |
| `014_add_calendar_subscriptions.sql` | Abonnements calendrier iCal |
| `015_update_schedules_for_sync.sql` | Mise à jour schema pour sync iCal |
| `016_add_chat_conversations.sql` | Historique des conversations chat |
| `017_simplify_task_status.sql` | Simplification des statuts de tâches |
| `018_add_task_priority.sql` | Priorités des tâches |
| `019_add_location_to_schedules.sql` | Localisation des événements agenda |

Toutes les tables sont protégées via Row Level Security (RLS).

## Utilisation

1. **Créer un compte** : Inscrivez-vous sur la page d'accueil
2. **Créer une famille** : Une fois connecté, créez votre première famille
3. **Inviter des membres** : Les parents envoient des invitations par email
4. **Gérer les horaires** : Ajoutez des événements avec lieu optionnel, synchronisez des calendriers externes (iCal)
5. **Assigner des tâches** : Créez des tâches avec priorité et assignez-les aux membres
6. **Listes partagées** : Gérez les listes de courses et to-do collaborativement
7. **Chat IA** : Discutez avec l'assistant depuis le dashboard

## Notes importantes

- Les membres doivent avoir un compte existant pour être ajoutés directement ; sinon ils reçoivent une invitation
- Seuls les parents peuvent ajouter/retirer des membres
- Tous les membres peuvent voir les horaires de la famille
- Les parents ont une vue complète de tous les horaires

## Commandes

```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Lancer en production
npm start

# Linter
npm run lint
```

## Docker / Podman

Le projet est prêt pour un build "standalone" Next.js (voir `next.config.js`) et contient :

- `Dockerfile` : image multi-stage (Node 20)
- `podman-compose.yml` + `deploy.sh` : aide au déploiement côté serveur
- Scripts : `build-and-push.sh` (Podman) et `build-and-push-docker.sh` (Docker)

Références :

- Voir `DOCKER.md` pour la construction, le tag et le push d'image, ainsi qu'un exemple d'exécution avec variables d'environnement.
- Voir `CADDY_SETUP.md` si vous utilisez Caddy comme reverse-proxy.

## Serveur MCP

Le projet inclut un serveur MCP (Model Context Protocol) dans le dossier `mcp-server/`. Il expose des outils pour interagir avec les données Familles depuis un assistant IA (ex. Cursor) :

- Gestion des tâches (`get_tasks`, `create_task`, `update_task_status`, `delete_task`)
- Gestion de l'agenda (`get_schedules`, `create_schedule`, `delete_schedule`)
- Listes partagées (`get_shared_lists`, `create_shared_list`, `get_shared_list_items`, etc.)

L'application web expose également une route `/api/mcp` (proxy MCP) pour les intégrations directes.

Voir `mcp-server/README.md` pour l'installation et la configuration.

## Docs du repo

- `GETTING_STARTED.md` : guide de démarrage (Supabase + exécution)
- `GOOGLE_MAPS_SETUP.md` : activer Google Maps (clé API)
- `OPENAI_SERVER_SETUP.md` : activer le chat côté serveur (clé OpenAI)
- `DOCKER.md` : build et déploiement Docker/Podman
- `CADDY_SETUP.md` : configuration reverse-proxy Caddy
- `PROJET_RECAP.md` : récapitulatif de l'avancement du projet

## Licence

Ce projet est un exemple d'application SaaS pour la gestion de famille.
