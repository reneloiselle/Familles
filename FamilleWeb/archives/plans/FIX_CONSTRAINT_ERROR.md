# Correction de l'erreur de contrainte UNIQUE

## Problème

L'erreur suivante apparaît lors de l'exécution de la migration `005_add_invitations_system.sql` :

```
ERROR: 2BP01: cannot drop index family_members_family_id_user_id_key because constraint family_members_family_id_user_id_key on table family_members requires it
HINT: You can drop constraint family_members_family_id_user_id_key on table family_members instead.
```

## Cause

Dans le schéma initial (`001_initial_schema.sql`), la table `family_members` a une contrainte UNIQUE définie comme :

```sql
UNIQUE(family_id, user_id)
```

PostgreSQL crée automatiquement une **contrainte** (pas juste un index) avec le nom `family_members_family_id_user_id_key`. On ne peut pas supprimer une contrainte avec `DROP INDEX`, il faut utiliser `DROP CONSTRAINT`.

## Solution

La migration `005_add_invitations_system.sql` a été corrigée pour utiliser :

```sql
ALTER TABLE family_members 
  DROP CONSTRAINT IF EXISTS family_members_family_id_user_id_key;
```

Au lieu de :

```sql
DROP INDEX IF EXISTS family_members_family_id_user_id_key;
```

## Application

La migration corrigée devrait maintenant s'exécuter sans erreur. Si vous avez déjà rencontré l'erreur :

1. **Option 1** : Exécutez directement la commande pour supprimer la contrainte :
   ```sql
   ALTER TABLE family_members 
     DROP CONSTRAINT IF EXISTS family_members_family_id_user_id_key;
   ```

2. **Option 2** : Relancez la migration complète (elle utilisera maintenant `DROP CONSTRAINT`)

Après avoir supprimé la contrainte, les nouveaux index partiels seront créés pour gérer les membres avec et sans compte.

