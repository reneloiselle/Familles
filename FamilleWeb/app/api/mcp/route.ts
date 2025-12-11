import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Configuration Supabase manquante')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Fonction helper pour obtenir l'utilisateur et la famille
async function getUserAndFamily(userId: string) {
  const { data: familyMember, error: memberError } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError || !familyMember) {
    throw new Error(`Utilisateur non trouvé ou non membre d'une famille: ${memberError?.message || 'Aucun membre trouvé'}`)
  }

  return {
    familyMember,
    familyId: familyMember.family_id,
    family: familyMember.families,
  }
}

// Générer une clé API
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const prefix = crypto.randomBytes(6).toString('base64url').substring(0, 8)
  const random = crypto.randomBytes(24).toString('base64url').substring(0, 32)
  const key = `fml_${prefix}_${random}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, hash, prefix }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseClient = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...args } = body

    switch (action) {
      case 'create_api_key': {
        const { familyId, name, description, scope, expiresAt } = args

        if (scope === 'family' && !familyId) {
          return NextResponse.json({ error: 'familyId requis pour scope "family"' }, { status: 400 })
        }

        if (scope === 'family') {
          // Vérifier que l'utilisateur est parent de la famille
          const { data: member, error: memberError } = await supabase
            .from('family_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('family_id', familyId)
            .maybeSingle()

          if (memberError || !member || member.role !== 'parent') {
            return NextResponse.json(
              { error: 'Seuls les parents peuvent créer des clés API pour leur famille' },
              { status: 403 }
            )
          }
        }

        // Générer la clé
        const { key, hash, prefix } = generateApiKey()

        // Insérer dans la base de données
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .insert({
            family_id: scope === 'family' ? familyId : null,
            key_hash: hash,
            key_prefix: prefix,
            name,
            description: description || null,
            scope,
            expires_at: expiresAt || null,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          id: data.id,
          key: key, // ⚠️ À afficher une seule fois
          name: data.name,
          scope: data.scope,
          familyId: data.family_id,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          warning: '⚠️ IMPORTANT: Sauvegardez cette clé maintenant. Elle ne sera plus visible après.',
        })
      }

      case 'list_api_keys': {
        const { familyId } = args

        let query = supabase
          .from('mcp_api_keys')
          .select('id, key_prefix, name, description, scope, is_active, last_used_at, expires_at, created_at, family_id')
          .eq('created_by', user.id)

        if (familyId) {
          query = query.eq('family_id', familyId)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Masquer les clés complètes
        const safeData = (data || []).map((key: any) => ({
          id: key.id,
          keyPrefix: key.key_prefix,
          maskedKey: `fml_${key.key_prefix}_****`,
          name: key.name,
          description: key.description,
          scope: key.scope,
          isActive: key.is_active,
          lastUsedAt: key.last_used_at,
          expiresAt: key.expires_at,
          createdAt: key.created_at,
          familyId: key.family_id,
        }))

        return NextResponse.json(safeData)
      }

      case 'revoke_api_key': {
        const { keyId } = args

        // Vérifier que l'utilisateur est le créateur
        const { data: key, error: keyError } = await supabase
          .from('mcp_api_keys')
          .select('created_by')
          .eq('id', keyId)
          .maybeSingle()

        if (keyError || !key) {
          return NextResponse.json({ error: 'Clé API non trouvée' }, { status: 404 })
        }

        if (key.created_by !== user.id) {
          return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à révoquer cette clé' }, { status: 403 })
        }

        // Désactiver la clé
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .update({ is_active: false })
          .eq('id', keyId)
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          message: 'Clé API révoquée avec succès',
          key: {
            id: data.id,
            name: data.name,
            isActive: data.is_active,
          },
        })
      }

      case 'delete_api_key': {
        const { keyId } = args

        // Vérifier que l'utilisateur est le créateur
        const { data: key, error: keyError } = await supabase
          .from('mcp_api_keys')
          .select('created_by, name')
          .eq('id', keyId)
          .maybeSingle()

        if (keyError || !key) {
          return NextResponse.json({ error: 'Clé API non trouvée' }, { status: 404 })
        }

        if (key.created_by !== user.id) {
          return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à supprimer cette clé' }, { status: 403 })
        }

        // Supprimer la clé
        const { error } = await supabase.from('mcp_api_keys').delete().eq('id', keyId)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          message: `Clé API "${key.name}" supprimée définitivement`,
          keyId,
        })
      }

      default:
        return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur dans /api/mcp:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      },
      { status: 500 }
    )
  }
}

