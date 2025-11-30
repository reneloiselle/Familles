# Correction de l'erreur de récursion infinie

## Problème

L'erreur "infinite recursion detected in policy for relation family_members" se produit parce que les politiques RLS font référence à la même table qu'elles protègent, créant une boucle infinie.

## Solution

Exécutez la migration de correction qui utilise des fonctions SECURITY DEFINER pour éviter la récursion :

1. **Ouvrez votre projet Supabase**
2. **Allez dans SQL Editor**
3. **Exécutez le fichier** `supabase/migrations/003_fix_family_members_rls.sql`

## Ce que fait la migration

1. **Crée deux fonctions helper** :
   - `is_user_parent_of_family()` : Vérifie si un utilisateur est parent ou créateur d'une famille
   - `can_user_view_family()` : Vérifie si un utilisateur peut voir une famille

2. **Remplace les politiques RLS problématiques** :
   - Utilise les fonctions helper au lieu de requêtes directes sur `family_members`
   - Les fonctions sont SECURITY DEFINER, donc elles ne sont pas affectées par RLS
   - Cela évite la récursion

## Étapes pour appliquer la correction

```sql
-- Exécutez simplement le contenu du fichier 003_fix_family_members_rls.sql
-- dans le SQL Editor de Supabase
```

Après avoir exécuté la migration, vous pourrez :
- ✅ Créer une famille sans erreur
- ✅ Vous ajouter automatiquement comme parent
- ✅ Ajouter d'autres membres
- ✅ Gérer les membres de la famille

## Note

Si vous avez déjà des données, cette migration ne les supprimera pas. Elle remplace seulement les politiques RLS.

