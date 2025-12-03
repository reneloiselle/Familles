import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FamilyManagement } from '@/components/FamilyManagement'

async function getUserFamily(supabase: any, userId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', userId)
    .maybeSingle()

  return data
}

async function getFamilyMembers(supabase: any, familyId: string) {
  const { data } = await supabase
    .from('family_members')
    .select('id, user_id, role, family_id, created_at, email, name, invitation_status, avatar_url')
    .eq('family_id', familyId)

  if (!data) return []

  // Fetch emails for members with accounts using the SQL function
  const membersWithEmails = await Promise.all(
    data.map(async (member: any) => {
      // If member has user_id, get email from auth.users
      if (member.user_id) {
        const { data: email } = await supabase
          .rpc('get_user_email', { user_uuid: member.user_id })
        return { ...member, email: email || member.email }
      }
      // If no user_id, use email from family_members table
      return member
    })
  )

  return membersWithEmails
}

export default async function FamilyPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const familyMember = await getUserFamily(supabase, user.id)
  const family = familyMember?.families
  const isParent = familyMember?.role === 'parent'

  let familyMembers = []
  if (family) {
    familyMembers = await getFamilyMembers(supabase, family.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion de la famille</h1>
        <p className="text-gray-600">
          {family
            ? `Famille: ${family.name}`
            : 'Créez votre première famille ou rejoignez-en une existante'}
        </p>
      </div>

      <FamilyManagement
        user={user}
        family={family}
        familyMember={familyMember}
        familyMembers={familyMembers}
        isParent={isParent}
      />
    </div>
  )
}

