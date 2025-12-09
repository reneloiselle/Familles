# Configuration OpenAI côté serveur

## Vue d'ensemble

Le chat utilise maintenant une architecture sécurisée où la clé API OpenAI est stockée uniquement côté serveur. L'application mobile envoie les requêtes à votre serveur web qui fait le relais vers OpenAI.

## Configuration requise

### 1. Variable d'environnement

Ajoutez votre clé API OpenAI dans le fichier `.env.local` à la racine du projet `FamilleWeb` :

```env
OPENAI_API_KEY=sk-votre-cle-api-openai-ici
```

### 2. Routes API créées

Deux routes API ont été créées :

- **`/api/chat`** : Pour les messages de chat
- **`/api/chat/tts`** : Pour la synthèse vocale (text-to-speech)

### 3. Sécurité

- ✅ La clé API n'est jamais exposée au client
- ✅ Authentification requise (token Supabase)
- ✅ Validation des requêtes côté serveur
- ✅ Gestion des erreurs appropriée

## Fonctionnement

1. L'application mobile envoie une requête à `/api/chat` avec :
   - Le message de l'utilisateur
   - L'historique de conversation
   - Le token d'authentification Supabase

2. Le serveur web :
   - Vérifie l'authentification
   - Appelle l'API OpenAI avec la clé stockée côté serveur
   - Retourne la réponse à l'application mobile

3. L'application mobile affiche la réponse

## Avantages

- 🔒 **Sécurité** : La clé API n'est jamais dans le code client
- 💰 **Contrôle des coûts** : Vous pouvez limiter l'utilisation par utilisateur
- 📊 **Monitoring** : Vous pouvez logger toutes les requêtes
- 🛡️ **Protection** : Protection contre l'abus et les quotas

## Note importante

Assurez-vous que le fichier `.env.local` est dans `.gitignore` pour ne pas commiter votre clé API.

