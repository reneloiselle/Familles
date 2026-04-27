# Instructions pour exécuter la migration 009

## Erreur actuelle

L'erreur "Could not find the table 'public.shared_lists' in the schema cache" signifie que la table n'existe pas encore. C'est normal ! La migration doit d'abord être exécutée.

## Comment exécuter la migration

### Étape 1 : Ouvrir Supabase

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet FamilleWeb

### Étape 2 : Ouvrir le SQL Editor

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"** (Nouvelle requête)

### Étape 3 : Copier la migration

Le fichier de migration se trouve à :
```
FamilleWeb/supabase/migrations/009_add_shared_lists.sql
```

Copiez **tout le contenu** de ce fichier.

### Étape 4 : Exécuter

1. Collez le contenu dans le SQL Editor
2. Vérifiez que la requête est bien sélectionnée
3. Cliquez sur **"Run"** (Exécuter) ou appuyez sur `Ctrl+Enter`

### Étape 5 : Vérifier

Après l'exécution, vous devriez voir :
- ✅ Message de succès
- ✅ Les tables `shared_lists` et `shared_list_items` créées
- ✅ Les politiques RLS créées

## Contenu de la migration

La migration crée :
- Table `shared_lists` pour les listes partagées
- Table `shared_list_items` pour les éléments des listes
- Fonctions helper pour la sécurité
- Politiques RLS pour le contrôle d'accès
- Triggers pour mettre à jour automatiquement `updated_at`

## Vérification

Après avoir exécuté la migration, vous pouvez vérifier dans Supabase :
1. Allez dans **Table Editor**
2. Vous devriez voir les nouvelles tables :
   - `shared_lists`
   - `shared_list_items`

Une fois la migration exécutée, l'erreur disparaîtra et vous pourrez utiliser les listes partagées !

