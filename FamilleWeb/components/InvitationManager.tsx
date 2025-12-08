'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Send, X, CheckCircle2, Clock } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface Invitation {
  id: string
  email: string
  role: 'parent' | 'child'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token: string
  created_at: string
  expires_at: string
  family_member_id: string | null
}

interface InvitationManagerProps {
  user: User
  familyId: string
}

export function InvitationManager({ user, familyId }: InvitationManagerProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'parent' | 'child'>('child')
  const [inviteName, setInviteName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadInvitations()
  }, [familyId])

  const loadInvitations = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })

    if (data) {
      setInvitations(data)
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if user already exists with this email
      const { data: existingUser } = await supabase
        .rpc('find_user_by_email', { user_email: inviteEmail })
        .single()

      // Create family member (with or without user_id)
      const memberData: any = {
        family_id: familyId,
        email: inviteEmail,
        role: inviteRole,
        invitation_status: 'pending',
      }

      if (inviteName) {
        memberData.name = inviteName
      }

      // If user exists, link them
      if (existingUser) {
        memberData.user_id = existingUser
      }

      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .insert(memberData)
        .select()
        .single()

      if (memberError) {
        // Check if member already exists
        if (memberError.code === '23505') {
          setError('Cette personne est déjà membre de la famille ou une invitation a déjà été envoyée')
          setLoading(false)
          return
        }
        throw memberError
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          family_id: familyId,
          family_member_id: member.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user.id,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // TODO: Send email with invitation link
      // For now, we'll just show the invitation token

      router.refresh()
      setInviteEmail('')
      setInviteName('')
      setInviteRole('child')
      setShowInviteForm(false)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'invitation')
    } finally {
      setLoading(false)
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)

      if (error) throw error

      await loadInvitations()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'annulation')
    } finally {
      setLoading(false)
    }
  }

  const getInvitationLink = (token: string) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/invitation/accept?token=${token}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Lien copié dans le presse-papiers !')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invitations</h3>
        <button
          onClick={() => {
            setShowInviteForm(!showInviteForm)
            if (!showInviteForm) {
              loadInvitations()
            }
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Inviter un membre
        </button>
      </div>

      {showInviteForm && (
        <div className="card">
          <h4 className="font-semibold mb-4">Envoyer une invitation</h4>
          <form onSubmit={sendInvitation} className="space-y-4">
            <div>
              <label htmlFor="inviteName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom (optionnel)
              </label>
              <input
                id="inviteName"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="input"
                placeholder="Jean Dupont"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pour les enfants sans compte, vous pouvez spécifier un nom
              </p>
            </div>

            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="input"
                placeholder="membre@email.com"
              />
            </div>

            <div>
              <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'parent' | 'child')}
                className="input"
              >
                <option value="child">Enfant</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="card">
          <h4 className="font-semibold mb-4">Invitations envoyées</h4>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {invitation.role === 'parent' ? 'Parent' : 'Enfant'} •{' '}
                      {invitation.status === 'pending' && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-3 h-3" />
                          En attente
                        </span>
                      )}
                      {invitation.status === 'accepted' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Acceptée
                        </span>
                      )}
                      {invitation.status === 'declined' && (
                        <span className="text-red-600">Refusée</span>
                      )}
                      {invitation.status === 'expired' && (
                        <span className="text-gray-500">Expirée</span>
                      )}
                      {invitation.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              const link = getInvitationLink(invitation.token)
                              copyToClipboard(link)
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm btn btn-secondary"
                            title="Copier le lien d'invitation"
                          >
                            Copier le lien d'invitation
                          </button>
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-800 btn btn-secondary"
                            title="Annuler l'invitation"
                          >
                            Annuler l'invitation
                          </button>
                        </div>
                      )}

                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

