# 🔴 Configuration Realtime pour les listes partagées

## Vue d'ensemble

Les listes partagées utilisent maintenant Supabase Realtime pour synchroniser les changements en temps réel entre tous les membres de la famille. Quand un utilisateur ajoute, modifie ou supprime une liste ou un élément, les autres utilisateurs voient les changements instantanément sans avoir à rafraîchir la page.

## 📋 Étapes de configuration

### 1. Exécuter la migration

Exécutez la migration `010_enable_realtime_shared_lists.sql` dans le SQL Editor de Supabase :

```sql
-- Enable Realtime for shared_lists table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_lists;

-- Enable Realtime for shared_list_items table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_list_items;
```

### 2. Activer Realtime dans Supabase Dashboard (si nécessaire)

Par défaut, Realtime peut être désactivé. Pour l'activer :

1. Ouvrez votre projet Supabase
2. Allez dans **Database** → **Replication**
3. Vérifiez que les tables suivantes sont activées pour Realtime :
   - ✅ `shared_lists`
   - ✅ `shared_list_items`

Si elles ne sont pas listées, la migration les ajoutera automatiquement.

### 3. Vérifier la configuration Realtime

Pour vérifier que Realtime est bien configuré :

1. Dans Supabase Dashboard, allez dans **Database** → **Replication**
2. Vous devriez voir les tables `shared_lists` et `shared_list_items` dans la liste

## ✅ Fonctionnalités Realtime

Une fois configuré, les fonctionnalités suivantes fonctionneront en temps réel :

### Listes partagées (`shared_lists`)
- ✅ **Création** : Quand un utilisateur crée une liste, elle apparaît immédiatement pour tous
- ✅ **Modification** : Les changements de nom, description ou couleur sont synchronisés instantanément
- ✅ **Suppression** : Quand une liste est supprimée, elle disparaît pour tous les utilisateurs

### Éléments de liste (`shared_list_items`)
- ✅ **Ajout** : Les nouveaux éléments apparaissent immédiatement
- ✅ **Modification** : Les changements de texte, quantité, notes ou statut (coché/non coché) sont synchronisés
- ✅ **Suppression** : Les éléments supprimés disparaissent instantanément

## 🔧 Comment ça fonctionne

Le composant `SharedListsManagement` utilise deux subscriptions Realtime :

1. **Subscription pour les listes** : Écoute tous les changements sur les listes de la famille
   ```typescript
   supabase
     .channel('shared_lists_changes')
     .on('postgres_changes', {
       table: 'shared_lists',
       filter: `family_id=eq.${familyId}`
     }, ...)
   ```

2. **Subscription pour les éléments** : Écoute les changements sur les éléments de la liste sélectionnée
   ```typescript
   supabase
     .channel(`shared_list_items_${selectedList.id}`)
     .on('postgres_changes', {
       table: 'shared_list_items',
       filter: `list_id=eq.${selectedList.id}`
     }, ...)
   ```

## 🚀 Test

Pour tester la synchronisation en temps réel :

1. Ouvrez l'application dans deux onglets/ordinateurs différents (avec des comptes différents de la même famille)
2. Dans le premier onglet, créez une liste ou ajoutez un élément
3. Le deuxième onglet devrait voir les changements instantanément

## ⚠️ Dépannage

### Les changements ne sont pas synchronisés

1. **Vérifiez que la migration a été exécutée** :
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   Vous devriez voir `shared_lists` et `shared_list_items` dans les résultats.

2. **Vérifiez que Realtime est activé** dans Database → Replication

3. **Vérifiez les permissions RLS** : Les utilisateurs doivent avoir les permissions pour voir les changements

4. **Vérifiez la console du navigateur** : Il peut y avoir des erreurs de connexion WebSocket

### Erreur : "Could not find the table in the schema cache"

Cela signifie que la table n'existe pas encore. Exécutez d'abord la migration `009_add_shared_lists.sql`.

## 📝 Notes

- Les subscriptions sont automatiquement nettoyées quand le composant est démonté
- La synchronisation fonctionne uniquement pour les membres de la même famille (grâce aux filtres RLS)
- Les changements sont optimisés : seule la liste/élément modifié est mis à jour, pas tout le contenu

