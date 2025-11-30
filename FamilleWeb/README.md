# FamilleWeb

Application SaaS pour gérer votre famille, organiser les horaires et coordonner les tâches.

## Fonctionnalités

- 👨‍👩‍👧‍👦 **Gestion de famille** : Créez votre famille et invitez les membres avec des rôles (parent/enfant)
- 📅 **Horaires synchronisés** : Gérez les horaires de chaque membre avec une vue complète pour les parents
- ✅ **Tâches assignées** : Créez et assignez des tâches aux membres de la famille
- 🔐 **Authentification sécurisée** : Système d'authentification avec Supabase Auth

## Stack technologique

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique pour une meilleure maintenabilité
- **Supabase** : Base de données PostgreSQL et authentification
- **Tailwind CSS** : Framework CSS utilitaire pour le design

## Prérequis

- Node.js 18+ et npm/yarn
- Un compte Supabase (gratuit disponible sur [supabase.com](https://supabase.com))

## Installation

1. **Cloner le projet et installer les dépendances**

```bash
cd FamilleWeb
npm install
```

2. **Configurer Supabase**

   a. Créez un nouveau projet sur [supabase.com](https://supabase.com)
   
   b. Accédez aux paramètres du projet → SQL Editor
   
   c. Exécutez le script de migration situé dans `supabase/migrations/001_initial_schema.sql`
   
   d. Accédez aux paramètres du projet → API
   
   e. Copiez l'URL du projet et la clé publique (anon key)

3. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

4. **Lancer l'application**

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## Structure du projet

```
FamilleWeb/
├── app/                      # Pages Next.js (App Router)
│   ├── auth/                # Pages d'authentification
│   ├── dashboard/           # Pages du tableau de bord
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Page d'accueil
├── components/              # Composants React réutilisables
├── lib/                     # Utilitaires et configuration
│   └── supabase/           # Configuration Supabase
├── supabase/               # Scripts SQL et migrations
│   └── migrations/         # Migrations de base de données
└── package.json
```

## Base de données

Le schéma de base de données comprend :

- **families** : Familles créées
- **family_members** : Membres de chaque famille avec leurs rôles
- **schedules** : Horaires de chaque membre
- **tasks** : Tâches assignées aux membres

Toutes les tables utilisent Row Level Security (RLS) pour la sécurité des données.

## Utilisation

1. **Créer un compte** : Inscrivez-vous sur la page d'accueil
2. **Créer une famille** : Une fois connecté, créez votre première famille
3. **Ajouter des membres** : Les parents peuvent ajouter des membres à la famille
4. **Gérer les horaires** : Ajoutez des événements dans les agendas
5. **Assigner des tâches** : Créez et assignez des tâches aux membres

## Notes importantes

- Les membres doivent avoir un compte existant pour être ajoutés à une famille
- Seuls les parents peuvent ajouter/retirer des membres
- Tous les membres peuvent voir les horaires de la famille
- Les parents ont une vue complète de tous les horaires

## Développement

```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Lancer en production
npm start

# Linter
npm run lint
```

## Licence

Ce projet est un exemple d'application SaaS pour la gestion de famille.

