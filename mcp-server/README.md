# Serveur MCP pour l'application Familles

Ce serveur MCP (Model Context Protocol) permet d'interagir avec les fonctionnalités de l'application Familles via des outils MCP. Il expose des outils pour gérer les tâches, l'agenda et les listes partagées.

## Fonctionnalités

### Tâches
- `get_tasks` - Récupère les tâches d'une famille (avec filtrage par statut)
- `create_task` - Crée une nouvelle tâche
- `update_task_status` - Met à jour le statut d'une tâche
- `delete_task` - Supprime une tâche

### Agenda
- `get_schedules` - Récupère les événements de l'agenda (avec filtrage par date ou membre)
- `create_schedule` - Crée un nouvel événement dans l'agenda
- `delete_schedule` - Supprime un événement

### Listes partagées
- `get_shared_lists` - Récupère toutes les listes partagées d'une famille
- `create_shared_list` - Crée une nouvelle liste partagée
- `get_shared_list_items` - Récupère les éléments d'une liste
- `add_shared_list_items` - Ajoute des éléments à une liste
- `toggle_shared_list_item` - Coche ou décoche un élément
- `delete_shared_list_item` - Supprime un élément
- `delete_shared_list` - Supprime une liste et tous ses éléments

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
```bash
cp .env.example .env
```

Puis éditez `.env` et ajoutez vos credentials Supabase :
- `SUPABASE_URL` : L'URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : La clé service role de Supabase (à garder secrète!)

**Important** : La clé service role permet de contourner les politiques RLS. Assurez-vous de la garder secrète et de ne jamais la commiter dans le dépôt.

## Compilation

```bash
npm run build
```

## Utilisation

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

## Configuration dans Cursor

Pour utiliser ce serveur MCP dans Cursor, ajoutez la configuration suivante dans vos paramètres MCP :

```json
{
  "mcpServers": {
    "familles": {
      "command": "node",
      "args": ["/chemin/vers/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role"
      }
    }
  }
}
```

Ou si vous préférez utiliser npm :
```json
{
  "mcpServers": {
    "familles": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/chemin/vers/mcp-server",
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role"
      }
    }
  }
}
```

## Format des données

### Tâches
Les tâches ont les propriétés suivantes :
- `id` : UUID
- `family_id` : UUID de la famille
- `title` : Titre de la tâche
- `description` : Description (optionnel)
- `status` : `pending`, `in_progress`, ou `completed`
- `assigned_to` : ID du membre de famille assigné (optionnel)
- `due_date` : Date d'échéance au format YYYY-MM-DD (optionnel)
- `created_by` : ID de l'utilisateur créateur
- `created_at` : Date de création

### Agenda
Les événements ont les propriétés suivantes :
- `id` : UUID
- `family_member_id` : UUID du membre de famille
- `title` : Titre de l'événement
- `description` : Description (optionnel)
- `date` : Date au format YYYY-MM-DD
- `start_time` : Heure de début au format HH:MM
- `end_time` : Heure de fin au format HH:MM
- `created_by` : ID de l'utilisateur créateur
- `created_at` : Date de création

### Listes partagées
Les listes ont les propriétés suivantes :
- `id` : UUID
- `family_id` : UUID de la famille
- `name` : Nom de la liste
- `description` : Description (optionnel)
- `color` : Couleur en hexadécimal (ex: #3b82f6)
- `created_by` : ID de l'utilisateur créateur
- `created_at` : Date de création
- `updated_at` : Date de dernière mise à jour

Les éléments de liste ont :
- `id` : UUID
- `list_id` : UUID de la liste parente
- `text` : Texte de l'élément
- `checked` : Boolean indiquant si l'élément est coché
- `quantity` : Quantité (optionnel, ex: "2 kg")
- `notes` : Notes (optionnel)
- `created_by` : ID de l'utilisateur créateur
- `checked_at` : Date de coche (optionnel)
- `checked_by` : ID de l'utilisateur qui a coché (optionnel)

## Sécurité

⚠️ **Attention** : Ce serveur utilise la clé service role de Supabase, qui contourne les politiques RLS (Row Level Security). Assurez-vous de :

1. Ne jamais commiter la clé service role dans le dépôt
2. Utiliser ce serveur uniquement dans un environnement de confiance
3. Limiter l'accès au serveur MCP aux utilisateurs autorisés
4. Envisager d'ajouter une authentification supplémentaire si nécessaire

## Développement

Pour développer et tester le serveur :

```bash
# Mode watch pour recompiler automatiquement
npm run watch

# Dans un autre terminal, mode développement
npm run dev
```

## Licence

MIT

