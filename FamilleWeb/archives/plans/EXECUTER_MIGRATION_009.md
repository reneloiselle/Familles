# ⚡ Exécuter la migration 009 - Listes partagées

## Erreur actuelle

```
Could not find the table 'public.shared_lists' in the schema cache
```

Cette erreur signifie que la table `shared_lists` n'existe pas encore dans votre base de données Supabase. C'est normal ! Il faut simplement exécuter la migration.

## 🚀 Instructions rapides

### Option 1 : Via le SQL Editor de Supabase (Recommandé)

1. **Ouvrez Supabase** : [app.supabase.com](https://app.supabase.com)
2. **Sélectionnez votre projet** FamilleWeb
3. **Ouvrez SQL Editor** dans le menu de gauche
4. **Créez une nouvelle requête** (bouton "New query")
5. **Ouvrez le fichier** :
   ```
   FamilleWeb/supabase/migrations/009_add_shared_lists.sql
   ```
6. **Copiez tout le contenu** du fichier
7. **Collez** dans le SQL Editor
8. **Cliquez sur "Run"** (ou `Ctrl+Enter`)

### Option 2 : Afficher le fichier dans le terminal

Exécutez cette commande pour afficher le contenu à copier :

```bash
cd /home/rene/sources/projets/Familles/FamilleWeb
cat supabase/migrations/009_add_shared_lists.sql
```

## ✅ Vérification

Après l'exécution, vous devriez voir :
- ✅ Message de succès dans Supabase
- ✅ Les tables créées dans **Table Editor** :
  - `shared_lists`
  - `shared_list_items`

## 🔄 Après la migration

Une fois la migration exécutée :
- L'erreur disparaîtra automatiquement
- Vous pourrez créer et gérer des listes partagées
- La page `/dashboard/lists` fonctionnera normalement

## 📝 Contenu de la migration

La migration crée :
- **Table `shared_lists`** : Pour stocker les listes partagées
- **Table `shared_list_items`** : Pour les éléments de chaque liste
- **Indexes** : Pour améliorer les performances
- **RLS Policies** : Pour la sécurité et le contrôle d'accès
- **Triggers** : Pour mettre à jour automatiquement `updated_at`
- **Fonction helper** : `can_user_access_list()` pour vérifier les permissions

## ❓ Besoin d'aide ?

Si vous rencontrez une erreur lors de l'exécution de la migration, vérifiez :
1. Que toutes les migrations précédentes ont été exécutées
2. Que vous êtes connecté au bon projet Supabase
3. Que vous avez les permissions nécessaires

