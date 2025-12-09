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
    const { text, voice = 'alloy', speed = 1.0 } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texte requis' },
        { status: 400 }
      )
    }

    // Appeler l'API TTS d'OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        speed: speed,
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

      return NextResponse.json(
        {
          error: `Erreur TTS OpenAI: ${errorMessage}`,
          type: errorType,
        },
        { status: response.status }
      )
    }

    // Retourner l'audio en base64
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({
      audio: audioBase64,
      format: 'mp3',
    })
  } catch (error) {
    console.error('Erreur dans /api/chat/tts:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      },
      { status: 500 }
    )
  }
}

