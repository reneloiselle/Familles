# FamilleWeb

Application web (Next.js) pour gérer votre famille, organiser les horaires et coordonner les tâches.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technologique](#stack-technologique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration (variables d’environnement)](#configuration-variables-denvironnement)
- [Supabase (base de données & migrations)](#supabase-base-de-données--migrations)
- [Commandes](#commandes)
- [Docker / Podman](#docker--podman)
- [Docs du repo](#docs-du-repo)
- [Licence](#licence)

## Fonctionnalités

- 👨‍👩‍👧‍👦 **Gestion de famille** : Créez votre famille et invitez les membres avec des rôles (parent/enfant)
- 📅 **Horaires synchronisés** : Gérez les horaires de chaque membre avec une vue complète pour les parents
- ✅ **Tâches assignées** : Créez et assignez des tâches aux membres de la famille
- 🔐 **Authentification sécurisée** : Authentification via Supabase Auth
- 🤖 **Chat (optionnel)** : API côté serveur (clé OpenAI non exposée au navigateur)
- 📍 **Localisation (optionnel)** : Sélection de lieux via Google Maps

## Stack technologique

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique pour une meilleure maintenabilité
- **Supabase** : Base de données PostgreSQL et authentification
- **Tailwind CSS** : Framework CSS utilitaire pour le design

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

# Optionnel (chat côté serveur)
OPENAI_API_KEY=sk-votre-cle-openai-ici

# Optionnel (sélection de localisation Google Maps côté client)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre-cle-google-maps-ici
```

3. **Lancer l’application**

```bash
npm run dev
```

L’application est accessible sur `http://localhost:3000`.

Note : le script `dev` lance Next avec `-H 0.0.0.0`, donc l’app peut aussi être accessible depuis votre réseau local (selon votre pare-feu).

## Structure du projet

```
FamilleWeb/
├── app/                      # Pages Next.js (App Router)
│   ├── auth/                # Pages d'authentification
│   ├── dashboard/           # Pages du tableau de bord
│   ├── api/                 # Routes API (chat, sync calendrier, etc.)
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Page d'accueil
├── components/              # Composants React réutilisables
├── lib/                     # Utilitaires et configuration
│   └── supabase/           # Configuration Supabase
├── supabase/               # Scripts SQL et migrations
│   └── migrations/         # Migrations de base de données
└── package.json
```

## Configuration (variables d’environnement)

- **`NEXT_PUBLIC_SUPABASE_URL`** et **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** : requis pour l’auth et l’accès Supabase côté client/serveur.
- **`SUPABASE_SERVICE_ROLE_KEY`** : requis pour certaines routes serveur qui doivent accéder à Supabase en “service role” (ne jamais l’exposer au client).
- **`OPENAI_API_KEY`** : requis uniquement si vous utilisez le chat (`/api/chat`, `/api/chat/tts`, `/api/chat/stream`).
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** : requis uniquement si vous utilisez la sélection/visualisation de localisation.

Sécurité :

- **Ne commitez jamais** vos fichiers `.env*`.
- Le repo contient un fichier `appparm` avec des exemples de variables. **Ne le considérez pas comme une config sûre** et ne copiez pas de clés réelles depuis/vers Git.

## Supabase (base de données & migrations)

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com).
2. **Récupérer les clés** dans *Settings → API* :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Exécuter les migrations** dans *SQL Editor* :
   - Exécutez **tous** les fichiers `.sql` dans `supabase/migrations/` **dans l’ordre numérique** (`001_...`, `002_...`, etc.).

Le schéma inclut notamment :

- **families** : Familles créées
- **family_members** : Membres de chaque famille avec leurs rôles
- **schedules** : Horaires de chaque membre
- **tasks** : Tâches assignées aux membres
- **invitations / shared lists / realtime** : selon les migrations ultérieures

Toutes les tables sont protégées via Row Level Security (RLS).

## Utilisation

1. **Créer un compte** : Inscrivez-vous sur la page d'accueil
2. **Créer une famille** : Une fois connecté, créez votre première famille
3. **Ajouter des membres** : Les parents peuvent ajouter des membres à la famille
4. **Gérer les horaires** : Ajoutez des événements dans les agendas
5. **Assigner des tâches** : Créez et assignez des tâches aux membres

## Notes importantes

- Les membres doivent avoir un compte existant pour être ajoutés à une famille
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

Le projet est prêt pour un build “standalone” Next.js (voir `next.config.js`) et contient :

- `Dockerfile` : image multi-stage (Node 20)
- `podman-compose.yml` + `deploy.sh` : aide au déploiement côté serveur
- Scripts : `build-and-push.sh` (Podman) et `build-and-push-docker.sh` (Docker)

Références :

- Voir `DOCKER.md` pour la construction, le tag et le push d’image, ainsi qu’un exemple d’exécution avec variables d’environnement.
- Voir `CADDY_SETUP.md` si vous utilisez Caddy comme reverse-proxy.

## Docs du repo

- `GETTING_STARTED.md` : guide de démarrage (Supabase + exécution)
- `GOOGLE_MAPS_SETUP.md` : activer Google Maps (clé API)
- `OPENAI_SERVER_SETUP.md` : activer le chat côté serveur (clé OpenAI)
- `REALTIME_SETUP.md` / `REALTIME_RESUME.md` : notes sur le realtime
- `INVITATIONS_GUIDE.md` / `INVITATIONS_SUMMARY.md` : invitations
- `SHARED_LISTS_GUIDE.md` : listes partagées

## Licence

Ce projet est un exemple d'application SaaS pour la gestion de famille.

