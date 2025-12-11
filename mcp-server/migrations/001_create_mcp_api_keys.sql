-- Migration: Création des tables pour les clés API MCP
-- Date: 2025-12-10
-- Description: Ajoute le support des clés API pour sécuriser l'accès au serveur MCP

-- Table principale pour les clés API
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE, -- Hash SHA-256 de la clé
  key_prefix TEXT NOT NULL, -- Préfixe pour identification (ex: "a3b5c7d9")
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
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_key_hash ON mcp_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_family_id ON mcp_api_keys(family_id);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_scope ON mcp_api_keys(scope);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active ON mcp_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_created_by ON mcp_api_keys(created_by);

-- Table pour le suivi d'utilisation (optionnel)
CREATE TABLE IF NOT EXISTS mcp_api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL, -- Nom de l'outil MCP utilisé
  family_id UUID REFERENCES families(id),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT, -- Adresse IP (optionnel, pour sécurité)
  request_data JSONB, -- Données de la requête (optionnel, pour debugging)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_mcp_api_key_usage_api_key_id ON mcp_api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_mcp_api_key_usage_created_at ON mcp_api_key_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_api_key_usage_family_id ON mcp_api_key_usage(family_id);

-- RLS (Row Level Security) pour mcp_api_keys
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les membres parents de la famille peuvent voir leurs clés
CREATE POLICY "Users can view their family's API keys"
  ON mcp_api_keys FOR SELECT
  USING (
    -- Soit créateur de la clé
    created_by = auth.uid()
    -- Soit parent de la famille
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = mcp_api_keys.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
    -- Soit clé avec scope 'all' (pour admins, à ajuster selon besoins)
    OR scope = 'all'
  );

-- Politique : Seuls les membres parents peuvent créer des clés pour leur famille
CREATE POLICY "Parents can create API keys for their family"
  ON mcp_api_keys FOR INSERT
  WITH CHECK (
    -- Pour scope 'family', doit être parent de la famille
    (scope = 'family' AND EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = mcp_api_keys.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    ))
    -- Pour scope 'all', doit être créateur (à ajuster selon besoins admin)
    OR (scope = 'all' AND created_by = auth.uid())
  );

-- Politique : Seuls les créateurs peuvent modifier leurs clés
CREATE POLICY "Creators can update their API keys"
  ON mcp_api_keys FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Politique : Seuls les créateurs peuvent supprimer leurs clés
CREATE POLICY "Creators can delete their API keys"
  ON mcp_api_keys FOR DELETE
  USING (created_by = auth.uid());

-- RLS pour mcp_api_key_usage (lecture seule pour les créateurs de clés)
ALTER TABLE mcp_api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage of their API keys"
  ON mcp_api_key_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mcp_api_keys
      WHERE mcp_api_keys.id = mcp_api_key_usage.api_key_id
      AND mcp_api_keys.created_by = auth.uid()
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_mcp_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_mcp_api_keys_updated_at
  BEFORE UPDATE ON mcp_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_api_keys_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE mcp_api_keys IS 'Clés API pour l''accès sécurisé au serveur MCP';
COMMENT ON COLUMN mcp_api_keys.key_hash IS 'Hash SHA-256 de la clé API (stocké de manière sécurisée)';
COMMENT ON COLUMN mcp_api_keys.key_prefix IS 'Préfixe de la clé pour identification visuelle';
COMMENT ON COLUMN mcp_api_keys.scope IS 'Portée de la clé: "family" pour une famille spécifique, "all" pour toutes les familles';
COMMENT ON COLUMN mcp_api_keys.is_active IS 'Permet de désactiver une clé sans la supprimer';
COMMENT ON TABLE mcp_api_key_usage IS 'Journal d''utilisation des clés API pour analytics et sécurité';

