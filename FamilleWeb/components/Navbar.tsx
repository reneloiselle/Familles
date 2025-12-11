'use client'

import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Calendar, Users, CheckSquare, LogOut, Home, List, Key } from 'lucide-react'

export function Navbar() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !user) {
    return null
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            FamilleWeb
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <Home className="w-5 h-5" />
              <span>Accueil</span>
            </Link>
            <Link href="/dashboard/family" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <Users className="w-5 h-5" />
              <span>Famille</span>
            </Link>
            <Link href="/dashboard/schedule" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <Calendar className="w-5 h-5" />
              <span>Horaires</span>
            </Link>
            <Link href="/dashboard/tasks" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <CheckSquare className="w-5 h-5" />
              <span>Tâches</span>
            </Link>
            <Link href="/dashboard/lists" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <List className="w-5 h-5" />
              <span>Listes</span>
            </Link>
            <Link href="/dashboard/api-keys" className="flex items-center gap-2 text-gray-700 hover:text-primary-600">
              <Key className="w-5 h-5" />
              <span>Clés API</span>
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

