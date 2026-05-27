'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, CheckCircle2, Circle, List as ListIcon, X, Package } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import {
  formatProductLabel,
  normalizeUpc,
  parsePriceInput,
} from '@/lib/products'
import {
  filterNewTextLines,
  formatListItemText,
  isProductAlreadyOnList,
  matchLinesToCatalog,
  type CatalogProductRow,
} from '@/lib/catalogList'

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
  product_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  checked_at: string | null
  checked_by: string | null
}

interface CatalogProduct {
  id: string
  name: string
  brand: string | null
  format: string | null
  price: number | null
  upc: string | null
}

interface ProductPlacement {
  aisle: string | null
  comment: string | null
  stores: { name: string } | null
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
  const [bulkLinkProducts, setBulkLinkProducts] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [productSuggestions, setProductSuggestions] = useState<CatalogProduct[]>([])
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [createProductForm, setCreateProductForm] = useState({
    name: '',
    brand: '',
    format: '',
    price: '',
    upc: '',
  })
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null)
  const [detailPlacements, setDetailPlacements] = useState<ProductPlacement[]>([])
  const [missingCatalogLines, setMissingCatalogLines] = useState<string[]>([])
  const [pendingCatalogProducts, setPendingCatalogProducts] = useState<CatalogProductRow[]>([])
  const [showMissingCatalogDialog, setShowMissingCatalogDialog] = useState(false)
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

  const splitLines = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

  const insertCatalogProducts = async (products: CatalogProductRow[]) => {
    if (!selectedList || products.length === 0) return

    const toInsert = products.filter(
      (p) => !isProductAlreadyOnList(items, p.id)
    )

    if (toInsert.length === 0) return

    const rows = toInsert.map((p) => ({
      list_id: selectedList.id,
      text: formatListItemText(p),
      product_id: p.id,
      created_by: user.id,
    }))

    const { error } = await supabase.from('shared_list_items').insert(rows)
    if (error) throw error
  }

  const addItemsFromText = async (text: string, linkProducts = bulkLinkProducts) => {
    if (!selectedList || !text.trim()) return

    setError('')
    setLoading(true)

    try {
      const lines = splitLines(text)

      if (lines.length === 0) {
        setBulkAddText('')
        setLoading(false)
        return
      }

      if (!linkProducts) {
        const newLines = filterNewTextLines(items, lines)
        if (newLines.length > 0) {
          const itemsToAdd = newLines.map((line) => ({
            list_id: selectedList.id,
            text: line,
            created_by: user.id,
          }))
          const { error: insertErr } = await supabase
            .from('shared_list_items')
            .insert(itemsToAdd)
          if (insertErr) throw insertErr
        }
        setBulkAddText('')
        return
      }

      const { missing, matched } = await matchLinesToCatalog(
        supabase,
        familyId,
        lines
      )

      const foundProducts = matched
        .filter((m): m is { line: string; product: CatalogProductRow } => m.product !== null)
        .map((m) => m.product)
        .filter((p) => !isProductAlreadyOnList(items, p.id))

      if (missing.length > 0) {
        setMissingCatalogLines(missing)
        setPendingCatalogProducts(foundProducts)
        setShowMissingCatalogDialog(true)
        setLoading(false)
        return
      }

      await insertCatalogProducts(foundProducts)
      setBulkAddText('')
      setTimeout(() => {
        const el = document.querySelector('textarea[data-bulk-add]') as HTMLTextAreaElement | null
        el?.focus()
      }, 100)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout des éléments')
    } finally {
      setLoading(false)
    }
  }

  const confirmAddFoundCatalogOnly = async () => {
    setShowMissingCatalogDialog(false)
    setLoading(true)
    try {
      await insertCatalogProducts(pendingCatalogProducts)
      setBulkAddText('')
      setMissingCatalogLines([])
      setPendingCatalogProducts([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
    } finally {
      setLoading(false)
    }
  }

  const confirmCreateMissingAndAddAll = async () => {
    if (!selectedList) return
    setShowMissingCatalogDialog(false)
    setLoading(true)
    setError('')
    try {
      await insertCatalogProducts(pendingCatalogProducts)

      for (const line of missingCatalogLines) {
        const { data: productId, error: rpcErr } = await supabase.rpc(
          'resolve_or_create_product',
          {
            p_family_id: familyId,
            p_user_id: user.id,
            p_name: line,
            p_brand: null,
            p_format: null,
            p_price: null,
            p_upc: null,
          }
        )
        if (rpcErr) throw rpcErr

        const { data: product } = await supabase
          .from('products')
          .select('id, name, brand, format, price, upc')
          .eq('id', productId)
          .single()

        if (product && !isProductAlreadyOnList(items, product.id)) {
          await supabase.from('shared_list_items').insert({
            list_id: selectedList.id,
            text: formatListItemText(product as CatalogProductRow),
            product_id: product.id,
            created_by: user.id,
          })
        }
      }

      setBulkAddText('')
      setMissingCatalogLines([])
      setPendingCatalogProducts([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur création produits')
    } finally {
      setLoading(false)
    }
  }

  const searchProducts = useCallback(
    async (query: string) => {
      const q = query.trim()
      if (q.length < 1) {
        setProductSuggestions([])
        return
      }
      const { data } = await supabase
        .from('products')
        .select('id, name, brand, format, price, upc')
        .eq('family_id', familyId)
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%,upc.ilike.%${q}%`)
        .order('name')
        .limit(8)
      setProductSuggestions((data as CatalogProduct[]) || [])
    },
    [familyId, supabase]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      void searchProducts(productSearch)
    }, 200)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  const addProductToList = async (product: CatalogProduct) => {
    if (!selectedList) return

    if (isProductAlreadyOnList(items, product.id)) return

    setLoading(true)
    setError('')
    try {
      const display = formatProductLabel(product)
      const { error } = await supabase.from('shared_list_items').insert({
        list_id: selectedList.id,
        text: display,
        product_id: product.id,
        created_by: user.id,
      })
      if (error) throw error
      setProductSearch('')
      setProductSuggestions([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur ajout produit')
    } finally {
      setLoading(false)
    }
  }

  const createProductAndAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedList || !createProductForm.name.trim()) return

    setLoading(true)
    setError('')
    try {
      const { data: productId, error: rpcErr } = await supabase.rpc(
        'resolve_or_create_product',
        {
          p_family_id: familyId,
          p_user_id: user.id,
          p_name: createProductForm.name.trim(),
          p_brand: createProductForm.brand.trim() || null,
          p_format: createProductForm.format.trim() || null,
          p_price: parsePriceInput(createProductForm.price),
          p_upc: normalizeUpc(createProductForm.upc),
        }
      )

      if (rpcErr) throw rpcErr

      const { data: product } = await supabase
        .from('products')
        .select('id, name, brand, format, price, upc')
        .eq('id', productId)
        .single()

      if (!product) throw new Error('Produit introuvable après création')

      await addProductToList(product as CatalogProduct)
      setShowCreateProduct(false)
      setCreateProductForm({ name: '', brand: '', format: '', price: '', upc: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur création produit')
    } finally {
      setLoading(false)
    }
  }

  const openProductDetail = async (productId: string) => {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, brand, format, price, upc')
      .eq('id', productId)
      .single()

    if (!product) return

    setDetailProduct(product as CatalogProduct)

    const { data: placements } = await supabase
      .from('product_store_placements')
      .select('aisle, comment, stores(name)')
      .eq('product_id', productId)

    setDetailPlacements((placements as ProductPlacement[]) || [])
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
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rechercher un produit du catalogue
                    </label>
                    <input
                      type="search"
                      className="input w-full"
                      placeholder="Nom, marque ou UPC…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    {productSuggestions.filter(
                      (p) => !isProductAlreadyOnList(items, p.id)
                    ).length > 0 && (
                      <ul className="mt-1 border rounded-lg bg-white divide-y max-h-40 overflow-y-auto">
                        {productSuggestions
                          .filter((p) => !isProductAlreadyOnList(items, p.id))
                          .map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                              onClick={() => void addProductToList(p)}
                            >
                              {formatProductLabel(p)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className="text-sm text-primary-600 mt-2"
                      onClick={() => {
                        setCreateProductForm({
                          name: productSearch,
                          brand: '',
                          format: '',
                          price: '',
                          upc: '',
                        })
                        setShowCreateProduct(true)
                      }}
                    >
                      + Créer un produit et l&apos;ajouter
                    </button>
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ajout en masse (une ligne = un élément)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <input
                        type="checkbox"
                        checked={bulkLinkProducts}
                        onChange={(e) => setBulkLinkProducts(e.target.checked)}
                      />
                      Lier au catalogue (uniquement les produits déjà enregistrés)
                    </label>
                    <textarea
                      data-bulk-add
                      value={bulkAddText}
                      onChange={(e) => setBulkAddText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault()
                          void addItemsFromText(bulkAddText)
                        }
                      }}
                      placeholder="Lait
Pain
Oeufs

Ctrl+Entrée pour ajouter"
                      className="input w-full min-h-[100px] resize-y font-mono text-sm"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => void addItemsFromText(bulkAddText, true)}
                        disabled={loading || !bulkAddText.trim()}
                        className="btn btn-primary"
                      >
                        {loading ? 'Vérification…' : 'Ajouter (catalogue)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void addItemsFromText(bulkAddText, false)}
                        disabled={loading || !bulkAddText.trim()}
                        className="btn btn-secondary"
                      >
                        Texte libre seulement
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Ctrl+Entrée = ajout catalogue</p>
                  </div>
                </div>
              )}

              {showCreateProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                  <form
                    onSubmit={createProductAndAdd}
                    className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-3"
                  >
                    <h3 className="font-semibold text-lg">Nouveau produit</h3>
                    <input
                      className="input w-full"
                      placeholder="Nom *"
                      value={createProductForm.name}
                      onChange={(e) =>
                        setCreateProductForm({ ...createProductForm, name: e.target.value })
                      }
                      required
                    />
                    <input
                      className="input w-full"
                      placeholder="Marque"
                      value={createProductForm.brand}
                      onChange={(e) =>
                        setCreateProductForm({ ...createProductForm, brand: e.target.value })
                      }
                    />
                    <input
                      className="input w-full"
                      placeholder="Format"
                      value={createProductForm.format}
                      onChange={(e) =>
                        setCreateProductForm({ ...createProductForm, format: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                        Créer et ajouter
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowCreateProduct(false)}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
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
                            onClick={() => {
                              if (item.product_id) void openProductDetail(item.product_id)
                            }}
                            className={`block select-none text-sm leading-tight ${
                              item.checked
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            } ${item.product_id ? 'cursor-pointer' : 'cursor-pointer'}`}
                            title={
                              item.product_id
                                ? 'Cliquer pour le détail produit'
                                : item.checked
                                  ? ''
                                  : 'Double-cliquez pour modifier'
                            }
                          >
                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                              {item.product_id && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-1 rounded">
                                  <Package className="w-3 h-3" />
                                  catalogue
                                </span>
                              )}
                              {item.text}
                            </span>
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

      {showMissingCatalogDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg mb-2">Produits introuvables</h3>
            <p className="text-sm text-gray-600 mb-3">
              Ces lignes ne correspondent à aucun produit du catalogue (nom exact ou UPC) :
            </p>
            <ul className="text-sm list-disc list-inside mb-4 max-h-32 overflow-y-auto">
              {missingCatalogLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {pendingCatalogProducts.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                {pendingCatalogProducts.length} produit(s) reconnu(s) peuvent être ajoutés.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {pendingCatalogProducts.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => void confirmAddFoundCatalogOnly()}
                  disabled={loading}
                >
                  Ajouter seulement les produits existants
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => void confirmCreateMissingAndAddAll()}
                disabled={loading}
              >
                Créer les manquants et tout ajouter
              </button>
              <button
                type="button"
                className="text-sm text-gray-600"
                onClick={() => {
                  setShowMissingCatalogDialog(false)
                  setMissingCatalogLines([])
                  setPendingCatalogProducts([])
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{formatProductLabel(detailProduct)}</h3>
              <button
                type="button"
                onClick={() => {
                  setDetailProduct(null)
                  setDetailPlacements([])
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailProduct.upc && (
              <p className="text-sm text-gray-600 mb-2">UPC : {detailProduct.upc}</p>
            )}
            <h4 className="text-sm font-medium text-gray-700 mb-2">Emplacements en magasin</h4>
            {detailPlacements.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun magasin associé.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {detailPlacements.map((pl, i) => (
                  <li key={i} className="bg-gray-50 p-2 rounded">
                    <strong>{pl.stores?.name}</strong>
                    {pl.aisle && ` — ${pl.aisle}`}
                    {pl.comment && (
                      <span className="block text-gray-500">{pl.comment}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

