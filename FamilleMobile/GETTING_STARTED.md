# Guide de démarrage - FamilleMobile

## 🚀 Installation rapide

### 1. Prérequis

- **Flutter SDK** 3.0.0 ou supérieur
  - Installation : https://flutter.dev/docs/get-started/install
  - Vérifier : `flutter doctor`

- **Projet Supabase** configuré
  - Assurez-vous d'avoir exécuté toutes les migrations SQL dans votre projet Supabase
  - Récupérez votre URL et clé anonyme depuis : Settings > API

### 2. Configuration Supabase

1. Ouvrez le fichier `lib/config/supabase_config.dart`
2. Remplacez les valeurs par celles de votre projet :

```dart
class SupabaseConfig {
  static const String url = 'https://votre-projet.supabase.co';
  static const String anonKey = 'votre_cle_anon_ici';
}
```

⚠️ **Important** : En production, utilisez un système de configuration sécurisé (variables d'environnement, config par environnement, etc.)

### 3. Installation des dépendances

```bash
cd FamilleMobile
flutter pub get
```

### 4. Vérification

```bash
flutter doctor
flutter analyze
```

### 5. Lancer l'application

```bash
# Voir les appareils disponibles
flutter devices

# Lancer sur un appareil spécifique
flutter run -d <device-id>

# Ou simplement
flutter run
```

## 📱 Structure de l'application

L'application est organisée en modules :

```
lib/
├── config/              # Configuration (Supabase)
├── models/              # Modèles de données
│   ├── family.dart
│   ├── schedule.dart
│   ├── task.dart
│   └── shared_list.dart
├── services/            # Services API
│   └── supabase_service.dart
├── providers/           # State management
│   └── auth_provider.dart
├── screens/             # Écrans
│   ├── auth/           # Authentification
│   ├── dashboard/      # Dashboard
│   ├── family/         # Gestion de famille
│   ├── schedule/       # Horaires
│   ├── tasks/          # Tâches
│   └── lists/          # Listes partagées
├── widgets/            # Widgets réutilisables
└── utils/              # Utilitaires
```

## 🔑 Authentification

L'application utilise Supabase Auth. Les mêmes identifiants fonctionnent pour la version web et mobile.

### Flux d'authentification

1. **Connexion** : L'utilisateur se connecte avec email/mot de passe
2. **Session** : La session est gérée automatiquement par Supabase
3. **Persistance** : La session persiste entre les redémarrages de l'app

## 🗄️ Base de données

L'application partage la **même base de données** que la version web.

### Migrations SQL requises

Assurez-vous d'avoir exécuté toutes les migrations dans l'ordre :

1. `001_initial_schema.sql`
2. `002_add_user_email_function.sql`
3. `003_fix_family_members_rls.sql`
4. `004_fix_families_rls.sql`
5. `005_add_invitations_system.sql`
6. `006_update_rls_for_members_without_accounts.sql`
7. `007_fix_invitations_rls_auth_users.sql`
8. `008_fix_schedules_rls_for_all_members.sql`
9. `009_add_shared_lists.sql`
10. `010_enable_realtime_shared_lists.sql`

## 📋 Fonctionnalités

### ✅ Implémentées

- ✅ Authentification (Login/Signup)
- ✅ Structure de navigation
- ✅ Service Supabase avec toutes les méthodes
- ✅ Modèles de données complets

### 🚧 À implémenter

- 🚧 Gestion de famille complète
- 🚧 Gestion des horaires avec vue semaine
- 🚧 Gestion des tâches
- 🚧 Listes partagées avec édition inline
- 🚧 Realtime subscriptions

## 🛠️ Développement

### Lancer en mode développement

```bash
flutter run --debug
```

### Build de production

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

### Tests

```bash
flutter test
```

## 🔧 Dépannage

### Erreur "Supabase not initialized"

Vérifiez que vous avez bien configuré `lib/config/supabase_config.dart` avec vos vraies valeurs.

### Erreur "Permission denied"

Vérifiez que vous avez bien exécuté toutes les migrations SQL et que les politiques RLS sont correctes.

### Erreur de connexion

Vérifiez que votre URL Supabase est correcte et que votre appareil/émulateur a accès à Internet.

## 📚 Ressources

- Documentation Flutter : https://flutter.dev/docs
- Documentation Supabase Flutter : https://supabase.com/docs/reference/dart/introduction
- Documentation GoRouter : https://pub.dev/packages/go_router

## 🎯 Prochaines étapes

1. Implémenter la gestion de famille complète
2. Ajouter les écrans d'horaires avec calendrier
3. Implémenter la gestion des tâches
4. Ajouter les listes partagées avec édition inline
5. Intégrer Realtime pour les mises à jour en temps réel

## 📝 Notes

- L'application est en développement actif
- Les écrans de base sont en place, prêts à être complétés
- Le service Supabase contient toutes les méthodes nécessaires
- La structure est extensible et prête pour les fonctionnalités avancées


