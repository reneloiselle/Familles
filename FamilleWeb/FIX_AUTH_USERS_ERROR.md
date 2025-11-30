# Correction de l'erreur "permission denied for table users"

## Problème

L'erreur "permission denied for table users" se produit lorsque les politiques RLS tentent d'accéder directement à `auth.users`, ce qui n'est pas autorisé.

## Cause

Dans les politiques RLS, on ne peut pas accéder directement à `auth.users` avec une sous-requête comme :
```sql
(SELECT email FROM auth.users WHERE id = auth.uid())
```

Les politiques RLS doivent utiliser une fonction SECURITY DEFINER pour accéder à `auth.users`.

## Solution

La migration `007_fix_invitations_rls_auth_users.sql` corrige les politiques RLS qui accèdent directement à `auth.users` en utilisant la fonction `get_user_email()` qui a été créée dans la migration `002_add_user_email_function.sql`.

## Changements

Les politiques suivantes ont été corrigées :
1. **"Users can view invitations for their families"** : Utilise maintenant `get_user_email(auth.uid())` au lieu de `(SELECT email FROM auth.users WHERE id = auth.uid())`
2. **"Users can accept invitations sent to their email"** : Même correction

## Application

Exécutez la migration `007_fix_invitations_rls_auth_users.sql` dans le SQL Editor de Supabase.

Cette migration :
- Supprime les politiques problématiques
- Recrée les politiques en utilisant la fonction `get_user_email()` qui est SECURITY DEFINER

## Note importante

La fonction `get_user_email()` doit exister. Elle est créée dans la migration `002_add_user_email_function.sql`. Si vous avez une erreur, assurez-vous d'avoir exécuté la migration 002.

