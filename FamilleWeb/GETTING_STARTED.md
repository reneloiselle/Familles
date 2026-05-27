# Guide de démarrage — FamilleWeb

Guide pas à pas pour lancer l’application en local. Pour le détail des variables d’environnement et du déploiement, voir [README.md](README.md).

## 1. Prérequis

- Node.js **18+** (20 recommandé), npm
- Un projet [Supabase](https://supabase.com)

## 2. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter **toutes** les migrations de [`supabase/migrations/`](supabase/migrations/) **dans l’ordre numérique** (001 → 022). Voir [MIGRATIONS.md](MIGRATIONS.md) pour la liste et le dépannage.
3. Dans **Settings → API**, noter :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, jamais côté client)

## 3. Installation locale

```bash
cd FamilleWeb
npm install
```

Créer **`.env.local`** (ne pas commiter) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon

# Requis pour sync iCal et clés API (/api/calendar/sync, /api/mcp)
SUPABASE_SERVICE_ROLE_KEY=votre_service_role

# Optionnel — chat serveur
OPENAI_API_KEY=sk-...

# Optionnel — lieux sur les horaires
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Utiliser **le même projet Supabase** pour le dev et les données de test ; un `.env` pointant vers un autre projet donne une base vide.

## 4. Lancer l’app

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le script écoute sur `0.0.0.0` (accès réseau local possible).

## 5. Premier parcours

1. **S’inscrire** puis se connecter.
2. **Famille** (`/dashboard/family`) : créer la famille, inviter des membres, définir nom / emoji / couleur pour chaque membre.
3. **Planning** (`/dashboard/planning`) : grille hebdomadaire par membre (couleurs persistées après migration 022).
4. **Horaires** (`/dashboard/schedule`) : vues jour / semaine / mois / famille, abonnements iCal.
5. **Tâches** (`/dashboard/tasks`) : création, assignation, priorités.
6. **Listes** (`/dashboard/lists`) : listes partagées en temps réel (migration 009 requise).

## 6. Problèmes fréquents

- **Membres ou listes invisibles** : migrations manquantes — voir [MIGRATIONS.md](MIGRATIONS.md).
- **Erreur RLS / permission denied** : vérifier que l’utilisateur est bien membre de la famille (`family_members.user_id`).
- **Variables non prises en compte** : fichier `.env.local` à la racine de `FamilleWeb/`, redémarrer `npm run dev`.

Documentation complémentaire : [README.md](README.md), [PROJET_RECAP.md](PROJET_RECAP.md), [AGENTS.md](AGENTS.md).
