# FamilleMobile

Application mobile Flutter pour Android et iOS - Version mobile de FamilleWeb.

## 🚀 Fonctionnalités

- 👨‍👩‍👧‍👦 **Gestion de famille** : Créez votre famille et invitez les membres
- 📅 **Horaires synchronisés** : Gérez les horaires avec vue semaine et agenda
- ✅ **Tâches assignées** : Créez et assignez des tâches aux membres
- 📝 **Listes partagées** : Listes de courses et autres listes collaboratives
- 🔐 **Authentification sécurisée** : Connexion avec Supabase Auth
- 🔔 **Realtime** : Mises à jour en temps réel

## 📋 Prérequis

- Flutter SDK 3.0.0 ou supérieur
- Dart SDK 3.0.0 ou supérieur
- Un compte Supabase avec le projet FamilleWeb configuré
- Android Studio (pour Android) ou Xcode (pour iOS)

## 🛠️ Installation

### 1. Installer Flutter

Suivez le guide officiel : https://flutter.dev/docs/get-started/install

### 2. Cloner et configurer

```bash
cd FamilleMobile
flutter pub get
```

### 3. Configuration Supabase

Créez un fichier `.env` à la racine du projet :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 4. Configuration des variables d'environnement

Pour Flutter, nous utiliserons le package `flutter_dotenv` ou des constantes dans le code.

Créez le fichier `lib/config/supabase_config.dart` :

```dart
class SupabaseConfig {
  static const String url = 'https://votre-projet.supabase.co';
  static const String anonKey = 'votre_cle_anon_ici';
}
```

⚠️ **Important** : En production, utilisez des variables d'environnement sécurisées ou un système de configuration build.

### 5. Lancer l'application

```bash
# Android
flutter run

# iOS
flutter run -d ios

# Sélectionner un appareil
flutter devices
flutter run -d <device-id>
```

## 📱 Structure du projet

```
lib/
├── config/              # Configuration (Supabase, etc.)
├── models/              # Modèles de données
├── services/            # Services (API, auth, etc.)
├── providers/           # State management (Provider)
├── screens/             # Écrans de l'application
│   ├── auth/           # Authentification
│   ├── dashboard/      # Dashboard
│   ├── family/         # Gestion de famille
│   ├── schedule/       # Horaires
│   ├── tasks/          # Tâches
│   └── lists/          # Listes partagées
├── widgets/            # Widgets réutilisables
├── utils/              # Utilitaires
└── main.dart          # Point d'entrée
```

## 🗄️ Base de données

L'application utilise la même base de données Supabase que la version web.

Assurez-vous d'avoir exécuté toutes les migrations SQL dans votre projet Supabase :
- `001_initial_schema.sql`
- `002_add_user_email_function.sql`
- `003_fix_family_members_rls.sql`
- `004_fix_families_rls.sql`
- `005_add_invitations_system.sql`
- `006_update_rls_for_members_without_accounts.sql`
- `007_fix_invitations_rls_auth_users.sql`
- `008_fix_schedules_rls_for_all_members.sql`
- `009_add_shared_lists.sql`
- `010_enable_realtime_shared_lists.sql`

## 🔑 Authentification

L'authentification utilise Supabase Auth avec les mêmes identifiants que la version web.

## 📝 Notes

- L'application partage la même base de données que la version web
- Les données sont synchronisées en temps réel via Supabase Realtime
- Compatible Android et iOS

## 📄 Licence

Ce projet est un exemple d'application mobile SaaS pour la gestion de famille.


