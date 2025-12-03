# 🔴 Configuration Realtime pour FamilleMobile

## Vue d'ensemble

L'application Flutter utilise Supabase Realtime pour synchroniser les changements en temps réel entre tous les membres de la famille. Quand un utilisateur ajoute, modifie ou supprime une liste ou un élément, les autres utilisateurs voient les changements instantanément.

## ✅ Realtime déjà implémenté

Le support Realtime a été ajouté dans le `ListsProvider` pour :
- ✅ Les listes partagées (`shared_lists`)
- ✅ Les éléments de liste (`shared_list_items`)

## 📋 Configuration requise dans Supabase

### 1. Exécuter la migration

Exécutez la migration `010_enable_realtime_shared_lists.sql` dans le SQL Editor de Supabase :

```sql
-- Enable Realtime for shared_lists table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_lists;

-- Enable Realtime for shared_list_items table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_list_items;
```

### 2. Vérifier que Realtime est activé

1. Ouvrez votre projet Supabase
2. Allez dans **Database** → **Replication**
3. Vérifiez que les tables suivantes sont activées :
   - ✅ `shared_lists`
   - ✅ `shared_list_items`

### 3. Vérifier la configuration Realtime

Pour vérifier que Realtime est bien configuré, exécutez cette requête dans le SQL Editor :

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Vous devriez voir `shared_lists` et `shared_list_items` dans les résultats.

## 🔄 Fonctionnalités Realtime

Une fois configuré, les fonctionnalités suivantes fonctionneront en temps réel :

### Listes partagées (`shared_lists`)
- ✅ **Création** : Quand un utilisateur crée une liste, elle apparaît immédiatement pour tous
- ✅ **Modification** : Les changements de nom, description ou couleur sont synchronisés instantanément
- ✅ **Suppression** : Quand une liste est supprimée, elle disparaît pour tous les utilisateurs

### Éléments de liste (`shared_list_items`)
- ✅ **Ajout** : Les nouveaux éléments apparaissent immédiatement
- ✅ **Modification** : Les changements de texte ou statut (coché/non coché) sont synchronisés
- ✅ **Suppression** : Les éléments supprimés disparaissent instantanément

## 🔧 Comment ça fonctionne

Le `ListsProvider` utilise deux subscriptions Realtime :

1. **Subscription pour les listes** : Écoute tous les changements sur les listes de la famille
   - S'abonne automatiquement quand `loadLists()` est appelé
   - Filtre par `family_id`

2. **Subscription pour les éléments** : Écoute les changements sur les éléments de la liste sélectionnée
   - S'abonne automatiquement quand une liste est sélectionnée
   - Filtre par `list_id`

Les subscriptions sont automatiquement nettoyées quand le provider est disposé.

## 🚀 Test

Pour tester la synchronisation en temps réel :

1. Ouvrez l'application sur deux appareils/émulateurs différents (avec des comptes différents de la même famille)
2. Sur le premier appareil, créez une liste ou ajoutez un élément
3. Le deuxième appareil devrait voir les changements instantanément

## ⚠️ Dépannage

### Les changements ne sont pas synchronisés

1. **Vérifiez que la migration a été exécutée** :
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. **Vérifiez que Realtime est activé** dans Database → Replication

3. **Vérifiez les permissions RLS** : Les utilisateurs doivent avoir les permissions pour voir les changements

4. **Vérifiez la connexion** : Assurez-vous que l'appareil a accès à Internet

### Erreur de connexion Realtime

Si vous voyez des erreurs de connexion :
- Vérifiez que votre URL Supabase est correcte
- Vérifiez que votre appareil/émulateur a accès à Internet
- Vérifiez les logs dans la console Flutter

## 📝 Notes

- Les subscriptions sont automatiquement nettoyées quand le provider est disposé
- La synchronisation fonctionne uniquement pour les membres de la même famille (grâce aux filtres RLS)
- Les changements sont optimisés : seule la liste/élément modifié est mis à jour
- Les mises à jour locales sont désactivées car Realtime les gère automatiquement

## 🔄 Prochaines étapes

Pour ajouter Realtime à d'autres fonctionnalités :
- Horaires (schedules)
- Tâches (tasks)
- Membres de famille

Utilisez le même pattern que dans `ListsProvider`.

