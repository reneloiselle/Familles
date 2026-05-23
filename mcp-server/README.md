# Serveur MCP Familles

Serveur [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) qui expose les données de l’application **Familles** (tâches, agenda, listes partagées) aux assistants IA — notamment dans **Cursor**.

Le serveur communique en **stdio** avec le client MCP et s’appuie sur **Supabase** comme base de données.

## Vue d’ensemble

```
┌──────────────┐     stdio      ┌─────────────────┐     service role    ┌───────────┐
│ Cursor / IA  │ ◄────────────► │  mcp-server     │ ◄─────────────────► │ Supabase  │
│              │   outils MCP   │  (Node.js)      │   + clés API MCP    │           │
└──────────────┘                └─────────────────┘                     └───────────┘
                                       │
                                       │ MCP_API_KEY (optionnel)
                                       ▼
                                Limite l’accès par famille
```

| Composant | Rôle |
|-----------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Connexion serveur → Supabase (requêtes SQL, vérification des clés API) |
| `MCP_API_KEY` | Identité utilisateur côté outils ; limite l’accès à une famille (`scope: family`) |
| `userId` | Alternative à la clé API : UUID Supabase Auth de l’utilisateur |

## Prérequis

- **Node.js** 18+
- **npm**
- Projet **Supabase** avec les tables Familles (`tasks`, `schedules`, `shared_lists`, `family_members`, etc.)
- Clé **service role** Supabase (à garder secrète)

## Installation

```bash
cd mcp-server
npm install
cp env.example .env
# Éditer .env avec vos valeurs Supabase
npm run build
```

### Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` | Oui | URL du projet (Settings → API → Project URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé `service_role` (ne jamais commiter) |
| `MCP_API_KEY` | Non | Clé API Familles (`fml_…`) utilisée par défaut si les outils ne reçoivent pas `apiKey` |

Exemple dans `.env` :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role
MCP_API_KEY=fml_xxxxxxxx_xxxxxxxx   # optionnel
```

### Migration Supabase (clés API)

Pour activer la gestion des clés API, exécuter la migration :

```bash
# Via Supabase CLI ou SQL Editor
migrations/001_create_mcp_api_keys.sql
```

Cela crée les tables `mcp_api_keys` et `mcp_api_key_usage` avec les politiques RLS associées.

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Lance `node dist/index.js` (production) |
| `npm run dev` | Lance avec `tsx` sans compilation préalable |
| `npm run watch` | Recompile automatiquement (`tsc --watch`) |

## Configuration dans Cursor

Ajouter le serveur dans `~/.cursor/mcp.json` (voir aussi `cursor-config.example.json`) :

```json
{
  "mcpServers": {
    "familles": {
      "command": "node",
      "args": ["/chemin/absolu/vers/Familles/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role",
        "MCP_API_KEY": "fml_xxxxxxxx_xxxxxxxx"
      }
    }
  }
}
```

Variante avec npm (depuis le dossier du serveur) :

```json
{
  "mcpServers": {
    "familles": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/chemin/absolu/vers/Familles/mcp-server",
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role"
      }
    }
  }
}
```

Après modification : **redémarrer Cursor**. Le serveur doit apparaître dans la liste des serveurs MCP.

Pour le développement avec rechargement :

```json
"command": "npm",
"args": ["run", "dev"],
"cwd": "/chemin/absolu/vers/Familles/mcp-server"
```

## Authentification

### Clé API (`fml_…`)

Format : `fml_<préfixe>_<secret>`. Seul le hash SHA-256 est stocké en base.

| Scope | Comportement |
|-------|----------------|
| `family` | Accès limité à une famille ; `userId` optionnel pour les opérations nominatives |
| `all` | Accès multi-familles ; `userId` **requis** sur chaque appel |

Création d’une clé (outil MCP ou interface web) : seuls les **parents** peuvent créer une clé `family`.

### Sans clé API

Passer `userId` (UUID Supabase Auth) sur les outils qui le supportent. L’utilisateur doit exister dans `family_members`.

## Outils MCP disponibles

### Tâches

| Outil | Description |
|-------|-------------|
| `get_tasks` | Liste les tâches (`status` : `todo`, `completed`, `all`) |
| `create_task` | Crée une tâche (`title`, `description`, `assignedTo`, `dueDate`) |
| `update_task_status` | Met à jour le statut (`pending`, `in_progress`, `completed`) |
| `delete_task` | Supprime une tâche |

### Agenda

| Outil | Description |
|-------|-------------|
| `get_schedules` | Liste les événements (filtres `date`, `familyMemberId`) |
| `create_schedule` | Crée un événement |
| `delete_schedule` | Supprime un événement |

### Listes partagées

| Outil | Description |
|-------|-------------|
| `get_shared_lists` | Liste les listes d’une famille |
| `create_shared_list` | Crée une liste |
| `get_shared_list_items` | Éléments d’une liste |
| `add_shared_list_items` | Ajoute des éléments (tableau de textes) |
| `toggle_shared_list_item` | Coche / décoche un élément |
| `delete_shared_list_item` | Supprime un élément |
| `delete_shared_list` | Supprime une liste et ses éléments |

### Clés API

| Outil | Description |
|-------|-------------|
| `create_api_key` | Génère une clé (affichée **une seule fois**) |
| `list_api_keys` | Liste les clés (préfixe masqué) |
| `revoke_api_key` | Désactive une clé |
| `delete_api_key` | Supprime définitivement une clé |

Les outils tâches et agenda acceptent `apiKey` en paramètre ou utilisent `MCP_API_KEY` depuis l’environnement.

## Structure du projet

```
mcp-server/
├── src/
│   └── index.ts          # Serveur MCP, outils et logique Supabase
├── dist/                 # Sortie compilée (généré)
├── migrations/
│   └── 001_create_mcp_api_keys.sql
├── env.example           # Modèle de configuration
├── cursor-config.example.json
├── package.json
└── tsconfig.json
```

## Modèles de données (résumé)

**Tâche** : `id`, `family_id`, `title`, `description`, `status` (`todo` à la création), `assigned_to`, `due_date`, `created_by`, `created_at`

**Événement agenda** : `id`, `family_member_id`, `title`, `description`, `date` (YYYY-MM-DD), `start_time`, `end_time` (HH:MM), `created_by`, `created_at`

**Liste partagée** : `id`, `family_id`, `name`, `description`, `color` (hex), `created_by`, `created_at`, `updated_at`

**Élément de liste** : `id`, `list_id`, `text`, `checked`, `quantity`, `notes`, `checked_at`, `checked_by`

## Sécurité

La clé **service role** contourne le RLS Supabase. Le serveur doit donc tourner dans un environnement de confiance.

- Ne jamais commiter `.env`, les clés service role ni les `MCP_API_KEY`
- Préférer des clés API à portée `family` plutôt que `all`
- Révoquer immédiatement toute clé compromise (`revoke_api_key` ou interface web)
- Limiter qui peut lancer ce serveur MCP (accès machine / Cursor)

Pour le détail de l’architecture des clés : [WHY_SERVICE_ROLE_KEY.md](./WHY_SERVICE_ROLE_KEY.md).

## Dépannage

| Problème | Pistes |
|----------|--------|
| Serveur absent dans Cursor | Vérifier le chemin absolu vers `dist/index.js`, redémarrer Cursor |
| Erreur Supabase au démarrage | `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` définis dans `env` du MCP |
| « Utilisateur non trouvé » | L’utilisateur doit être dans `family_members` |
| « Clé API invalide » | Format `fml_*_*`, clé active et non expirée ; migration `mcp_api_keys` appliquée |
| Build échoue | `node --version` ≥ 18, puis `npm install && npm run build` |

## Documentation complémentaire

| Fichier | Contenu |
|---------|---------|
| [INSTALLATION.md](./INSTALLATION.md) | Guide d’installation pas à pas |
| [CURSOR_API_KEY_SETUP.md](./CURSOR_API_KEY_SETUP.md) | Configuration d’une clé API dans Cursor |
| [WHY_SERVICE_ROLE_KEY.md](./WHY_SERVICE_ROLE_KEY.md) | Rôle service role vs clé API |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | État d’avancement des fonctionnalités |
| [SECURITY_PLAN.md](./SECURITY_PLAN.md) | Plan de sécurisation |

## Licence

MIT
