'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Store } from 'lucide-react'
import { formatProductLabel } from '@/lib/products'

interface StoreDetailViewProps {
  storeId: string
  familyId: string
}

interface PlacementRow {
  id: string
  aisle: string | null
  comment: string | null
  products: {
    id: string
    name: string
    brand: string | null
    format: string | null
  } | null
}

interface StoreInfo {
  id: string
  name: string
  notes: string | null
}

export function StoreDetailView({ storeId, familyId }: StoreDetailViewProps) {
  const supabase = useMemo(() => createClient(), [])
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [placements, setPlacements] = useState<PlacementRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .select('id, name, notes')
        .eq('id', storeId)
        .eq('family_id', familyId)
        .single()

      if (storeErr) throw storeErr
      setStore(storeData)

      const { data: plData, error: plErr } = await supabase
        .from('product_store_placements')
        .select('id, aisle, comment, products(id, name, brand, format)')
        .eq('store_id', storeId)

      if (plErr) throw plErr
      setPlacements((plData as PlacementRow[]) || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [storeId, familyId, supabase])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = [...placements]
    if (q) {
      rows = rows.filter((r) => {
        const p = r.products
        if (!p) return false
        const label = formatProductLabel(p).toLowerCase()
        return (
          label.includes(q) ||
          (r.aisle?.toLowerCase().includes(q) ?? false)
        )
      })
    }
    return rows.sort((a, b) => {
      const aisleA = (a.aisle || 'zzz').toLowerCase()
      const aisleB = (b.aisle || 'zzz').toLowerCase()
      if (aisleA !== aisleB) return aisleA.localeCompare(aisleB, 'fr')
      const nameA = a.products ? formatProductLabel(a.products) : ''
      const nameB = b.products ? formatProductLabel(b.products) : ''
      return nameA.localeCompare(nameB, 'fr')
    })
  }, [placements, search])

  if (loading) {
    return <p className="text-gray-500">Chargement…</p>
  }

  if (error || !store) {
    return (
      <div className="card text-red-600">
        {error || 'Magasin introuvable'}
        <Link href="/dashboard/stores" className="block mt-4 text-primary-600">
          Retour aux magasins
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/stores"
        className="inline-flex items-center gap-2 text-primary-600 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Magasins
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Store className="w-6 h-6" />
          {store.name}
        </h1>
        {store.notes && <p className="text-gray-600 text-sm mb-4">{store.notes}</p>}
        <p className="text-sm text-gray-500 mb-4">
          Mode courses — produits référencés dans ce magasin, triés par rangée.
        </p>
        <input
          type="search"
          className="input w-full max-w-md mb-4"
          placeholder="Filtrer produit ou rangée…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Aucun produit associé à ce magasin. Ajoutez des emplacements depuis la fiche
            produit.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-4">Rangée</th>
                  <th className="py-2 pr-4">Produit</th>
                  <th className="py-2">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      {row.aisle || '—'}
                    </td>
                    <td className="py-2 pr-4">
                      {row.products ? (
                        <Link
                          href="/dashboard/products"
                          className="text-primary-600 hover:underline"
                        >
                          {formatProductLabel(row.products)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{row.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
