# Familles — instructions agents

Monorepo de gestion familiale : **FamilleWeb** (Next.js), **FamilleMobile** (Flutter), **mcp-server** (MCP Node.js). Base partagée **Supabase** (PostgreSQL, Auth, Realtime).

## Langue et communication

- Répondre en **français** sauf demande contraire.
- Libellés UI, messages utilisateur et commentaires métier : **français**.
- Identifiants code (variables, tables, routes API) : anglais, comme le code existant.

## Principes de travail

- **Changements minimaux** : corriger le problème demandé sans refactoriser le reste.
- **Conventions existantes** : lire le code voisin avant d’ajouter du code ; réutiliser services/composants existants.
- **Pas de sur-ingénierie** : pas d’abstractions pour un seul usage ; pas de tests triviaux sauf demande.
- **Commits Git** : ne créer un commit que si l’utilisateur le demande explicitement.

## Structure du dépôt

| Dossier | Rôle | AGENTS.md |
|---------|------|-----------|
| `FamilleWeb/` | App web Next.js 14, migrations SQL | Oui |
| `FamilleMobile/` | App Flutter Android/iOS | Oui |
| `mcp-server/` | Serveur MCP (outils IA → Supabase) | Oui |

Fichiers utiles : `FamilleWeb/README.md`, `FamilleWeb/PROJET_RECAP.md`, README de chaque sous-projet.

**Skills agents (FamilleWeb)** : `FamilleWeb/.agents/skills/` — documentation Syncfusion React pour Cursor (66 skills, voir `SKILL.md` par composant). Détails dans `FamilleWeb/AGENTS.md`.

## Sécurité (obligatoire)

- **Ne jamais** commiter `.env`, `.env.local`, `appparm` avec de vraies clés, ni `SUPABASE_SERVICE_ROLE_KEY`.
- Ne pas exposer la clé `service_role` côté client (web ou mobile).
- Les clés API MCP (`fml_…`) et OpenAI restent côté serveur ou config locale.

## Base de données Supabase

- Schéma et migrations : `FamilleWeb/supabase/migrations/` — appliquer **dans l’ordre numérique** des fichiers.
- Types générés / référence : `FamilleWeb/lib/supabase/database.types.ts`.
- Realtime : tables concernées (tâches, listes, horaires) — vérifier les migrations Realtime avant de déboguer la synchro.

## Outils MCP (Cursor)

- **Supabase** : migrations, logs, schéma — privilégier en cas de changement DB.
- **Dart** : exploration packages Flutter si besoin.

## Domaine métier (rappel)

- **Famille** : membres, rôles parent/enfant, invitations.
- **Horaires** : agenda personnel + vue famille, sync iCal.
- **Tâches** : assignation, statuts, échéances.
- **Listes partagées** : listes collaboratives avec items cochables.
