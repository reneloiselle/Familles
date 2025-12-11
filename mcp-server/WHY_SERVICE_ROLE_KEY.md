# Pourquoi la clé SUPABASE_SERVICE_ROLE_KEY est nécessaire

## Rôle de chaque clé

### 🔑 SUPABASE_SERVICE_ROLE_KEY (clé service role)
**Rôle** : Permet au **serveur MCP lui-même** de se connecter à Supabase

**Utilisée pour** :
1. **Créer le client Supabase** (ligne 28 de `index.ts`)
   ```typescript
   const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
   ```

2. **Vérifier les clés API** dans la table `mcp_api_keys` (lignes 99-103)
   ```typescript
   const { data: keyData, error } = await supabase
     .from('mcp_api_keys')
     .select('id, family_id, scope, is_active, expires_at')
     .eq('key_hash', hash)
     .maybeSingle();
   ```

3. **Faire toutes les requêtes à la base de données** (tâches, horaires, listes, etc.)
   - Même après authentification par clé API, le serveur MCP utilise toujours la clé service role pour les requêtes SQL

### 🔐 MCP_API_KEY (votre clé API personnelle)
**Rôle** : Authentifie **vous** (l'utilisateur) et limite l'accès à **votre famille**

**Utilisée pour** :
1. **Authentifier l'utilisateur** qui fait la requête
2. **Limiter l'accès** aux données de votre famille uniquement (scope: family)
3. **Tracker l'utilisation** (dernière utilisation, etc.)

## Architecture de sécurité

```
┌─────────────────┐
│   Vous (Cursor) │
│                 │
│  MCP_API_KEY    │ ← Votre identité et permissions
└────────┬────────┘
         │
         │ Requête MCP
         ▼
┌─────────────────┐
│  Serveur MCP    │
│                 │
│ SERVICE_ROLE    │ ← Connexion à Supabase
│     KEY         │
└────────┬────────┘
         │
         │ 1. Vérifie votre clé API
         │ 2. Limite l'accès à votre famille
         │ 3. Fait les requêtes SQL
         ▼
┌─────────────────┐
│    Supabase     │
│   Database      │
└─────────────────┘
```

## Pourquoi les deux clés sont nécessaires ?

### Analogie : Serveur web
C'est comme un serveur web qui a besoin :
- **D'un compte administrateur** (service role) pour se connecter à la base de données
- **Des identifiants utilisateurs** (clés API) pour savoir qui fait quoi et limiter les accès

### Séparation des responsabilités

1. **SERVICE_ROLE_KEY** = Accès système
   - Le serveur MCP en a besoin pour fonctionner
   - Contourne les politiques RLS (Row Level Security)
   - ⚠️ **DANGEREUSE** si exposée (accès total à la base)

2. **MCP_API_KEY** = Accès utilisateur
   - Limite l'accès à votre famille
   - Peut être révoquée/supprimée facilement
   - ✅ **SÉCURISÉE** (accès limité)

## Sécurité améliorée avec les clés API

### Avant (sans clés API)
- Le serveur MCP utilisait directement la clé service role
- Pas de limitation par famille
- Risque si la clé service role était compromise

### Maintenant (avec clés API)
- Le serveur MCP utilise la clé service role **uniquement pour les opérations système**
- Les clés API **limitent l'accès** aux données de votre famille
- Si une clé API est compromise, vous pouvez la révoquer sans affecter le serveur

## Conclusion

**Vous avez besoin des deux clés** :
- ✅ **SUPABASE_SERVICE_ROLE_KEY** : Pour que le serveur MCP fonctionne (connexion à Supabase)
- ✅ **MCP_API_KEY** : Pour vous authentifier et limiter l'accès à votre famille

C'est une architecture en **deux couches** :
1. **Couche système** (service role) : Le serveur se connecte à Supabase
2. **Couche utilisateur** (clé API) : Vous êtes authentifié et vos accès sont limités

## Recommandations de sécurité

1. **Gardez la SERVICE_ROLE_KEY secrète**
   - Ne la partagez jamais
   - Ne la commitez jamais dans Git
   - Utilisez-la uniquement dans des environnements de confiance

2. **Utilisez les clés API pour les utilisateurs**
   - Créez une clé API par famille/utilisateur
   - Révoquez les clés compromises immédiatement
   - Limitez les dates d'expiration si possible

3. **Surveillez l'utilisation**
   - Vérifiez régulièrement les clés API actives
   - Surveillez les `last_used_at` pour détecter des activités suspectes

