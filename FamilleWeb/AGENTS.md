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

Config locale : `.env.local` (voir `README.md`). Ne pas commiter les fichiers `.env*`.

## Arborescence clé

| Chemin | Usage |
|--------|--------|
| `app/` | Pages et routes API (`app/api/`) |
| `components/` | Composants React du dashboard |
| `lib/supabase/` | Client/serveur Supabase, types DB |
| `supabase/migrations/` | Migrations SQL (ordre numérique) |
| `middleware.ts` | Protection des routes |

Routes API notables : `app/api/chat/`, `app/api/calendar/sync/`, `app/api/mcp/`.

## Conventions code

- **App Router** : Server Components par défaut ; `'use client'` seulement si état, effets ou événements navigateur.
- **Supabase** : `lib/supabase/client.ts` (navigateur), `lib/supabase/server.ts` (SSR / routes API).
- **Styles** : Tailwind ; suivre les patterns des composants existants (`components/`).
- **Dates** : `date-fns` (déjà dans le projet).
- **Icônes** : `lucide-react`.

## Migrations et schéma

- Nouvelle migration : fichier numéroté suivant dans `supabase/migrations/` (ex. `021_…sql`).
- Après changement de schéma : mettre à jour `lib/supabase/database.types.ts` si les types sont maintenus à la main.
- RLS : respecter les politiques existantes ; tester l’accès membre vs parent.

## Realtime

- Abonnements côté client sur les tables activées (voir migrations `*_realtime_*`).
- Problème de synchro listes/tâches : vérifier `REPLICA IDENTITY` / migrations récentes (ex. listes partagées).

## Variables d’environnement

| Variable | Contexte |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + serveur |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Routes API privilégiées uniquement |
| `OPENAI_API_KEY` | Chat / TTS / stream |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Sélecteur de lieu |

## À éviter

- Mettre `service_role` dans un composant client ou `NEXT_PUBLIC_*`.
- Dupliquer la logique métier déjà dans un composant `*Management.tsx` sans raison.
- Modifier `archives/plans/` sauf documentation historique demandée.
