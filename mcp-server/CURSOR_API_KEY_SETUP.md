# Configuration de la clé API dans Cursor

## Instructions

Votre clé API a été configurée dans le serveur MCP. Pour l'activer dans Cursor, suivez ces étapes :

### 1. Modifier le fichier de configuration Cursor

Ouvrez le fichier `~/.cursor/mcp.json` et modifiez la section `familles` pour ajouter votre clé API :

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp",
      "headers": {}
    },
    "dart": {
      "type": "stdio",
      "command": "dart",
      "args": ["mcp-server", "--experimental-mcp-server", "--force-roots-fallback"],
      "env": {}
    },
    "familles": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/reneloiselle/repos/sources/Familles/Familles/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://zoremxppfoiatdaxgukx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmVteHBwZm9pYXRkYXhndWt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM1Njk1NywiZXhwIjoyMDc5OTMyOTU3fQ.ivHBIX0Ar_fBRolLjEUTS6zoqnaH65H99donmTewKnU",
        "MCP_API_KEY": "fml_TFIPCUYn_hbkAJ6Bz3rMuLiygACYC4T4y3dgICKYB"
      }
    }
  }
}
```

### 2. Redémarrer Cursor

Après avoir modifié le fichier, **redémarrez complètement Cursor** pour que les changements prennent effet.

### 3. Vérification

Une fois Cursor redémarré, vous pouvez tester en demandant à l'assistant :

- "Liste mes tâches" (sans avoir besoin de spécifier userId)
- "Crée une tâche pour ma famille"
- "Liste mes rendez-vous des 7 prochain jours"

Le serveur MCP utilisera automatiquement votre clé API pour authentifier les requêtes.

## Comment ça fonctionne

- La clé API est stockée dans la variable d'environnement `MCP_API_KEY`
- Le serveur MCP l'utilise automatiquement comme clé par défaut si aucune clé n'est fournie dans les paramètres
- Vous n'avez plus besoin de passer `userId` dans chaque appel (sauf pour certaines opérations spécifiques)
- La clé API limite l'accès à votre famille uniquement (scope: family)

## Sécurité

⚠️ **Important** : 
- Ne partagez jamais votre clé API
- Ne la commitez jamais dans le dépôt
- Si vous pensez qu'elle a été compromise, révoquez-la immédiatement depuis l'interface web (`/dashboard/api-keys`)

