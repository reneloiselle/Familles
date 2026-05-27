'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Plus, Trash2, Edit2, X, Package, MapPin } from 'lucide-react'
import {
  formatPriceCad,
  formatProductLabel,
  normalizeUpc,
  parsePriceInput,
} from '@/lib/products'

interface Product {
  id: string
  family_id: string
  name: string
  brand: string | null
  format: string | null
  price: number | null
  upc: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface Store {
  id: string
  name: string
}

interface Placement {
  id: string
  product_id: string
  store_id: string
  aisle: string | null
  comment: string | null
  stores?: { name: string } | null
}

interface ProductsManagementProps {
  user: User
  familyId: string
}

const emptyForm = {
  name: '',
  brand: '',
  format: '',
  price: '',
  upc: '',
}

export function ProductsManagement({ user, familyId }: ProductsManagementProps) {
  const supabase = useMemo(() => createClient(), [])
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')

  const [placementForm, setPlacementForm] = useState({
    storeId: '',
    aisle: '',
    comment: '',
  })

  const loadProducts = useCallback(async () => {
    setListLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('family_id', familyId)
        .order('name', { ascending: true })

      if (err) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          setError('MIGRATION_PRODUCTS_REQUIRED')
        } else {
          throw err
        }
        return
      }
      setProducts(data || [])
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur chargement produits')
    } finally {
      setListLoading(false)
    }
  }, [familyId, supabase])

  const loadStores = useCallback(async () => {
    const { data } = await supabase
      .from('stores')
      .select('id, name')
      .eq('family_id', familyId)
      .order('name')
    setStores(data || [])
  }, [familyId, supabase])

  const loadPlacements = useCallback(
    async (productId: string) => {
      const { data, error: err } = await supabase
        .from('product_store_placements')
        .select('*, stores(name)')
        .eq('product_id', productId)
        .order('aisle', { ascending: true, nullsFirst: false })

      if (!err) setPlacements((data as Placement[]) || [])
    },
    [supabase]
  )

  useEffect(() => {
    void loadProducts()
    void loadStores()
  }, [loadProducts, loadStores])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q) ?? false) ||
        (p.upc?.includes(q) ?? false)
    )
  }, [products, search])

  const startCreate = () => {
    setSelected(null)
    setForm(emptyForm)
    setPlacements([])
    setShowForm(true)
  }

  const startEdit = (product: Product) => {
    setSelected(product)
    setForm({
      name: product.name,
      brand: product.brand || '',
      format: product.format || '',
      price: product.price != null ? String(product.price) : '',
      upc: product.upc || '',
    })
    setShowForm(true)
    void loadPlacements(product.id)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        format: form.format.trim() || null,
        price: parsePriceInput(form.price),
        upc: normalizeUpc(form.upc),
      }

      if (selected) {
        const { error: err } = await supabase
          .from('products')
          .update(payload)
          .eq('id', selected.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('products').insert({
          ...payload,
          family_id: familyId,
          created_by: user.id,
        })
        if (err) throw err
      }

      setShowForm(false)
      setSelected(null)
      setForm(emptyForm)
      await loadProducts()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur enregistrement'
      if (msg.includes('products_family_upc_unique')) {
        setError('Ce code UPC existe déjà pour un produit de la famille.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit du catalogue ?')) return
    setLoading(true)
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', id)
      if (err) throw err
      if (selected?.id === id) {
        setSelected(null)
        setShowForm(false)
      }
      await loadProducts()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur suppression')
    } finally {
      setLoading(false)
    }
  }

  const addPlacement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !placementForm.storeId) return

    setLoading(true)
    try {
      const { error: err } = await supabase.from('product_store_placements').insert({
        product_id: selected.id,
        store_id: placementForm.storeId,
        aisle: placementForm.aisle.trim() || null,
        comment: placementForm.comment.trim() || null,
        created_by: user.id,
      })
      if (err) throw err
      setPlacementForm({ storeId: '', aisle: '', comment: '' })
      await loadPlacements(selected.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur emplacement')
    } finally {
      setLoading(false)
    }
  }

  const deletePlacement = async (id: string) => {
    if (!selected) return
    setLoading(true)
    try {
      const { error: err } = await supabase
        .from('product_store_placements')
        .delete()
        .eq('id', id)
      if (err) throw err
      await loadPlacements(selected.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur suppression emplacement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          className={`border px-4 py-4 rounded-lg ${
            error === 'MIGRATION_PRODUCTS_REQUIRED'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {error === 'MIGRATION_PRODUCTS_REQUIRED' ? (
            <p>
              Exécutez les migrations <strong>023</strong> à <strong>025</strong> dans Supabase
              (voir MIGRATIONS.md).
            </p>
          ) : (
            error
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produits
            </h2>
            <button type="button" onClick={startCreate} className="btn btn-primary p-2" title="Nouveau">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input mb-3"
          />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {listLoading ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun produit</p>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded-lg cursor-pointer flex justify-between items-start gap-2 ${
                    selected?.id === p.id && showForm
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => startEdit(p)}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {formatProductLabel(p)}
                    </p>
                    {p.price != null && (
                      <p className="text-xs text-gray-500">{formatPriceCad(p.price)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteProduct(p.id)
                    }}
                    className="text-red-600 p-1 flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {showForm ? (
            <div className="card space-y-6">
              <h2 className="text-xl font-semibold">
                {selected ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <form onSubmit={saveProduct} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nom *</label>
                  <input
                    className="input w-full"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Marque</label>
                    <input
                      className="input w-full"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Format</label>
                    <input
                      className="input w-full"
                      value={form.format}
                      onChange={(e) => setForm({ ...form, format: e.target.value })}
                      placeholder="ex. 2 L, 500 g"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Prix</label>
                    <input
                      className="input w-full"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="ex. 4,99"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">UPC</label>
                    <input
                      className="input w-full"
                      value={form.upc}
                      onChange={(e) => setForm({ ...form, upc: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? '…' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowForm(false)
                      setSelected(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {selected && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" />
                    Où le trouver
                  </h3>
                  {stores.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Créez d&apos;abord un magasin dans la section Magasins.
                    </p>
                  ) : (
                    <form onSubmit={addPlacement} className="grid sm:grid-cols-4 gap-2 mb-4">
                      <select
                        className="input sm:col-span-2"
                        value={placementForm.storeId}
                        onChange={(e) =>
                          setPlacementForm({ ...placementForm, storeId: e.target.value })
                        }
                        required
                      >
                        <option value="">Magasin…</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        placeholder="Rangée"
                        value={placementForm.aisle}
                        onChange={(e) =>
                          setPlacementForm({ ...placementForm, aisle: e.target.value })
                        }
                      />
                      <button type="submit" disabled={loading} className="btn btn-primary">
                        Ajouter
                      </button>
                      <input
                        className="input sm:col-span-4"
                        placeholder="Commentaire (optionnel)"
                        value={placementForm.comment}
                        onChange={(e) =>
                          setPlacementForm({ ...placementForm, comment: e.target.value })
                        }
                      />
                    </form>
                  )}
                  <ul className="space-y-2">
                    {placements.map((pl) => (
                      <li
                        key={pl.id}
                        className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                      >
                        <span>
                          <strong>{pl.stores?.name || 'Magasin'}</strong>
                          {pl.aisle && ` — ${pl.aisle}`}
                          {pl.comment && (
                            <span className="text-gray-500 block">{pl.comment}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => void deletePlacement(pl.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Sélectionnez un produit ou créez-en un nouveau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
