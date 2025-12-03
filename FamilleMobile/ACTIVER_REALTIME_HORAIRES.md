# 🔴 Activer Realtime pour les horaires

## ⚠️ IMPORTANT : Configuration Supabase requise

Pour que Realtime fonctionne pour les horaires dans votre application Flutter, vous devez d'abord activer Realtime dans votre projet Supabase.

## 📋 Étapes pour activer Realtime

### 1. Exécuter la migration SQL

Ouvrez le SQL Editor de votre projet Supabase et exécutez cette migration :

```sql
-- Enable Realtime for schedules table
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
```

**Localisation du fichier** : `FamilleWeb/supabase/migrations/012_enable_realtime_schedules.sql`

### 2. Vérifier dans Supabase Dashboard

1. Allez dans votre projet Supabase
2. Ouvrez **Database** → **Replication**
3. Vérifiez que la table suivante apparaît et est activée :
   - ✅ `schedules`

### 3. Vérifier avec une requête SQL

Exécutez cette requête dans le SQL Editor pour vérifier :

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Vous devriez voir la table `schedules` dans les résultats.

## ✅ Code déjà implémenté

Le code Flutter est déjà prêt pour Realtime :

- ✅ `ScheduleProvider` avec subscription Realtime
- ✅ Gestion automatique des événements INSERT, UPDATE, DELETE
- ✅ Nettoyage automatique de la subscription

## 🔄 Comment ça fonctionne

1. Quand vous chargez les horaires (`loadSchedules()`), une subscription Realtime est créée
2. Tous les changements (création, modification, suppression) sont synchronisés en temps réel
3. Les autres utilisateurs voient les changements instantanément

## 🚀 Tester Realtime

1. **Ouvrir deux appareils/émulateurs** avec des comptes différents de la même famille
2. **Sur le premier** : Créer un horaire, modifier un horaire, ou supprimer un horaire
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

- ✅ **Création** : Quand un utilisateur crée un horaire, il apparaît immédiatement pour tous
- ✅ **Modification** : Les modifications d'horaire sont synchronisées instantanément
- ✅ **Suppression** : Quand un horaire est supprimé, il disparaît pour tous les utilisateurs

