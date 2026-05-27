'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, CheckCircle2, Circle, List as ListIcon, X } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface SharedList {
  id: string
  family_id: string
  name: string
  description: string | null
  color: string
  created_by: string
  created_at: string
  updated_at: string
}

interface SharedListItem {
  id: string
  list_id: string
  text: string
  checked: boolean
  quantity: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  checked_at: string | null
  checked_by: string | null
}

interface SharedListsManagementProps {
  user: User
  familyId: string
}

function sortItems(items: SharedListItem[]): SharedListItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      return a.checked ? 1 : -1
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export function SharedListsManagement({ user, familyId }: SharedListsManagementProps) {
  const [lists, setLists] = useState<SharedList[]>([])
  const [selectedList, setSelectedList] = useState<SharedList | null>(null)
  const [items, setItems] = useState<SharedListItem[]>([])
  const [showListForm, setShowListForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingList, setEditingList] = useState<SharedList | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')
  const [bulkAddText, setBulkAddText] = useState('')
  const [loading, setLoading] = useState(false)
  const [listsLoading, setListsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [listForm, setListForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  })

  const loadLists = useCallback(async () => {
    if (!familyId) {
      setLists([])
      setListsLoading(false)
      return
    }

    setListsLoading(true)
    try {
      let { data, error } = await supabase
        .from('shared_lists')
        .select('*')
        .eq('family_id', familyId)
        .order('updated_at', { ascending: false })

      if (error?.message?.includes('updated_at')) {
        ;({ data, error } = await supabase
          .from('shared_lists')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false }))
      }

      if (error) {
        if (
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          (error.message?.includes('relation') && error.message?.includes('does not exist')) ||
          error.code === '42P01'
        ) {
          throw new Error('TABLE_NOT_FOUND')
        }
        throw error
      }
      setLists(data || [])
      setError('')
    } catch (err: any) {
      console.error('loadLists:', err)
      if (err.message === 'TABLE_NOT_FOUND') {
        setError('MIGRATION_REQUIRED')
      } else {
        setError(err.message || 'Erreur lors du chargement des listes')
      }
    } finally {
      setListsLoading(false)
    }
  }, [familyId, supabase])

  useEffect(() => {
    void loadLists()

    // Pas de filtre serveur : les DELETE ne passent pas les filtres postgres_changes
    const listsChannel = supabase
      .channel(`shared_lists_changes_${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_lists',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newList = payload.new as SharedList
            if (newList.family_id !== familyId) return
            setLists((prev) => {
              if (prev.some((list) => list.id === newList.id)) return prev
              return [newList, ...prev].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as SharedList
            if (updated.family_id !== familyId) return
            setLists((prev) =>
              prev
                .map((list) => (list.id === updated.id ? updated : list))
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            )
            setSelectedList((current) =>
              current?.id === updated.id ? updated : current
            )
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as SharedList | undefined
            const deletedId = old?.id
            if (!deletedId) return
            if (old?.family_id && old.family_id !== familyId) return
            setLists((prev) => {
              if (!prev.some((list) => list.id === deletedId)) return prev
              return prev.filter((list) => list.id !== deletedId)
            })
            setSelectedList((current) => {
              if (current?.id === deletedId) {
                setItems([])
                return null
              }
              return current
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(listsChannel)
    }
  }, [familyId, supabase, loadLists])

  useEffect(() => {
    if (!selectedList) return

    const listId = selectedList.id
    loadItems(listId)

    // Pas de filtre list_id côté serveur : les événements DELETE ne sont pas émis avec filter
    const itemsChannel = supabase
      .channel(`shared_list_items_${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_list_items',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as SharedListItem
            if (newItem.list_id !== listId) return
            setItems((prev) => {
              if (prev.some((item) => item.id === newItem.id)) return prev
              return sortItems([...prev, newItem])
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as SharedListItem
            if (updated.list_id !== listId) return
            setItems((prev) =>
              sortItems(prev.map((item) => (item.id === updated.id ? updated : item)))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as SharedListItem | undefined)?.id
            if (!deletedId) return
            setItems((prev) => {
              if (!prev.some((item) => item.id === deletedId)) return prev
              return prev.filter((item) => item.id !== deletedId)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(itemsChannel)
    }
  }, [selectedList?.id, supabase])

  const loadItems = async (listId: string) => {
    try {
      const { data, error } = await supabase
        .from('shared_list_items')
        .select('*')
        .eq('list_id', listId)
        .order('checked', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des éléments')
    }
  }

  const createList = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('shared_lists')
        .insert({
          family_id: familyId,
          name: listForm.name,
          description: listForm.description || null,
          color: listForm.color,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      await loadLists()
      setListForm({ name: '', description: '', color: '#3b82f6' })
      setShowListForm(false)
      setSelectedList(data)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la liste')
    } finally {
      setLoading(false)
    }
  }

  const updateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingList) return

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('shared_lists')
        .update({
          name: listForm.name,
          description: listForm.description || null,
          color: listForm.color,
        })
        .eq('id', editingList.id)

      if (error) throw error

      await loadLists()
      if (selectedList?.id === editingList.id) {
        const updatedList = { ...selectedList, ...listForm }
        setSelectedList(updatedList)
      }
      setEditingList(null)
      setListForm({ name: '', description: '', color: '#3b82f6' })
      setShowListForm(false)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const deleteList = async (listId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette liste ?')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('shared_lists')
        .delete()
        .eq('id', listId)

      if (error) throw error

      if (selectedList?.id === listId) {
        setSelectedList(null)
        setItems([])
      }
      await loadLists()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setLoading(false)
    }
  }

  const addItemsFromText = async (text: string) => {
    if (!selectedList || !text.trim()) return

    setError('')
    setLoading(true)

    try {
      // Split by lines and filter empty lines
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      if (lines.length === 0) {
        setBulkAddText('')
        setShowItemForm(false)
        setLoading(false)
        return
      }

      // Create items from each line
      const itemsToAdd = lines.map(text => ({
        list_id: selectedList.id,
        text,
        created_by: user.id,
      }))

      const { error } = await supabase
        .from('shared_list_items')
        .insert(itemsToAdd)

      if (error) throw error

      // Realtime will update the list automatically
      setBulkAddText('')
      // Keep the form open for quick additions
      // Focus back to textarea
      setTimeout(() => {
        document.querySelector('textarea')?.focus()
      }, 100)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout des éléments')
    } finally {
      setLoading(false)
    }
  }

  const startEditItem = (item: SharedListItem) => {
    setEditingItemId(item.id)
    setEditingItemText(item.text)
  }

  const saveEditItem = async (itemId: string) => {
    if (!editingItemText.trim()) {
      // If empty, delete the item
      deleteItem(itemId)
      setEditingItemId(null)
      setEditingItemText('')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('shared_list_items')
        .update({ text: editingItemText.trim() })
        .eq('id', itemId)

      if (error) throw error

      setEditingItemId(null)
      setEditingItemText('')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  const cancelEditItem = () => {
    setEditingItemId(null)
    setEditingItemText('')
  }

  const toggleItem = async (item: SharedListItem) => {
    setError('')
    setLoading(true)

    try {
      const updates: any = {
        checked: !item.checked,
      }

      if (!item.checked) {
        updates.checked_at = new Date().toISOString()
        updates.checked_by = user.id
      } else {
        updates.checked_at = null
        updates.checked_by = null
      }

      const { error } = await supabase
        .from('shared_list_items')
        .update(updates)
        .eq('id', item.id)

      if (error) throw error

      // Realtime will update the list automatically
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('shared_list_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Mise à jour locale immédiate (Realtime synchronise les autres onglets)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setLoading(false)
    }
  }

  const startEditList = (list: SharedList) => {
    setEditingList(list)
    setListForm({
      name: list.name,
      description: list.description || '',
      color: list.color,
    })
    setShowListForm(true)
  }

  const cancelEdit = () => {
    setEditingList(null)
    setListForm({ name: '', description: '', color: '#3b82f6' })
    setShowListForm(false)
  }

  const checkedCount = items.filter(i => i.checked).length
  const totalCount = items.length

  return (
    <div className="space-y-6">
      {error && (
        <div className={`${error === 'MIGRATION_REQUIRED' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-4 rounded-lg`}>
          {error === 'MIGRATION_REQUIRED' ? (
            <div>
              <h3 className="font-semibold mb-2">⚠️ Migration requise</h3>
              <p className="mb-3">
                La table <code className="bg-yellow-100 px-1 rounded">shared_lists</code> n'existe pas encore dans votre base de données.
                Vous devez exécuter la migration <strong>009_add_shared_lists.sql</strong> dans Supabase.
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 text-sm">
                <p className="font-medium mb-2">Comment exécuter la migration :</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Ouvrez votre projet Supabase dans le navigateur</li>
                  <li>Allez dans <strong>SQL Editor</strong> (menu de gauche)</li>
                  <li>Créez une nouvelle requête</li>
                  <li>Copiez le contenu du fichier : <code className="bg-gray-100 px-1 rounded">supabase/migrations/009_add_shared_lists.sql</code></li>
                  <li>Collez-le dans le SQL Editor et cliquez sur <strong>Run</strong></li>
                </ol>
              </div>
            </div>
          ) : (
            error
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Liste des listes */}
        <div className="md:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Listes partagées</h2>
              <button
                onClick={() => {
                  cancelEdit()
                  setShowListForm(!showListForm)
                }}
                className="btn btn-primary p-2"
                title="Créer une liste"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {showListForm && (
              <form
                onSubmit={editingList ? updateList : createList}
                className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <input
                  type="text"
                  placeholder="Nom de la liste"
                  value={listForm.name}
                  onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                  required
                  className="input"
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={listForm.description}
                  onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Couleur:</label>
                  <input
                    type="color"
                    value={listForm.color}
                    onChange={(e) => setListForm({ ...listForm, color: e.target.value })}
                    className="h-8 w-16 rounded border"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                    {loading ? '...' : editingList ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn btn-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {listsLoading ? (
                <p className="text-gray-500 text-sm">Chargement des listes…</p>
              ) : lists.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune liste pour le moment</p>
              ) : (
                lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => {
                      setSelectedList(list)
                      setShowItemForm(false)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${
                      selectedList?.id === list.id
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: list.color || '#3b82f6' }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{list.name}</p>
                          {list.description && (
                            <p className="text-xs text-gray-600 truncate">
                              {list.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditList(list)
                          }}
                          className="text-gray-600 hover:text-primary-600 p-1"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {list.created_by === user.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteList(list.id)
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Contenu de la liste sélectionnée */}
        <div className="md:col-span-2">
          {selectedList ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded"
                      style={{ backgroundColor: selectedList.color || '#3b82f6' }}
                    />
                    {selectedList.name}
                  </h2>
                  {selectedList.description && (
                    <p className="text-gray-600 mt-1">{selectedList.description}</p>
                  )}
                  {totalCount > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {checkedCount} / {totalCount} éléments cochés
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowItemForm(!showItemForm)
                    if (!showItemForm) {
                      // Focus the textarea after a short delay to ensure it's rendered
                      setTimeout(() => {
                        document.querySelector('textarea')?.focus()
                      }, 100)
                    }
                  }}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {showItemForm ? 'Fermer' : 'Ajouter'}
                </button>
              </div>

              {showItemForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ajouter des éléments (une ligne = un élément)
                  </label>
                  <textarea
                    value={bulkAddText}
                    onChange={(e) => setBulkAddText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault()
                        addItemsFromText(bulkAddText)
                      }
                    }}
                    placeholder="Tapez vos éléments ici, un par ligne...

Exemple:
Lait
Pain
Oeufs

Appuyez sur Ctrl+Entrée pour ajouter"
                    className="input w-full min-h-[120px] resize-y font-mono text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addItemsFromText(bulkAddText)}
                      disabled={loading || !bulkAddText.trim()}
                      className="btn btn-primary flex-1"
                    >
                      {loading ? 'Ajout...' : 'Ajouter'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowItemForm(false)
                        setBulkAddText('')
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Astuce: Utilisez Ctrl+Entrée pour ajouter rapidement
                  </p>
                </div>
              )}

              {items.length === 0 && !showItemForm && (
                <div className="text-center py-12">
                  <ListIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Cette liste est vide</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Cliquez sur "Ajouter" pour commencer
                  </p>
                </div>
              )}
              
              {items.length > 0 && (
                <div className="space-y-0">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-1.5 py-0.5 px-1 hover:bg-gray-50 ${
                        item.checked ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleItem(item)}
                        className="flex-shrink-0 -ml-0.5"
                        disabled={loading}
                        aria-label={item.checked ? 'Décocher' : 'Cocher'}
                      >
                        {item.checked ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingItemId === item.id ? (
                          <input
                            type="text"
                            value={editingItemText}
                            onChange={(e) => setEditingItemText(e.target.value)}
                            onBlur={() => saveEditItem(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEditItem(item.id)
                              } else if (e.key === 'Escape') {
                                cancelEditItem()
                              }
                            }}
                            className="input w-full py-0.5 px-1 text-sm h-6"
                            autoFocus
                          />
                        ) : (
                          <label
                            onDoubleClick={() => !item.checked && startEditItem(item)}
                            className={`block cursor-pointer select-none text-sm leading-tight ${
                              item.checked
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                            title={item.checked ? '' : 'Double-cliquez pour modifier'}
                          >
                            {item.text}
                          </label>
                        )}
                      </div>
                      {editingItemId !== item.id && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12">
              <ListIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Sélectionnez une liste pour voir son contenu</p>
              <p className="text-sm text-gray-500 mt-2">
                Ou créez une nouvelle liste à gauche
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

