# Résumé : Système d'invitations et membres sans compte

## ✅ Fonctionnalités implémentées

### 1. Membres sans compte
- ✅ Possibilité de créer des enfants (ou membres) avec juste un nom et un email
- ✅ Les membres sans compte apparaissent dans la liste avec un badge "Sans compte"
- ✅ Ils peuvent recevoir des invitations pour créer un compte plus tard

### 2. Système d'invitations
- ✅ Table `invitations` pour gérer les invitations
- ✅ Création d'invitations avec un token unique
- ✅ Liens d'invitation valides 30 jours
- ✅ Statuts : pending, accepted, declined, expired

### 3. Acceptation d'invitations
- ✅ Page dédiée `/invitation/accept` pour accepter les invitations
- ✅ Redirection automatique vers login/signup si non connecté
- ✅ Fonction SQL `accept_invitation()` pour lier le compte au membre
- ✅ Redirection vers le dashboard après acceptation

### 4. Interface utilisateur
- ✅ Composant `InvitationManager` pour gérer les invitations
- ✅ Formulaire pour envoyer des invitations
- ✅ Liste des invitations avec statut
- ✅ Bouton pour copier le lien d'invitation
- ✅ Annulation d'invitations

## 📁 Fichiers créés/modifiés

### Migrations SQL
1. `005_add_invitations_system.sql`
   - Modifie `family_members` pour permettre `user_id` NULL
   - Ajoute colonnes `email`, `name`, `invitation_status`
   - Crée la table `invitations`
   - Crée la fonction `accept_invitation()`

2. `006_update_rls_for_members_without_accounts.sql`
   - Met à jour les politiques RLS pour gérer les membres sans compte
   - Met à jour les fonctions helper pour gérer `user_id` nullable

### Composants
1. `components/InvitationManager.tsx`
   - Gestion complète des invitations
   - Formulaire d'envoi
   - Liste des invitations
   - Copie de liens

2. `components/FamilyManagement.tsx` (modifié)
   - Intègre `InvitationManager`
   - Affiche les membres sans compte avec badge
   - Affiche le statut d'invitation

### Pages
1. `app/invitation/accept/page.tsx`
   - Page pour accepter une invitation
   - Gère la connexion/inscription si nécessaire
   - Appelle la fonction `accept_invitation()`

2. `app/dashboard/family/page.tsx` (modifié)
   - Récupère les membres avec ou sans compte
   - Affiche les emails et noms correctement

## 🔧 Modifications de la base de données

### Table `family_members`
- `user_id` : maintenant nullable (peut être NULL pour membres sans compte)
- `email` : ajouté (pour membres sans compte)
- `name` : ajouté (pour membres sans compte)
- `invitation_status` : ajouté ('pending', 'accepted', 'declined')

### Table `invitations` (nouvelle)
- `id`, `family_id`, `family_member_id`
- `email`, `role`
- `token` : UUID unique pour le lien
- `status` : 'pending', 'accepted', 'declined', 'expired'
- `invited_by`, `expires_at`, `created_at`, `accepted_at`

### Fonction SQL
- `accept_invitation(token UUID)` : Accepte une invitation et lie le compte

## 📝 Comment utiliser

### Pour les parents

1. **Inviter un membre** :
   ```
   Famille → Invitations → Inviter un membre
   - Nom (optionnel pour enfants)
   - Email (requis)
   - Rôle (Parent/Enfant)
   ```

2. **Copier le lien d'invitation** :
   - Cliquez sur "Copier le lien" pour chaque invitation en attente
   - Partagez le lien avec la personne invitée

3. **Gérer les invitations** :
   - Voir le statut de toutes les invitations
   - Annuler les invitations en attente

### Pour les membres invités

1. **Recevoir le lien** (par email ou partagé)

2. **Cliquer sur le lien** :
   - Si non connecté → redirigé vers login/signup
   - Si connecté → invitation acceptée automatiquement

3. **Créer un compte** (si nécessaire) :
   - Utilisez l'email de l'invitation
   - Une fois connecté, l'invitation est acceptée

## ⚙️ Migration

Exécutez les migrations dans cet ordre :

```sql
-- 1. Système d'invitations de base
005_add_invitations_system.sql

-- 2. Mise à jour des politiques RLS
006_update_rls_for_members_without_accounts.sql
```

## 🎯 Cas d'usage

1. **Enfant sans compte** :
   - Parent crée l'enfant avec nom + email
   - Enfant peut être ajouté aux horaires/tâches
   - Plus tard, parent envoie invitation
   - Enfant crée compte et rejoint la famille

2. **Membre avec compte** :
   - Parent envoie invitation par email
   - Si le compte existe, l'invitation lie automatiquement
   - Si le compte n'existe pas, invitation en attente

3. **Membre déjà dans la famille** :
   - Si déjà membre, erreur lors de la création de l'invitation
   - Protection contre les doublons

## 🔒 Sécurité

- Seuls les parents peuvent créer des invitations
- Les invitations sont liées à un email spécifique
- Les tokens sont uniques et valides 30 jours
- Les politiques RLS protègent toutes les opérations
- Les membres sans compte ne peuvent pas se connecter

## 📚 Documentation

- `INVITATIONS_GUIDE.md` : Guide complet d'utilisation
- `INVITATIONS_SUMMARY.md` : Ce document (résumé technique)

