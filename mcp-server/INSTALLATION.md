# Guide d'installation du serveur MCP Familles

## Prérequis

- Node.js 18+ installé
- npm ou yarn
- Accès à votre projet Supabase avec la clé service role

## Installation rapide

1. **Installer les dépendances** :
```bash
cd mcp-server
npm install
```

2. **Configurer les variables d'environnement** :
```bash
cp env.example .env
```

Puis éditez le fichier `.env` et ajoutez vos credentials Supabase :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role
```

**Où trouver ces valeurs ?**
- Allez dans votre projet Supabase
- `SUPABASE_URL` : Dans Settings > API > Project URL
- `SUPABASE_SERVICE_ROLE_KEY` : Dans Settings > API > service_role key (⚠️ gardez-la secrète!)

3. **Compiler le projet** :
```bash
npm run build
```

## Configuration dans Cursor

### Option 1 : Configuration via fichier JSON

Ajoutez la configuration suivante dans les paramètres MCP de Cursor (généralement dans `~/.cursor/mcp.json` ou dans les paramètres de Cursor) :

```json
{
  "mcpServers": {
    "familles": {
      "command": "node",
      "args": ["/chemin/absolu/vers/Familles/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role"
      }
    }
  }
}
```

**Important** : Remplacez `/chemin/absolu/vers/Familles` par le chemin absolu réel vers votre projet.

### Option 2 : Utiliser npm directement

Si vous préférez utiliser npm pour lancer le serveur :

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

### Option 3 : Utiliser tsx pour le développement

Pour le développement avec rechargement automatique :

```json
{
  "mcpServers": {
    "familles": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/chemin/absolu/vers/Familles/mcp-server",
      "env": {
        "SUPABASE_URL": "https://votre-projet.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "votre-clé-service-role"
      }
    }
  }
}
```

## Vérification

Après avoir configuré le serveur dans Cursor :

1. Redémarrez Cursor
2. Le serveur MCP devrait apparaître dans la liste des serveurs disponibles
3. Vous pouvez tester en demandant à l'assistant de lister les outils disponibles

## Dépannage

### Le serveur ne démarre pas

- Vérifiez que Node.js est installé : `node --version`
- Vérifiez que les dépendances sont installées : `npm install`
- Vérifiez que le projet est compilé : `npm run build`
- Vérifiez les logs dans Cursor pour voir les erreurs

### Erreur de connexion à Supabase

- Vérifiez que `SUPABASE_URL` est correct (doit commencer par `https://`)
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correct (c'est la clé `service_role`, pas `anon`)
- Vérifiez que votre projet Supabase est actif

### Erreur "Utilisateur non trouvé"

- Assurez-vous que l'utilisateur existe dans Supabase Auth
- Assurez-vous que l'utilisateur est membre d'une famille dans la table `family_members`
- Vérifiez que les politiques RLS permettent l'accès (bien que la clé service role les contourne)

## Sécurité

⚠️ **Important** : La clé service role contourne toutes les politiques de sécurité RLS. 

- Ne partagez jamais cette clé
- Ne la commitez jamais dans le dépôt
- Utilisez-la uniquement dans un environnement de confiance
- Envisagez d'ajouter une authentification supplémentaire si nécessaire

## Support

Pour toute question ou problème, consultez le README.md principal ou ouvrez une issue.

