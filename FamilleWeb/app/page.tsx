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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            FamilleWeb
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Gérez votre famille, organisez les horaires et coordonnez les tâches en toute simplicité
          </p>
          
          <div className="flex gap-4 justify-center mb-16">
            <Link href="/auth/signup" className="btn btn-primary text-lg px-8 py-3">
              Commencer gratuitement
            </Link>
            <Link href="/auth/login" className="btn btn-secondary text-lg px-8 py-3">
              Se connecter
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="card text-left">
              <h3 className="text-xl font-semibold mb-2">👨‍👩‍👧‍👦 Gestion de famille</h3>
              <p className="text-gray-600">
                Créez votre famille et invitez les membres. Gérez les rôles et permissions facilement.
              </p>
            </div>
            <div className="card text-left">
              <h3 className="text-xl font-semibold mb-2">📅 Horaires synchronisés</h3>
              <p className="text-gray-600">
                Visualisez les horaires de tous les membres. Les parents ont une vue complète de la famille.
              </p>
            </div>
            <div className="card text-left">
              <h3 className="text-xl font-semibold mb-2">✅ Tâches assignées</h3>
              <p className="text-gray-600">
                Créez et assignez des tâches aux membres de la famille. Suivez leur progression.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

