# Statut d'Implémentation - Sécurisation MCP avec API Keys

## ✅ Implémenté

### Phase 1 : Structure de Base de Données
- ✅ Table `mcp_api_keys` créée
- ✅ Table `mcp_api_key_usage` créée (optionnel)
- ✅ Index et RLS configurés
- ✅ Migration SQL appliquée

### Phase 2 : Génération et Vérification des Clés
- ✅ Fonction `generateApiKey()` : Génère des clés au format `fml_<prefix>_<random>`
- ✅ Fonction `verifyApiKeyFormat()` : Vérifie le format et calcule le hash
- ✅ Fonction `authenticateApiKey()` : Authentifie une clé API et vérifie son statut

### Phase 3 : Authentification dans le Serveur MCP
- ✅ Fonction `getUserAndFamilyFromApiKey()` : Obtient la famille à partir d'une clé API
- ✅ Support des scopes `family` et `all`
- ✅ Vérification des permissions par famille

### Phase 4 : Outils de Gestion des Clés API
- ✅ `create_api_key` : Crée une nouvelle clé API
- ✅ `list_api_keys` : Liste les clés API (masquées)
- ✅ `revoke_api_key` : Désactive une clé API
- ✅ `delete_api_key` : Supprime définitivement une clé API

### Phase 5 : Modification des Outils Existants
- ✅ `get_tasks` : Accepte maintenant `apiKey` optionnel
- ✅ `create_task` : Accepte maintenant `apiKey` optionnel
- ⏳ `get_schedules` : À modifier
- ⏳ `create_schedule` : À modifier
- ⏳ Autres outils : À modifier selon besoins

## 📝 Format des Clés API

Format : `fml_<prefix>_<random>`

Exemple : `fml_a3b5c7d9_kJ8mN2pQ5rT9vW3xZ6bC1dF4gH7jK0lM3nP`

- `fml_` : Préfixe fixe (Familles MCP)
- `<prefix>` : 8 caractères aléatoires (pour identification)
- `<random>` : 32 caractères aléatoires (base64url)

## 🔐 Scopes Disponibles

1. **`family`** : Accès limité à une famille spécifique
2. **`all`** : Accès à toutes les familles (réservé aux admins)

## 📋 Utilisation

### Créer une clé API pour une famille

```typescript
{
  "tool": "create_api_key",
  "arguments": {
    "userId": "e217029c-2cc0-4c33-9d3a-27943e5d3738",
    "familyId": "4ff2b35d-830e-4453-8c52-e33b43a5d64f",
    "name": "Clé principale Famille Loiselle",
    "scope": "family",
    "expiresAt": "2026-12-10T00:00:00Z" // Optionnel
  }
}
```

### Utiliser une clé API dans un appel

```typescript
{
  "tool": "create_task",
  "arguments": {
    "apiKey": "fml_a3b5c7d9_kJ8mN2pQ5rT9vW3xZ6bC1dF4gH7jK0lM3nP",
    "userId": "e217029c-2cc0-4c33-9d3a-27943e5d3738",
    "title": "Nouvelle tâche"
  }
}
```

### Ou sans clé API (rétrocompatibilité)

```typescript
{
  "tool": "create_task",
  "arguments": {
    "userId": "e217029c-2cc0-4c33-9d3a-27943e5d3738",
    "title": "Nouvelle tâche"
  }
}
```

## ⚠️ Prochaines Étapes

1. Modifier les autres outils (`get_schedules`, `create_schedule`, etc.) pour accepter les clés API
2. Tester la création et l'utilisation des clés API
3. Documenter l'utilisation dans le README
4. Créer une interface web pour gérer les clés (optionnel)

## 🔒 Sécurité

- ✅ Clés stockées en hash SHA-256 (jamais en clair)
- ✅ Vérification d'expiration
- ✅ Désactivation possible sans suppression
- ✅ RLS (Row Level Security) activé
- ✅ Vérification des permissions par famille

## 📊 Statistiques

Les clés API peuvent être suivies via :
- `last_used_at` : Dernière utilisation
- Table `mcp_api_key_usage` : Journal détaillé (optionnel)

