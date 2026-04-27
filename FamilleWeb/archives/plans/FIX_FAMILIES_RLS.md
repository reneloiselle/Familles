# Correction de l'erreur RLS pour la table "families"

## Problème

L'erreur "new row violates row-level security policy for table 'families'" se produit lors de la création d'une famille.

### Cause

La politique SELECT pour la table `families` vérifie si l'utilisateur est membre de la famille via la table `family_members`. Cependant, lors de la création d'une famille :

1. La famille est créée avec `created_by = auth.uid()`
2. Ensuite, le créateur est ajouté comme membre dans `family_members`
3. Mais entre les deux étapes, Supabase vérifie la politique SELECT pour voir si l'utilisateur peut voir la ligne qu'il vient de créer
4. Comme il n'est pas encore dans `family_members`, la vérification échoue

## Solution

La migration `004_fix_families_rls.sql` corrige ce problème en :

1. **Modifiant la politique SELECT** pour permettre au créateur de voir sa famille même s'il n'est pas encore membre
2. **S'assurant que la politique INSERT** fonctionne correctement

### Changements

- La politique SELECT permet maintenant à :
  - Le créateur de la famille (`created_by = auth.uid()`)
  - OU les membres de la famille (via `family_members`)
- La politique INSERT reste la même mais est recréée pour garantir qu'elle fonctionne

## Comment appliquer

1. **Ouvrez votre projet Supabase**
2. **Allez dans SQL Editor**
3. **Exécutez le fichier** `supabase/migrations/004_fix_families_rls.sql`

Ou copiez-collez directement le contenu dans le SQL Editor.

## Ordre d'exécution des migrations

Pour éviter tous les problèmes, exécutez les migrations dans cet ordre :

1. `001_initial_schema.sql` - Schéma de base de données initial
2. `002_add_user_email_function.sql` - Fonctions pour gérer les emails
3. `003_fix_family_members_rls.sql` - Correction de la récursion pour `family_members`
4. `004_fix_families_rls.sql` - Correction de la politique RLS pour `families`

Après avoir exécuté ces migrations, vous pourrez :
- ✅ Créer une famille sans erreur
- ✅ Voir la famille que vous venez de créer
- ✅ Vous ajouter comme membre parent
- ✅ Ajouter d'autres membres

