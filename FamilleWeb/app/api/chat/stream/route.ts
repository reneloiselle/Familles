import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification via le token dans le header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token d\'authentification manquant' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer la clé API OpenAI depuis les variables d'environnement
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI non configurée côté serveur' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les données de la requête
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Créer un stream pour la réponse
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Appeler l'API OpenAI avec streaming
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
              stream: true, // Activer le streaming
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const error = errorData.error || {}
            const errorMessage = error.message || 'Erreur inconnue'
            const errorType = error.type

            // Gestion spécifique des erreurs
            if (response.status === 429) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ error: 'Vous avez dépassé votre quota OpenAI. Veuillez vérifier votre compte OpenAI ou attendre la réinitialisation de votre quota.', type: 'quota_exceeded' })}\n\n`
                )
              )
              controller.close()
              return
            }

            if (response.status === 401) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ error: 'Clé API invalide côté serveur.', type: 'invalid_api_key' })}\n\n`
                )
              )
              controller.close()
              return
            }

            if (response.status === 402 || errorType === 'insufficient_quota') {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ error: 'Votre compte OpenAI n\'a pas de crédits suffisants. Veuillez ajouter des crédits à votre compte OpenAI.', type: 'insufficient_quota' })}\n\n`
                )
              )
              controller.close()
              return
            }

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ error: `Erreur OpenAI: ${errorMessage}`, type: errorType })}\n\n`
              )
            )
            controller.close()
            return
          }

          // Lire le stream de réponse
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ error: 'Impossible de lire la réponse' })}\n\n`
              )
            )
            controller.close()
            return
          }

          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // Envoyer un message de fin
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.trim() === '') continue
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    // Envoyer le chunk de contenu
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content })}\n\n`
                      )
                    )
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing pour les lignes incomplètes
                }
              }
            }
          }
        } catch (error) {
          console.error('Erreur dans le stream:', error)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur de connexion' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Erreur dans /api/chat/stream:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

