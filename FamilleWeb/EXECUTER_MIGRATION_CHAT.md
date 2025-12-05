# Exécuter la migration pour les conversations de chat

Cette migration crée les tables nécessaires pour sauvegarder les conversations de chat avec OpenAI.

## Étapes

1. **Accéder à Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Connectez-vous à votre projet

2. **Ouvrir l'éditeur SQL**
   - Dans le menu de gauche, cliquez sur **SQL Editor**
   - Cliquez sur **New query**

3. **Exécuter la migration**
   - Copiez le contenu du fichier `supabase/migrations/016_add_chat_conversations.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)

4. **Vérifier la création des tables**
   - Allez dans **Table Editor**
   - Vous devriez voir deux nouvelles tables :
     - `chat_conversations`
     - `chat_messages`

## Structure des tables

### `chat_conversations`
- `id` : UUID (clé primaire)
- `user_id` : UUID (référence à auth.users)
- `title` : TEXT (titre de la conversation, optionnel)
- `created_at` : TIMESTAMPTZ
- `updated_at` : TIMESTAMPTZ

### `chat_messages`
- `id` : UUID (clé primaire)
- `conversation_id` : UUID (référence à chat_conversations)
- `role` : TEXT ('user', 'assistant', ou 'system')
- `content` : TEXT (contenu du message)
- `created_at` : TIMESTAMPTZ
- `message_order` : INTEGER (ordre des messages)

## Sécurité

- Row Level Security (RLS) est activé sur les deux tables
- Les utilisateurs ne peuvent voir et modifier que leurs propres conversations
- Les messages sont automatiquement supprimés quand une conversation est supprimée (CASCADE)

## Fonctionnalités

- Les conversations sont automatiquement sauvegardées
- L'historique est chargé au démarrage du chat
- Chaque utilisateur a sa propre conversation
- La conversation la plus récente est chargée automatiquement

