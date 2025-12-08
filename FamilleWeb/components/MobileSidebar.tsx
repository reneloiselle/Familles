'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Home, 
  Users, 
  Calendar, 
  CheckSquare, 
  List, 
  LogOut,
  X,
  User
} from 'lucide-react'
import { useAuth } from '@/app/providers'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationItems = [
  { href: '/dashboard', icon: Home, label: 'Accueil' },
  { href: '/dashboard/family', icon: Users, label: 'Famille' },
  { href: '/dashboard/schedule', icon: Calendar, label: 'Horaires' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tâches' },
  { href: '/dashboard/lists', icon: List, label: 'Listes' },
]

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    onClose()
  }

  const handleLinkClick = () => {
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header du sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50/50 to-white">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0 ml-2"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 font-medium shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                    <span className="text-base">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer avec déconnexion */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 active:scale-95 w-full transition-all duration-200 font-medium"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-base">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

