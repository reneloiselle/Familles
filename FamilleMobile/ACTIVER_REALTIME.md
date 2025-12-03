# 🔴 Activer Realtime pour FamilleMobile

## ⚠️ IMPORTANT : Configuration Supabase requise

Pour que Realtime fonctionne dans votre application Flutter, vous devez d'abord activer Realtime dans votre projet Supabase.

## 📋 Étapes pour activer Realtime

### 1. Exécuter la migration SQL

Ouvrez le SQL Editor de votre projet Supabase et exécutez cette migration :

```sql
-- Enable Realtime for shared_lists table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_lists;

-- Enable Realtime for shared_list_items table
ALTER PUBLICATION supabase_realtime ADD TABLE shared_list_items;
```

**Localisation du fichier** : `FamilleWeb/supabase/migrations/010_enable_realtime_shared_lists.sql`

### 2. Vérifier dans Supabase Dashboard

1. Allez dans votre projet Supabase
2. Ouvrez **Database** → **Replication**
3. Vérifiez que les tables suivantes apparaissent et sont activées :
   - ✅ `shared_lists`
   - ✅ `shared_list_items`

### 3. Vérifier avec une requête SQL

Exécutez cette requête dans le SQL Editor pour vérifier :

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Vous devriez voir les deux tables dans les résultats.

## ✅ Code déjà implémenté

Le code Flutter est déjà prêt pour Realtime :

- ✅ `ListsProvider` avec subscriptions Realtime
- ✅ Gestion automatique des événements INSERT, UPDATE, DELETE
- ✅ Nettoyage automatique des subscriptions

## 🔄 Comment ça fonctionne

1. Quand vous chargez les listes (`loadLists()`), une subscription Realtime est créée
2. Quand vous sélectionnez une liste, une subscription pour ses éléments est créée
3. Tous les changements (création, modification, suppression) sont synchronisés en temps réel
4. Les autres utilisateurs voient les changements instantanément

## 🚀 Tester Realtime

1. **Ouvrir deux appareils/émulateurs** avec des comptes différents de la même famille
2. **Sur le premier** : Créer une liste ou ajouter un élément
3. **Sur le deuxième** : Le changement devrait apparaître immédiatement

## ⚠️ Si Realtime ne fonctionne pas

1. ✅ Vérifiez que la migration SQL a été exécutée
2. ✅ Vérifiez que les tables sont dans la liste Replication
3. ✅ Vérifiez votre connexion Internet
4. ✅ Vérifiez que les permissions RLS permettent la lecture

## 📝 Note

Même sans Realtime, l'application fonctionne normalement. Vous devrez juste rafraîchir manuellement pour voir les changements des autres utilisateurs.

Une fois Realtime activé dans Supabase, les changements seront synchronisés automatiquement ! 🎉

