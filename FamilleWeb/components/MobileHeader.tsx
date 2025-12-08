'use client'

import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface MobileHeaderProps {
  onMenuToggle: () => void
  isMenuOpen: boolean
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dashboard/family': 'Ma famille',
  '/dashboard/schedule': 'Horaires',
  '/dashboard/tasks': 'Tâches',
  '/dashboard/lists': 'Listes partagées',
}

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const pathname = usePathname()
  const pageTitle = pageTitles[pathname] || 'FamilleWeb'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 mobile-header">
      <div className="flex items-center justify-between h-full px-3 sm:px-4">
        <button
          onClick={onMenuToggle}
          className="p-2.5 sm:p-3 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
          )}
        </button>
        
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate flex-1 text-center px-2 sm:px-4">
          {pageTitle}
        </h1>
        
        <div className="w-10 sm:w-12" /> {/* Spacer pour centrer le titre */}
      </div>
    </header>
  )
}

