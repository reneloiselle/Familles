import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 animate-in fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              FamilleWeb
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 px-4">
              Gérez votre famille, organisez les horaires et coordonnez les tâches en toute simplicité
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16 px-4">
            <Link href="/auth/signup" className="btn btn-primary text-base sm:text-lg px-8 py-3 w-full sm:w-auto">
              Commencer gratuitement
            </Link>
            <Link href="/auth/login" className="btn btn-secondary text-base sm:text-lg px-8 py-3 w-full sm:w-auto">
              Se connecter
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 sm:mt-16">
            <div className="card text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-4xl mb-3 flex justify-center">👨‍👩‍👧‍👦</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Gestion de famille</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Créez votre famille et invitez les membres. Gérez les rôles et permissions facilement.
              </p>
            </div>
            <div className="card text-center group hover:scale-105 transition-transform duration-300">
              <div className="text-4xl mb-3 flex justify-center">📅</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Horaires synchronisés</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Visualisez les horaires de tous les membres. Les parents ont une vue complète de la famille.
              </p>
            </div>
            <div className="card text-center group hover:scale-105 transition-transform duration-300 sm:col-span-2 lg:col-span-1">
              <div className="text-4xl mb-3 flex justify-center">✅</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Tâches assignées</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Créez et assignez des tâches aux membres de la famille. Suivez leur progression.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

