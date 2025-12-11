'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Key, Copy, Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface ApiKey {
  id: string
  keyPrefix: string
  maskedKey: string
  name: string
  description?: string
  scope: 'family' | 'all'
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  familyId?: string
}

interface Family {
  id: string
  name: string
}

interface ApiKeysManagementProps {
  user: User
  family: Family
}

export function ApiKeysManagement({ user, family }: ApiKeysManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyScope, setNewKeyScope] = useState<'family' | 'all'>('family')
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Non authentifié')
        return
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'list_api_keys',
          familyId: family.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du chargement des clés')
      }

      const data = await response.json()
      setApiKeys(data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des clés')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      setError('Le nom de la clé est requis')
      return
    }

    try {
      setCreating(true)
      setError('')

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Non authentifié')
        return
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_api_key',
          familyId: newKeyScope === 'family' ? family.id : undefined,
          name: newKeyName,
          description: newKeyDescription || undefined,
          scope: newKeyScope,
          expiresAt: newKeyExpiresAt || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création de la clé')
      }

      const data = await response.json()
      setNewKey(data.key)
      setShowCreateForm(false)
      setNewKeyName('')
      setNewKeyDescription('')
      setNewKeyExpiresAt('')
      await loadApiKeys()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la clé')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé ? Elle ne pourra plus être utilisée.')) {
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Non authentifié')
        return
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'revoke_api_key',
          keyId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la révocation de la clé')
      }

      await loadApiKeys()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la révocation de la clé')
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette clé ? Cette action est irréversible.')) {
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Non authentifié')
        return
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete_api_key',
          keyId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression de la clé')
      }

      await loadApiKeys()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la clé')
    }
  }

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeyId(keyId)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Modal pour afficher la nouvelle clé */}
      {newKey && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">⚠️ Clé API créée</h3>
              <button
                onClick={() => setNewKey(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ IMPORTANT: Sauvegardez cette clé maintenant. Elle ne sera plus visible après.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Votre clé API:</label>
                <button
                  onClick={() => copyToClipboard(newKey, 'new-key')}
                  className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
                >
                  {copiedKeyId === 'new-key' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <code className="block text-sm font-mono break-all text-gray-900 bg-white p-2 rounded border">
                {newKey}
              </code>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="btn btn-primary w-full"
            >
              J'ai sauvegardé la clé
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de création */}
      {showCreateForm ? (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Créer une nouvelle clé API</h2>
          <form onSubmit={handleCreateKey} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la clé *
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="input w-full"
                placeholder="Ex: Clé principale Famille Loiselle"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Description de l'utilisation de cette clé..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portée (scope)
              </label>
              <select
                value={newKeyScope}
                onChange={(e) => setNewKeyScope(e.target.value as 'family' | 'all')}
                className="input w-full"
              >
                <option value="family">Famille uniquement ({family.name})</option>
                <option value="all">Toutes les familles (admin)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {newKeyScope === 'family'
                  ? 'Accès limité à cette famille uniquement'
                  : 'Accès à toutes les familles (réservé aux administrateurs)'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'expiration (optionnel)
              </label>
              <input
                type="datetime-local"
                value={newKeyExpiresAt}
                onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                className="input w-full"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Création...' : 'Créer la clé'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewKeyName('')
                  setNewKeyDescription('')
                  setNewKeyExpiresAt('')
                  setError('')
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Créer une nouvelle clé API
        </button>
      )}

      {/* Liste des clés */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Clés API existantes</h2>
        {apiKeys.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Aucune clé API créée pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`border rounded-lg p-4 ${
                  !key.isActive || isExpired(key.expiresAt)
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      {!key.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                          Révoquée
                        </span>
                      )}
                      {isExpired(key.expiresAt) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          Expirée
                        </span>
                      )}
                      {key.scope === 'all' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    {key.description && (
                      <p className="text-sm text-gray-600 mb-2">{key.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Clé: {key.maskedKey}</span>
                      <span>•</span>
                      <span>Créée le {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>Dernière utilisation: {formatDate(key.lastUsedAt)}</span>
                        </>
                      )}
                      {key.expiresAt && (
                        <>
                          <span>•</span>
                          <span className={isExpired(key.expiresAt) ? 'text-red-600' : ''}>
                            Expire le {formatDate(key.expiresAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive && !isExpired(key.expiresAt) && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Révoquer la clé"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer la clé"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

