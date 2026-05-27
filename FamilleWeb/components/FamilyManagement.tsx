'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { InvitationManager } from './InvitationManager'
import { MemberAvatar } from './MemberAvatar'
import {
  canEditMember,
  EMOJI_OPTIONS,
  getMemberDisplayName,
  FamilyMemberLike,
} from '@/lib/family/memberDisplay'
import { MEMBER_COLOR_HEX } from '@/lib/schedule/memberColors'
import { isMissingColumnError } from '@/lib/supabase/columnErrors'

interface FamilyMember extends FamilyMemberLike {
  role: 'parent' | 'child'
  invitation_status?: 'pending' | 'accepted' | 'declined'
}

interface Family {
  id: string
  name: string
}

interface FamilyManagementProps {
  user: User
  family: Family | null
  familyMember: any
  familyMembers: FamilyMember[]
  isParent: boolean
}

interface EditForm {
  name: string
  avatar_url: string
  color: string
  role: 'parent' | 'child'
}

export function FamilyManagement({ user, family, familyMember, familyMembers, isParent }: FamilyManagementProps) {
  const [familyName, setFamilyName] = useState('')
  const [editingFamilyName, setEditingFamilyName] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState(family?.name || '')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', avatar_url: '👤', color: MEMBER_COLOR_HEX[0], role: 'child' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const memberIds = familyMembers.map((m) => m.id)

  const createFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName, created_by: user.id })
        .select()
        .single()

      if (familyError) throw familyError

      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: 'parent',
        })

      if (memberError) throw memberError

      router.refresh()
      setFamilyName('')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la famille')
    } finally {
      setLoading(false)
    }
  }

  const updateFamilyName = async () => {
    if (!family || !newFamilyName.trim()) return
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase
        .from('families')
        .update({ name: newFamilyName.trim() })
        .eq('id', family.id)
      if (error) throw error
      router.refresh()
      setEditingFamilyName(false)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du renommage de la famille')
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre de la famille ?')) return
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId)
      if (error) throw error
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du membre')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (member: FamilyMember) => {
    setEditingMemberId(member.id)
    setEditForm({
      name: member.name || '',
      avatar_url: member.avatar_url || '👤',
      color: member.color || MEMBER_COLOR_HEX[0],
      role: member.role,
    })
  }

  const cancelEditing = () => {
    setEditingMemberId(null)
  }

  const saveMember = async (memberId: string) => {
    setError('')
    setLoading(true)
    try {
      const payload: {
        name: string
        avatar_url: string
        color: string
        role?: 'parent' | 'child'
      } = {
        name: editForm.name.trim() || '',
        avatar_url: editForm.avatar_url,
        color: editForm.color,
      }
      if (isParent) {
        payload.role = editForm.role
      }
      let { error } = await supabase
        .from('family_members')
        .update(payload)
        .eq('id', memberId)
      if (error && isMissingColumnError(error) && 'color' in payload) {
        const { color: _color, ...withoutColor } = payload
        ;({ error } = await supabase
          .from('family_members')
          .update(withoutColor)
          .eq('id', memberId))
      }
      if (error) throw error
      router.refresh()
      setEditingMemberId(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du membre')
    } finally {
      setLoading(false)
    }
  }

  if (!family) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Créer une nouvelle famille</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={createFamily} className="space-y-4">
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la famille
            </label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              className="input"
              placeholder="Famille Dupont"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Création...' : 'Créer la famille'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isParent && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Nom de la famille</h2>
            {!editingFamilyName && (
              <button
                type="button"
                onClick={() => {
                  setNewFamilyName(family.name)
                  setEditingFamilyName(true)
                }}
                className="text-primary-600 hover:text-primary-800 p-1"
                title="Renommer la famille"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingFamilyName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="input flex-1"
              />
              <button type="button" onClick={updateFamilyName} disabled={loading} className="btn btn-primary">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditingFamilyName(false)} className="btn btn-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-gray-700">{family.name}</p>
          )}
        </div>
      )}

      {isParent && <InvitationManager user={user} familyId={family.id} memberCount={familyMembers.length} />}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Membres de la famille</h2>
        <div className="space-y-3">
          {familyMembers.map((member) => {
            const editable = canEditMember(member, user.id, isParent)
            const isEditing = editingMemberId === member.id

            return (
              <div
                key={member.id}
                className="p-4 border rounded-lg"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: editForm.color }}
                      >
                        {editForm.avatar_url}
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input"
                          placeholder="Prénom ou surnom"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, avatar_url: emoji })}
                            className={`w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded text-lg ${
                              editForm.avatar_url === emoji ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        {MEMBER_COLOR_HEX.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, color: hex })}
                            className={`w-8 h-8 rounded-full border-2 ${
                              editForm.color === hex ? 'border-gray-800 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="w-8 h-8 cursor-pointer rounded"
                          title="Couleur personnalisée"
                        />
                      </div>
                    </div>

                    {isParent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                        <select
                          value={editForm.role}
                          onChange={(e) =>
                            setEditForm({ ...editForm, role: e.target.value as 'parent' | 'child' })
                          }
                          className="input"
                        >
                          <option value="parent">Parent</option>
                          <option value="child">Enfant</option>
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={cancelEditing} className="btn btn-secondary">
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => saveMember(member.id)}
                        disabled={loading}
                        className="btn btn-primary"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        member={member}
                        currentUserId={user.id}
                        memberIds={memberIds}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">
                          {getMemberDisplayName(member, user.id)}
                          {!member.user_id && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Sans compte
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {member.role === 'parent' ? 'Parent' : 'Enfant'}
                          {member.email && member.name && ` • ${member.email}`}
                          {member.invitation_status === 'pending' && (
                            <span className="ml-2 text-yellow-600">(Invitation en attente)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => startEditing(member)}
                          className="text-primary-600 hover:text-primary-800 p-2"
                          title="Modifier le membre"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                      {isParent && member.user_id !== user.id && (
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Retirer ce membre"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
