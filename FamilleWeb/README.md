# FamilleWeb

Application web (Next.js 14 / App Router) pour gérer votre famille, organiser les horaires, coordonner les tâches et partager des listes. Elle s’appuie sur **Supabase** (PostgreSQL + Auth + Realtime).

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

- **Gestion de famille** : création de famille, rôles, invitations
- **Horaires** : agenda par membre + vue famille, import iCal
- **Tâches** : assignation, priorités, statuts
- **Listes partagées** : listes collaboratives avec items cochables
- **Chat IA (serveur)** : chat, streaming, TTS (clé OpenAI côté serveur)
- **Localisation** : lieu sur les événements (Google Maps)
- **Clés API** : gestion de clés pour intégrations / MCP
- **Auth + Realtime** : Supabase Auth et mises à jour en temps réel

## Stack technologique

- **Next.js 14** : Framework React (App Router)
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

## Configuration (variables d'environnement)

Variables utilisées par le code (voir `lib/supabase/*` et `app/api/*`) :

| Variable | Obligatoire | Utilisée où | Description |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | client + serveur | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | client + serveur | Clé publique Supabase (côté client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅* | routes serveur | Requise pour les opérations backend privilégiées (ex. sync iCal, gestion clés API) |
| `OPENAI_API_KEY` | optionnel | routes chat | Active `/api/chat`, `/api/chat/stream`, `/api/chat/tts` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optionnel | UI | Active le sélecteur de lieu Google Maps |

\* `SUPABASE_SERVICE_ROLE_KEY` est nécessaire si vous utilisez :
- `app/api/calendar/sync/route.ts` (synchronisation iCal)
- `app/api/mcp/route.ts` (gestion des clés API / intégrations)

Sécurité :

- **Ne commitez jamais** vos fichiers `.env*`, ni une clé `service_role`.
- Le fichier `appparm` contient des exemples (et peut contenir des valeurs sensibles). **Ne le considérez pas comme une config sûre** et évitez d’y mettre de vraies clés.

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
│   │   └── mcp/                # Gestion des clés API / intégrations
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

## Supabase (base de données & migrations)

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com).
2. **Récupérer les clés** dans *Settings → API* :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Exécuter les migrations** dans *SQL Editor*, **dans l'ordre numérique** (dossier `supabase/migrations/`).

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

Le repo inclut un serveur MCP (Model Context Protocol) dans le dossier `mcp-server/`. Il expose des outils pour interagir avec les données Familles depuis un assistant IA (ex. Cursor) :

- Gestion des tâches (`get_tasks`, `create_task`, `update_task_status`, `delete_task`)
- Gestion de l'agenda (`get_schedules`, `create_schedule`, `delete_schedule`)
- Listes partagées (`get_shared_lists`, `create_shared_list`, `get_shared_list_items`, etc.)
- Clés API (`create_api_key`, `list_api_keys`, `revoke_api_key`, `delete_api_key`)

L'application web expose également une route `app/api/mcp/route.ts` qui sert à gérer des clés API depuis l’interface (création/liste/révocation/suppression). Ce n’est pas le serveur MCP lui‑même : le serveur MCP vit dans `mcp-server/` et communique via **stdio** avec le client MCP.

Voir `mcp-server/README.md` pour l'installation et la configuration.

## Docs du repo

- `archives/plans/GETTING_STARTED.md` : notes de démarrage (Supabase + exécution)
- `archives/plans/GOOGLE_MAPS_SETUP.md` : notes d’activation Google Maps (clé API)
- `OPENAI_SERVER_SETUP.md` : activer le chat côté serveur (clé OpenAI)
- `DOCKER.md` : build et déploiement Docker/Podman
- `CADDY_SETUP.md` : configuration reverse-proxy Caddy
- `PROJET_RECAP.md` : récapitulatif de l'avancement du projet

## Licence

Ce projet est un exemple d'application SaaS pour la gestion de famille.
