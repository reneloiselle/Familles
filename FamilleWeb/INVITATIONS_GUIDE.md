# Guide du système d'invitations

## Fonctionnalités

Le système d'invitations permet de :

1. ✅ **Créer des membres sans compte** : Vous pouvez créer des enfants (ou autres membres) avec juste un nom et un email, sans qu'ils aient besoin d'avoir un compte
2. ✅ **Envoyer des invitations** : Les membres invités reçoivent un lien pour créer un compte et rejoindre la famille
3. ✅ **Gérer les invitations** : Vous pouvez voir le statut de toutes les invitations et copier les liens d'invitation

## Utilisation

### Pour les parents

1. **Inviter un membre**
   - Allez dans "Famille" → "Invitations"
   - Cliquez sur "Inviter un membre"
   - Remplissez le formulaire :
     - **Nom** (optionnel) : Pour les enfants sans compte
     - **Email** (requis) : L'email où envoyer l'invitation
     - **Rôle** : Parent ou Enfant
   - Cliquez sur "Envoyer l'invitation"

2. **Copier le lien d'invitation**
   - Une fois l'invitation créée, vous pouvez copier le lien
   - Partagez ce lien avec la personne invitée
   - Le lien reste valide pendant 30 jours

3. **Voir le statut des invitations**
   - **En attente** : L'invitation n'a pas encore été acceptée
   - **Acceptée** : Le membre a rejoint la famille
   - **Refusée** : L'invitation a été annulée
   - **Expirée** : Le lien a expiré (après 30 jours)

### Pour les membres invités

1. **Recevoir l'invitation**
   - Vous recevez un lien d'invitation (par email ou partagé par le parent)

2. **Accepter l'invitation**
   - Cliquez sur le lien d'invitation
   - Si vous n'avez pas de compte :
     - Cliquez sur "Créer un compte"
     - Créez votre compte avec l'email de l'invitation
   - Si vous avez déjà un compte :
     - Cliquez sur "Se connecter"
     - Connectez-vous avec l'email de l'invitation
   - Une fois connecté, l'invitation est automatiquement acceptée
   - Vous êtes redirigé vers le tableau de bord

## Membres sans compte

Les membres créés sans compte :
- Apparaissent dans la liste des membres avec le badge "Sans compte"
- Peuvent toujours recevoir des invitations pour créer un compte plus tard
- Peuvent être gérés normalement (horaires, tâches assignées)
- Ne peuvent pas se connecter tant qu'ils n'ont pas créé de compte

## Notes importantes

- ⏰ **Expiration** : Les invitations expirent après 30 jours
- 🔗 **Un seul lien** : Chaque invitation a un lien unique
- 📧 **Email requis** : L'email est obligatoire pour envoyer une invitation
- 👤 **Un seul compte par email** : Si un membre a déjà un compte, l'invitation le lie automatiquement
- 🔒 **Sécurité** : Seuls les parents peuvent envoyer et gérer les invitations

## Migrations nécessaires

Pour activer le système d'invitations, exécutez dans cet ordre :

1. `005_add_invitations_system.sql` - Crée le système d'invitations de base
2. `006_update_rls_for_members_without_accounts.sql` - Met à jour les politiques RLS

Ces migrations :
- Permettent les membres sans compte (`user_id` nullable)
- Créent la table `invitations`
- Ajoutent les fonctions nécessaires pour accepter les invitations

