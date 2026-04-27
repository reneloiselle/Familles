# Guide de démarrage rapide - FamilleWeb

## Étape 1: Configuration Supabase

1. **Créer un compte Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Créez un nouveau compte (gratuit)
   - Créez un nouveau projet

2. **Configurer la base de données**
   - Dans votre projet Supabase, allez dans **SQL Editor**
   - Exécutez le script de migration `supabase/migrations/001_initial_schema.sql`
   - Puis exécutez `supabase/migrations/002_add_user_email_function.sql`

3. **Récupérer les clés API**
   - Allez dans **Settings** → **API**
   - Copiez l'**URL du projet** (Project URL)
   - Copiez la **clé publique anonyme** (anon/public key)

## Étape 2: Configuration locale

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement**
   - Créez un fichier `.env.local` à la racine du projet
   - Copiez le contenu de `.env.example`
   - Remplacez les valeurs par celles de votre projet Supabase

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
   ```

## Étape 3: Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## Étape 4: Premier usage

1. **Créer un compte**
   - Sur la page d'accueil, cliquez sur "Créer un compte"
   - Entrez votre email et mot de passe
   - Vous serez automatiquement connecté

2. **Créer votre première famille**
   - Une fois connecté, allez dans "Famille"
   - Entrez un nom pour votre famille (ex: "Famille Dupont")
   - Cliquez sur "Créer la famille"

3. **Ajouter des membres**
   - Les membres doivent d'abord créer un compte
   - Une fois qu'ils ont un compte, vous pouvez les ajouter avec leur email
   - Vous pouvez définir leur rôle (Parent ou Enfant)

4. **Gérer les horaires**
   - Allez dans "Horaires"
   - Ajoutez des événements pour chaque membre
   - Les parents peuvent voir la vue complète de la famille

5. **Créer des tâches**
   - Allez dans "Tâches"
   - Créez des tâches et assignez-les aux membres
   - Suivez leur progression

## Notes importantes

- ⚠️ **Sécurité**: Ne partagez jamais vos clés Supabase publiquement
- 📧 **Ajout de membres**: Les membres doivent avoir créé un compte avant d'être ajoutés
- 🔐 **Permissions**: Seuls les parents peuvent ajouter/retirer des membres
- 👀 **Vue famille**: Les parents ont accès à une vue complète des horaires de tous les membres

## Problèmes courants

### Erreur de connexion à Supabase
- Vérifiez que vos variables d'environnement sont correctes
- Assurez-vous que le projet Supabase est actif
- Vérifiez que les migrations SQL ont été exécutées

### Impossible d'ajouter un membre
- Le membre doit avoir créé un compte au préalable
- Vérifiez que l'email est correct
- L'utilisateur ne doit pas déjà être membre de la famille

### Erreur de permissions
- Vérifiez que les politiques RLS (Row Level Security) sont bien configurées
- Réexécutez les migrations SQL si nécessaire

