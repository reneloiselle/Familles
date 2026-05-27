'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Plus, Trash2, X, Store, ChevronRight } from 'lucide-react'

interface StoreRow {
  id: string
  family_id: string
  name: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface StoresManagementProps {
  user: User
  familyId: string
}

export function StoresManagement({ user, familyId }: StoresManagementProps) {
  const supabase = useMemo(() => createClient(), [])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StoreRow | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStores = useCallback(async () => {
    setListLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('stores')
        .select('*')
        .eq('family_id', familyId)
        .order('name')

      if (err) {
        if (err.code === '42P01') setError('MIGRATION_PRODUCTS_REQUIRED')
        else throw err
        return
      }
      setStores(data || [])
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    } finally {
      setListLoading(false)
    }
  }, [familyId, supabase])

  useEffect(() => {
    void loadStores()
  }, [loadStores])

  const resetForm = () => {
    setEditing(null)
    setName('')
    setNotes('')
    setShowForm(false)
  }

  const startEdit = (store: StoreRow) => {
    setEditing(store)
    setName(store.name)
    setNotes(store.notes || '')
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editing) {
        const { error: err } = await supabase
          .from('stores')
          .update({ name: name.trim(), notes: notes.trim() || null })
          .eq('id', editing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('stores').insert({
          family_id: familyId,
          name: name.trim(),
          notes: notes.trim() || null,
          created_by: user.id,
        })
        if (err) throw err
      }
      resetForm()
      await loadStores()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce magasin et tous ses emplacements produits ?')) return
    setLoading(true)
    try {
      const { error: err } = await supabase.from('stores').delete().eq('id', id)
      if (err) throw err
      await loadStores()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur suppression')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error === 'MIGRATION_PRODUCTS_REQUIRED'
            ? 'Exécutez les migrations 023–025 (voir MIGRATIONS.md).'
            : error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Store className="w-5 h-5" />
            Magasins
          </h2>
          <button
            type="button"
            className="btn btn-primary p-2"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {showForm && (
          <form onSubmit={save} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <input
              className="input w-full"
              placeholder="Nom du magasin *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="input w-full"
              placeholder="Notes (adresse, horaires…)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                {loading ? '…' : editing ? 'Modifier' : 'Créer'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {listLoading ? (
          <p className="text-gray-500 text-sm">Chargement…</p>
        ) : stores.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun magasin</p>
        ) : (
          <ul className="divide-y">
            {stores.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-3">
                <Link
                  href={`/dashboard/stores/${s.id}`}
                  className="flex-1 flex items-center gap-2 hover:text-primary-600 min-w-0"
                >
                  <span className="font-medium truncate">{s.name}</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className="text-sm text-primary-600 px-2"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  className="text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
