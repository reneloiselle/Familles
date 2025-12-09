import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via le token dans le header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification manquant' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer la clé API OpenAI depuis les variables d'environnement
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée côté serveur' },
        { status: 500 }
      )
    }

    // Récupérer les données de la requête
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      )
    }

    // Construire l'historique de conversation au format OpenAI
    const messages = [
      {
        role: 'system',
        content:
          'Tu es un assistant utile et amical. Tu réponds en français de manière claire et concise.',
      },
      ...(conversationHistory || []).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    // Appeler l'API OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = errorData.error || {}
      const errorMessage = error.message || 'Erreur inconnue'
      const errorType = error.type

      // Gestion spécifique des erreurs
      if (response.status === 429) {
        return NextResponse.json(
          {
            error:
              'Vous avez dépassé votre quota OpenAI. Veuillez vérifier votre compte OpenAI ou attendre la réinitialisation de votre quota.',
            type: 'quota_exceeded',
          },
          { status: 429 }
        )
      }

      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Clé API invalide côté serveur.',
            type: 'invalid_api_key',
          },
          { status: 401 }
        )
      }

      if (response.status === 402 || errorType === 'insufficient_quota') {
        return NextResponse.json(
          {
            error:
              'Votre compte OpenAI n\'a pas de crédits suffisants. Veuillez ajouter des crédits à votre compte OpenAI.',
            type: 'insufficient_quota',
          },
          { status: 402 }
        )
      }

      return NextResponse.json(
        {
          error: `Erreur OpenAI: ${errorMessage}`,
          type: errorType,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const choices = data.choices || []
    if (choices.length > 0) {
      const assistantMessage = choices[0].message
      return NextResponse.json({
        content: assistantMessage.content,
      })
    }

    return NextResponse.json(
      { error: 'Aucune réponse reçue d\'OpenAI' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Erreur dans /api/chat:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      },
      { status: 500 }
    )
  }
}

