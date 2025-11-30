# Correction de l'erreur de politique RLS existante

## Problème

L'erreur suivante apparaît lors de l'exécution de la migration `005_add_invitations_system.sql` :

```
ERROR: 42710: policy "Users can view invitations for their families" for table "invitations" already exists
```

## Cause

La migration essaie de créer des politiques RLS qui existent déjà. Cela peut arriver si :
- La migration a été partiellement exécutée
- Les politiques ont été créées manuellement
- La migration est exécutée plusieurs fois

## Solution

J'ai ajouté des commandes `DROP POLICY IF EXISTS` avant la création de chaque politique pour permettre une réexécution propre de la migration.

## Correction appliquée

Les lignes suivantes ont été ajoutées avant la création des politiques :

```sql
-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Users can view invitations for their families" ON invitations;
DROP POLICY IF EXISTS "Parents can create invitations" ON invitations;
DROP POLICY IF EXISTS "Parents can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can accept invitations sent to their email" ON invitations;
```

## Application

Si vous avez déjà rencontré l'erreur :

1. **Option 1** : Exécutez d'abord manuellement les commandes DROP :
   ```sql
   DROP POLICY IF EXISTS "Users can view invitations for their families" ON invitations;
   DROP POLICY IF EXISTS "Parents can create invitations" ON invitations;
   DROP POLICY IF EXISTS "Parents can update invitations" ON invitations;
   DROP POLICY IF EXISTS "Users can accept invitations sent to their email" ON invitations;
   ```
   Puis relancez la migration complète.

2. **Option 2** : Relancez directement la migration corrigée (elle contient maintenant les DROP avant les CREATE).

La migration devrait maintenant s'exécuter sans erreur, même si les politiques existent déjà.

