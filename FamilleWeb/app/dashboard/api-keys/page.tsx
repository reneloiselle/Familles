import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeysManagement } from '@/components/ApiKeysManagement'

async function getUserFamily(supabase: any, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', userId)
    .maybeSingle()

  return data
}

export default async function ApiKeysPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const familyMember = await getUserFamily(supabase, user.id)
  const family = familyMember?.families
  const isParent = familyMember?.role === 'parent'

  if (!family) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Clés API</h2>
          <p className="text-gray-600">
            Vous devez être membre d'une famille pour créer des clés API.
          </p>
        </div>
      </div>
    )
  }

  if (!isParent) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Clés API</h2>
          <p className="text-gray-600">
            Seuls les parents peuvent créer et gérer les clés API.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des clés API</h1>
        <p className="text-gray-600">
          Créez et gérez les clés API pour accéder aux fonctionnalités MCP de votre famille.
        </p>
      </div>

      <ApiKeysManagement user={user} family={family} />
    </div>
  )
}

