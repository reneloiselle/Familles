'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'need_login'>('loading')
  const [message, setMessage] = useState('')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token d\'invitation manquant')
      return
    }

    if (authLoading) {
      return
    }

    if (!user) {
      setStatus('need_login')
      return
    }

    acceptInvitation()
  }, [token, user, authLoading])

  const acceptInvitation = async () => {
    if (!token) return

    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
      })

      if (error) {
        if (error.message.includes('not found') || error.message.includes('expired')) {
          setStatus('error')
          setMessage('Cette invitation n\'existe pas, a expiré ou a déjà été utilisée.')
        } else if (error.message.includes('email')) {
          setStatus('error')
          setMessage('Cette invitation n\'est pas pour votre adresse email.')
        } else {
          setStatus('error')
          setMessage(error.message || 'Erreur lors de l\'acceptation de l\'invitation')
        }
        return
      }

      setStatus('success')
      setMessage('Invitation acceptée avec succès ! Vous êtes maintenant membre de la famille.')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Erreur lors de l\'acceptation de l\'invitation')
    }
  }

  if (status === 'need_login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <XCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
            <p className="text-gray-600 mb-6">
              Vous devez être connecté pour accepter cette invitation.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href={`/auth/login?redirect=/invitation/accept?token=${token}`} className="btn btn-primary">
                Se connecter
              </Link>
              <Link href={`/auth/signup?redirect=/invitation/accept?token=${token}`} className="btn btn-secondary">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-4">Traitement de l'invitation...</h1>
              <p className="text-gray-600">Veuillez patienter</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Invitation acceptée !</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500">Redirection vers le tableau de bord...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Erreur</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link href="/" className="btn btn-primary">
                Retour à l'accueil
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

