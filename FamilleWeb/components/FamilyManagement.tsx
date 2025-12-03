'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Mail, Pencil, X } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { InvitationManager } from './InvitationManager'

interface FamilyMember {
  id: string
  user_id: string | null
  role: 'parent' | 'child'
  email?: string
  name?: string
  invitation_status?: 'pending' | 'accepted' | 'declined'
  avatar_url?: string | null
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

export function FamilyManagement({ user, family, familyMember, familyMembers, isParent }: FamilyManagementProps) {
  const [familyName, setFamilyName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'parent' | 'child'>('child')
  const [memberAvatar, setMemberAvatar] = useState('👤')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const createFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create family
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName, created_by: user.id })
        .select()
        .single()

      if (familyError) throw familyError

      // Add creator as parent
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

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!family) {
      setError('Vous devez d\'abord créer une famille')
      setLoading(false)
      return
    }

    try {
      // Find user by email using the SQL function
      const { data: userIdData, error: findError } = await supabase
        .rpc('find_user_by_email', { user_email: memberEmail })

      if (findError) {
        // User not found
        if (findError.code === 'P0001' || findError.message.includes('not found')) {
          setError('Aucun utilisateur trouvé avec cet email. L\'utilisateur doit créer un compte d\'abord.')
          setLoading(false)
          return
        }
        throw findError
      }

      const userId = userIdData

      if (!userId) {
        setError('Aucun utilisateur trouvé avec cet email. L\'utilisateur doit créer un compte d\'abord.')
        setLoading(false)
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        setError('Cet utilisateur est déjà membre de la famille')
        setLoading(false)
        return
      }

      // Add member to family
      const { error: addError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: userId,
          role: memberRole,
          avatar_url: memberAvatar,
        })

      if (addError) throw addError

      router.refresh()
      setMemberEmail('')
      setMemberRole('child')
      setMemberAvatar('👤')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du membre')
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre de la famille ?')) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du membre')
    } finally {
      setLoading(false)
    }
  }

  const updateMemberAvatar = async (memberId: string, newAvatar: string) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ avatar_url: newAvatar })
        .eq('id', memberId)

      if (error) throw error

      router.refresh()
      setEditingMemberId(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de l\'avatar')
    }
  }

  const EMOJI_OPTIONS = ['👤', '👨', '👩', '👦', '👧', '👶', '👴', '👵', '🐶', '🐱', '🦊', '🐻', '🐼', '🦁', '🦄', '⚽', '🎮', '🎨', '📚', '🎵']

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
        <>
          <InvitationManager user={user} familyId={family.id} />
        </>
      )}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Membres de la famille</h2>
        <div className="space-y-3">
          {familyMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`bg-primary-100 w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer hover:bg-primary-200 transition-colors ${editingMemberId === member.id ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                  >
                    {member.avatar_url || <Mail className="w-5 h-5 text-primary-600" />}
                  </div>
                  {editingMemberId === member.id && (
                    <div className="absolute top-12 left-0 z-10 bg-white shadow-lg rounded-lg p-2 border grid grid-cols-5 gap-1 w-48">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateMemberAvatar(member.id, emoji)
                          }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {member.user_id === user.id
                      ? 'Vous'
                      : member.name
                        ? member.name
                        : member.email
                          ? member.email
                          : `Membre ${member.id.slice(0, 8)}`}
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
              {isParent && member.user_id !== user.id && (
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Retirer ce membre"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

