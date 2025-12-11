# Plan de Sécurisation du Serveur MCP avec API Keys par Famille

## Vue d'ensemble

Ce plan décrit l'implémentation d'un système de clés API pour sécuriser le serveur MCP, permettant de générer des clés pour une famille spécifique ou pour toutes les familles selon les besoins.

## Objectifs

1. **Sécurité** : Empêcher l'accès non autorisé au serveur MCP
2. **Isolation** : Limiter l'accès par famille (ou toutes les familles)
3. **Traçabilité** : Suivre l'utilisation des clés API
4. **Gestion** : Permettre la création, révocation et rotation des clés

---

## Phase 1 : Structure de Base de Données

### 1.1 Table `mcp_api_keys`

Créer une nouvelle table pour stocker les clés API :

```sql
CREATE TABLE mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE, -- Hash de la clé (SHA-256)
  key_prefix TEXT NOT NULL, -- Préfixe pour identification (ex: "fml_xxxx")
  name TEXT NOT NULL, -- Nom descriptif de la clé
  description TEXT, -- Description optionnelle
  scope TEXT NOT NULL CHECK (scope IN ('family', 'all')), -- Portée de la clé
  is_active BOOLEAN DEFAULT true, -- Permet de désactiver sans supprimer
  last_used_at TIMESTAMPTZ, -- Dernière utilisation
  expires_at TIMESTAMPTZ, -- Date d'expiration optionnelle
  created_by UUID REFERENCES auth.users(id), -- Utilisateur créateur
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_mcp_api_keys_key_hash ON mcp_api_keys(key_hash);
CREATE INDEX idx_mcp_api_keys_family_id ON mcp_api_keys(family_id);
CREATE INDEX idx_mcp_api_keys_scope ON mcp_api_keys(scope);
CREATE INDEX idx_mcp_api_keys_active ON mcp_api_keys(is_active) WHERE is_active = true;

-- RLS (Row Level Security)
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les membres parents de la famille peuvent voir leurs clés
CREATE POLICY "Users can view their family's API keys"
  ON mcp_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = mcp_api_keys.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
  );

-- Politique : Seuls les membres parents peuvent créer des clés pour leur famille
CREATE POLICY "Parents can create API keys for their family"
  ON mcp_api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = mcp_api_keys.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
  );

-- Politique : Seuls les créateurs peuvent modifier/supprimer leurs clés
CREATE POLICY "Creators can update their API keys"
  ON mcp_api_keys FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their API keys"
  ON mcp_api_keys FOR DELETE
  USING (created_by = auth.uid());
```

### 1.2 Table `mcp_api_key_usage` (Optionnel - pour analytics)

```sql
CREATE TABLE mcp_api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL, -- Nom de l'outil MCP utilisé
  family_id UUID REFERENCES families(id),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT, -- Adresse IP (optionnel)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_api_key_usage_api_key_id ON mcp_api_key_usage(api_key_id);
CREATE INDEX idx_mcp_api_key_usage_created_at ON mcp_api_key_usage(created_at);
```

---

## Phase 2 : Génération et Hachage des Clés API

### 2.1 Format des Clés API

Format proposé : `fml_<prefix>_<random>`

- `fml_` : Préfixe fixe (Familles MCP)
- `<prefix>` : 8 caractères aléatoires (pour identification visuelle)
- `<random>` : 32 caractères aléatoires (base64url)

Exemple : `fml_a3b5c7d9_kJ8mN2pQ5rT9vW3xZ6bC1dF4gH7jK0lM3nP6qS`

### 2.2 Fonction de Génération

```typescript
import crypto from 'crypto';

function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Générer le préfixe (8 caractères)
  const prefix = crypto.randomBytes(6).toString('base64url').substring(0, 8);
  
  // Générer la partie aléatoire (32 caractères)
  const random = crypto.randomBytes(24).toString('base64url').substring(0, 32);
  
  // Clé complète
  const key = `fml_${prefix}_${random}`;
  
  // Hash SHA-256 pour stockage sécurisé
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  return { key, hash, prefix };
}
```

### 2.3 Fonction de Vérification

```typescript
function verifyApiKey(providedKey: string): string | null {
  // Vérifier le format
  if (!providedKey.startsWith('fml_') || providedKey.split('_').length !== 3) {
    return null;
  }
  
  // Calculer le hash
  const hash = crypto.createHash('sha256').update(providedKey).digest('hex');
  
  return hash;
}
```

---

## Phase 3 : Authentification dans le Serveur MCP

### 3.1 Middleware d'Authentification

Modifier le serveur MCP pour accepter une clé API dans les paramètres :

```typescript
// Nouvelle fonction d'authentification
async function authenticateApiKey(apiKey: string): Promise<{
  isValid: boolean;
  familyId?: string;
  scope?: 'family' | 'all';
  keyId?: string;
}> {
  const hash = verifyApiKey(apiKey);
  if (!hash) {
    return { isValid: false };
  }
  
  // Chercher la clé dans la base de données
  const { data: keyData, error } = await supabase
    .from('mcp_api_keys')
    .select('id, family_id, scope, is_active, expires_at')
    .eq('key_hash', hash)
    .maybeSingle();
  
  if (error || !keyData) {
    return { isValid: false };
  }
  
  // Vérifier si la clé est active
  if (!keyData.is_active) {
    return { isValid: false };
  }
  
  // Vérifier l'expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { isValid: false };
  }
  
  // Mettre à jour last_used_at
  await supabase
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);
  
  return {
    isValid: true,
    familyId: keyData.family_id,
    scope: keyData.scope,
    keyId: keyData.id,
  };
}

// Modifier getUserAndFamily pour accepter une clé API
async function getUserAndFamilyFromApiKey(
  apiKey: string,
  requestedUserId?: string
): Promise<{
  familyMember?: any;
  familyId: string;
  family?: any;
  scope: 'family' | 'all';
}> {
  const auth = await authenticateApiKey(apiKey);
  
  if (!auth.isValid) {
    throw new Error('Clé API invalide ou expirée');
  }
  
  // Si scope = 'all', permettre l'accès à toutes les familles
  if (auth.scope === 'all') {
    if (!requestedUserId) {
      throw new Error('userId requis pour les clés avec scope "all"');
    }
    return getUserAndFamily(requestedUserId);
  }
  
  // Si scope = 'family', limiter à la famille de la clé
  if (auth.scope === 'family') {
    const { data: family, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', auth.familyId)
      .single();
    
    if (error || !family) {
      throw new Error('Famille non trouvée');
    }
    
    // Si userId fourni, vérifier qu'il appartient à cette famille
    if (requestedUserId) {
      const { data: member } = await supabase
        .from('family_members')
        .select('*, families(*)')
        .eq('user_id', requestedUserId)
        .eq('family_id', auth.familyId)
        .maybeSingle();
      
      if (!member) {
        throw new Error('Utilisateur n\'appartient pas à cette famille');
      }
      
      return {
        familyMember: member,
        familyId: auth.familyId!,
        family: member.families,
        scope: 'family',
      };
    }
    
    return {
      familyId: auth.familyId!,
      family,
      scope: 'family',
    };
  }
  
  throw new Error('Scope invalide');
}
```

### 3.2 Modification des Outils MCP

Modifier chaque outil pour accepter une clé API :

```typescript
case 'create_task': {
  const { apiKey, userId, title, description, assignedTo, dueDate } = args;
  
  // Authentifier avec la clé API
  const { familyId, scope } = await getUserAndFamilyFromApiKey(apiKey, userId);
  
  // Créer la tâche...
}
```

---

## Phase 4 : Outils de Gestion des Clés API

### 4.1 Nouveaux Outils MCP

Ajouter des outils pour gérer les clés API :

```typescript
{
  name: 'create_api_key',
  description: 'Crée une nouvelle clé API pour une famille',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'ID de l\'utilisateur créateur' },
      familyId: { type: 'string', description: 'ID de la famille (optionnel si scope=all)' },
      name: { type: 'string', description: 'Nom de la clé' },
      description: { type: 'string', description: 'Description optionnelle' },
      scope: { type: 'string', enum: ['family', 'all'], description: 'Portée de la clé' },
      expiresAt: { type: 'string', description: 'Date d\'expiration (ISO 8601, optionnel)' },
    },
    required: ['userId', 'name', 'scope'],
  },
},
{
  name: 'list_api_keys',
  description: 'Liste les clés API d\'une famille',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      familyId: { type: 'string', description: 'Optionnel, filtre par famille' },
    },
    required: ['userId'],
  },
},
{
  name: 'revoke_api_key',
  description: 'Révoque (désactive) une clé API',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      keyId: { type: 'string', description: 'ID de la clé à révoquer' },
    },
    required: ['userId', 'keyId'],
  },
},
{
  name: 'delete_api_key',
  description: 'Supprime définitivement une clé API',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      keyId: { type: 'string' },
    },
    required: ['userId', 'keyId'],
  },
},
```

### 4.2 Implémentation des Outils

```typescript
case 'create_api_key': {
  const { userId, familyId, name, description, scope, expiresAt } = args;
  
  // Vérifier les permissions
  if (scope === 'family' && !familyId) {
    throw new Error('familyId requis pour scope "family"');
  }
  
  if (scope === 'all') {
    // Vérifier que l'utilisateur est admin (à implémenter)
    // Pour l'instant, on peut limiter aux parents
  }
  
  // Générer la clé
  const { key, hash, prefix } = generateApiKey();
  
  // Insérer dans la base de données
  const { data, error } = await supabase
    .from('mcp_api_keys')
    .insert({
      family_id: scope === 'family' ? familyId : null,
      key_hash: hash,
      key_prefix: prefix,
      name,
      description: description || null,
      scope,
      expires_at: expiresAt || null,
      created_by: userId,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Retourner la clé (seule fois où elle est visible)
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: data.id,
        key: key, // ⚠️ À afficher une seule fois
        name: data.name,
        scope: data.scope,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        warning: '⚠️ IMPORTANT: Sauvegardez cette clé maintenant. Elle ne sera plus visible après.',
      }, null, 2),
    }],
  };
}
```

---

## Phase 5 : Interface Utilisateur (Optionnel)

### 5.1 Page Web de Gestion

Créer une page dans l'application web pour gérer les clés API :

- Liste des clés existantes
- Création de nouvelles clés
- Révoquer/Supprimer des clés
- Voir les statistiques d'utilisation

### 5.2 Composant React

```typescript
// FamilleWeb/app/api-keys/page.tsx
export default function ApiKeysPage() {
  // Interface pour gérer les clés API
  // - Liste avec masquage des clés (afficher seulement le préfixe)
  // - Bouton pour créer une nouvelle clé
  // - Modal pour afficher la clé complète (une seule fois)
  // - Actions pour révoquer/supprimer
}
```

---

## Phase 6 : Sécurité et Bonnes Pratiques

### 6.1 Mesures de Sécurité

1. **Hachage** : Stocker uniquement le hash SHA-256, jamais la clé en clair
2. **Expiration** : Permettre la définition de dates d'expiration
3. **Rotation** : Faciliter la rotation des clés (créer nouvelle, révoquer ancienne)
4. **Rate Limiting** : Limiter le nombre de requêtes par clé (à implémenter)
5. **Logging** : Logger toutes les tentatives d'authentification (succès/échec)
6. **Validation** : Valider le format des clés avant traitement

### 6.2 Recommandations

- **Clés par famille** : Pour un usage normal, une clé par famille
- **Clés "all"** : Réservées aux administrateurs/backup
- **Rotation** : Changer les clés régulièrement (tous les 90 jours)
- **Révocation immédiate** : En cas de compromission, révoquer immédiatement
- **Stockage sécurisé** : Les clés doivent être stockées de manière sécurisée côté client

### 6.3 Migration

1. Créer les tables de base de données
2. Ajouter les fonctions de génération/vérification
3. Modifier le serveur MCP pour accepter les clés API
4. Créer des outils de gestion
5. Documenter le nouveau système
6. Migrer les utilisations existantes (si nécessaire)

---

## Phase 7 : Configuration Cursor

### 7.1 Nouvelle Configuration

Modifier la configuration Cursor pour inclure la clé API :

```json
{
  "mcpServers": {
    "familles": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/reneloiselle/repos/sources/Familles/Familles/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://zoremxppfoiatdaxgukx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "MCP_API_KEY": "fml_a3b5c7d9_kJ8mN2pQ5rT9vW3xZ6bC1dF4gH7jK0lM3nP"
      }
    }
  }
}
```

### 7.2 Alternative : Paramètre dans les Appels

Au lieu d'une variable d'environnement, passer la clé dans chaque appel d'outil.

---

## Ordre d'Implémentation Recommandé

1. ✅ **Phase 1** : Créer les tables de base de données
2. ✅ **Phase 2** : Implémenter la génération et vérification des clés
3. ✅ **Phase 3** : Modifier l'authentification du serveur MCP
4. ✅ **Phase 4** : Ajouter les outils de gestion
5. ⏳ **Phase 5** : Interface utilisateur (optionnel)
6. ✅ **Phase 6** : Tests de sécurité
7. ✅ **Phase 7** : Documentation et migration

---

## Exemple d'Utilisation

### Créer une clé pour une famille

```typescript
// Via l'outil MCP
{
  "tool": "create_api_key",
  "arguments": {
    "userId": "e217029c-2cc0-4c33-9d3a-27943e5d3738",
    "familyId": "4ff2b35d-830e-4453-8c52-e33b43a5d64f",
    "name": "Clé principale Famille Loiselle",
    "scope": "family",
    "expiresAt": "2026-12-10T00:00:00Z"
  }
}
```

### Utiliser la clé dans un appel

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

---

## Notes Importantes

- ⚠️ **Sécurité** : La clé API doit être traitée comme un mot de passe
- ⚠️ **Stockage** : Ne jamais commiter les clés API dans le dépôt
- ⚠️ **Rotation** : Planifier la rotation régulière des clés
- ⚠️ **Monitoring** : Surveiller l'utilisation des clés pour détecter les anomalies

