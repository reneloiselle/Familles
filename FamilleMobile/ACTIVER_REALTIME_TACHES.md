# 🔴 Activer Realtime pour les tâches

## ⚠️ IMPORTANT : Configuration Supabase requise

Pour que Realtime fonctionne pour les tâches dans votre application Flutter, vous devez d'abord activer Realtime dans votre projet Supabase.

## 📋 Étapes pour activer Realtime

### 1. Exécuter la migration SQL

Ouvrez le SQL Editor de votre projet Supabase et exécutez cette migration :

```sql
-- Enable Realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

**Localisation du fichier** : `FamilleWeb/supabase/migrations/011_enable_realtime_tasks.sql`

### 2. Vérifier dans Supabase Dashboard

1. Allez dans votre projet Supabase
2. Ouvrez **Database** → **Replication**
3. Vérifiez que la table suivante apparaît et est activée :
   - ✅ `tasks`

### 3. Vérifier avec une requête SQL

Exécutez cette requête dans le SQL Editor pour vérifier :

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Vous devriez voir la table `tasks` dans les résultats.

## ✅ Code déjà implémenté

Le code Flutter est déjà prêt pour Realtime :

- ✅ `TasksProvider` avec subscription Realtime
- ✅ Gestion automatique des événements INSERT, UPDATE, DELETE
- ✅ Nettoyage automatique de la subscription

## 🔄 Comment ça fonctionne

1. Quand vous chargez les tâches (`loadTasks()`), une subscription Realtime est créée
2. Tous les changements (création, modification de statut, suppression) sont synchronisés en temps réel
3. Les autres utilisateurs voient les changements instantanément

## 🚀 Tester Realtime

1. **Ouvrir deux appareils/émulateurs** avec des comptes différents de la même famille
2. **Sur le premier** : Créer une tâche, modifier son statut, ou supprimer une tâche
3. **Sur le deuxième** : Le changement devrait apparaître immédiatement

## ⚠️ Si Realtime ne fonctionne pas

1. ✅ Vérifiez que la migration SQL a été exécutée
2. ✅ Vérifiez que la table est dans la liste Replication
3. ✅ Vérifiez votre connexion Internet
4. ✅ Vérifiez que les permissions RLS permettent la lecture

## 📝 Note

Même sans Realtime, l'application fonctionne normalement. Vous devrez juste rafraîchir manuellement pour voir les changements des autres utilisateurs.

Une fois Realtime activé dans Supabase, les changements seront synchronisés automatiquement ! 🎉

## 🔄 Fonctionnalités Realtime

Une fois configuré, les fonctionnalités suivantes fonctionneront en temps réel :

- ✅ **Création** : Quand un utilisateur crée une tâche, elle apparaît immédiatement pour tous
- ✅ **Modification de statut** : Les changements de statut (en attente → en cours → terminé) sont synchronisés instantanément
- ✅ **Suppression** : Quand une tâche est supprimée, elle disparaît pour tous les utilisateurs

