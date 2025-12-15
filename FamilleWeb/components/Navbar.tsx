'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Users, CheckSquare, LogOut, Home, List, Key, Menu, X, User } from 'lucide-react'

export function Navbar() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setIsMenuOpen(false)
  }

  // Fermer le menu quand on change de page
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Empêcher le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  if (loading || !user) {
    return null
  }

  const mainNavItems = [
    { href: '/dashboard/family', icon: Users, label: 'Famille' },
    { href: '/dashboard/schedule', icon: Calendar, label: 'Horaires' },
    { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tâches' },
    { href: '/dashboard/lists', icon: List, label: 'Listes' },
  ]

  const allNavItems = [
    { href: '/dashboard', icon: Home, label: 'Accueil' },
    ...mainNavItems,
    { href: '/dashboard/api-keys', icon: Key, label: 'Clés API' },
  ]

  return (
    <>
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Bouton hamburger mobile - à gauche */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>

            {/* Logo - centré sur mobile, à gauche sur desktop */}
            <Link href="/dashboard" className="text-xl md:text-2xl font-bold text-primary-600 md:mr-0 flex-1 md:flex-none text-center md:text-left">
              FamilleWeb
            </Link>
            
            {/* Menu desktop - 4 boutons principaux + autres */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {/* 4 boutons principaux */}
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary-600 bg-primary-50 font-medium'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              
              {/* Accueil et Clés API (moins visibles) */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-primary-600 bg-primary-50 font-medium'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="hidden lg:inline">Accueil</span>
              </Link>
              
              <Link
                href="/dashboard/api-keys"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/dashboard/api-keys'
                    ? 'text-primary-600 bg-primary-50 font-medium'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Key className="w-5 h-5" />
                <span className="hidden lg:inline">Clés API</span>
              </Link>
              
              {/* Déconnexion */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden lg:inline">Déconnexion</span>
              </button>
            </div>

            {/* Espaceur pour mobile (pour équilibrer le bouton hamburger à gauche) */}
            <div className="md:hidden w-10" />
          </div>
        </div>
      </nav>

      {/* Menu mobile - Sidebar */}
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-[85vw] max-w-[320px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out md:hidden ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
            <div className="flex flex-col h-full">
              {/* Header du sidebar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50/50 to-white">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-base">
                      {user?.email?.split('@')[0] || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Fermer le menu"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 space-y-1">
                  {allNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 font-medium shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                        <span className="text-base font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </nav>

              {/* Footer avec déconnexion */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 active:scale-95 w-full transition-all duration-200 font-medium min-h-[44px]"
                >
                  <LogOut className="w-6 h-6 flex-shrink-0" />
                  <span className="text-base">Déconnexion</span>
                </button>
              </div>
            </div>
          </aside>
      </>
    </>
  )
}

