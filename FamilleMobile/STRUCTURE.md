# 📁 Structure du projet FamilleMobile

## Vue d'ensemble

Application Flutter mobile pour Android et iOS, partageant la même base de données Supabase que la version web.

## Structure des dossiers

```
FamilleMobile/
│
├── lib/
│   ├── config/                    # Configuration
│   │   └── supabase_config.dart   # Config Supabase (URL, clé)
│   │
│   ├── models/                    # Modèles de données
│   │   ├── family.dart           # Family, FamilyMember
│   │   ├── schedule.dart         # Schedule
│   │   ├── task.dart             # Task, TaskStatus
│   │   └── shared_list.dart      # SharedList, SharedListItem
│   │
│   ├── services/                  # Services API
│   │   └── supabase_service.dart # Toutes les méthodes Supabase
│   │
│   ├── providers/                 # State Management (Provider)
│   │   └── auth_provider.dart    # Gestion authentification
│   │
│   ├── screens/                   # Écrans de l'application
│   │   ├── auth/
│   │   │   ├── login_screen.dart    ✅ Connexion
│   │   │   └── signup_screen.dart   ✅ Inscription
│   │   │
│   │   ├── dashboard/
│   │   │   └── dashboard_screen.dart ✅ Dashboard + Navigation
│   │   │
│   │   ├── family/
│   │   │   └── family_screen.dart   🚧 Structure de base
│   │   │
│   │   ├── schedule/
│   │   │   └── schedule_screen.dart 🚧 Structure de base
│   │   │
│   │   ├── tasks/
│   │   │   └── tasks_screen.dart    🚧 Structure de base
│   │   │
│   │   └── lists/
│   │       └── lists_screen.dart    🚧 Structure de base
│   │
│   ├── widgets/                   # Widgets réutilisables
│   │   └── (à créer)
│   │
│   ├── utils/                     # Utilitaires
│   │   └── (à créer)
│   │
│   └── main.dart                  ✅ Point d'entrée
│
├── pubspec.yaml                   ✅ Dépendances
├── analysis_options.yaml          ✅ Configuration linter
├── .gitignore                     ✅ Fichiers ignorés
│
├── README.md                      ✅ Documentation principale
├── GETTING_STARTED.md             ✅ Guide de démarrage
├── PROJET_RECAP.md                ✅ Récapitulatif complet
└── STRUCTURE.md                   ✅ Ce fichier
```

## 📦 Dépendances principales

### Production
- `supabase_flutter` : Client Supabase
- `provider` : State management
- `go_router` : Navigation (prêt)
- `table_calendar` : Calendriers
- `intl` : Formatage dates
- `shimmer` : Loading states
- `share_plus` : Partage
- `uuid` : Génération UUID

### Développement
- `flutter_lints` : Règles de lint

## 🔑 Points d'entrée

### 1. Configuration
**Fichier** : `lib/config/supabase_config.dart`

```dart
class SupabaseConfig {
  static const String url = 'https://votre-projet.supabase.co';
  static const String anonKey = 'votre_cle_anon_ici';
}
```

### 2. Service principal
**Fichier** : `lib/services/supabase_service.dart`

Toutes les méthodes pour interagir avec Supabase :
- Authentification
- Famille
- Horaires
- Tâches
- Listes partagées

### 3. Point d'entrée
**Fichier** : `lib/main.dart`

Initialise Supabase et lance l'application.

## 🎯 Flux de l'application

```
main.dart
  └── MyApp
      └── AuthWrapper
          ├── LoginScreen (si non connecté)
          └── DashboardScreen (si connecté)
              ├── DashboardHomeScreen
              ├── ScheduleScreen
              ├── TasksScreen
              ├── ListsScreen
              └── FamilyScreen
```

## 📝 Prochaines implémentations

### 1. Écran Famille
- Création de famille
- Liste des membres
- Ajout de membres
- Invitations
- Gestion des rôles

### 2. Écran Horaires
- Vue agenda
- Vue semaine (ressource)
- Création/édition horaires
- Filtres par membre

### 3. Écran Tâches
- Liste des tâches
- Création
- Assignation
- Statuts
- Filtres

### 4. Écran Listes
- Liste des listes
- Création
- Édition inline
- Ajout multiligne
- Realtime

## 🔄 Synchronisation avec la version web

L'application mobile partage :
- ✅ La même base de données Supabase
- ✅ Les mêmes migrations SQL
- ✅ La même authentification
- ✅ Les mêmes données en temps réel

Les deux applications sont parfaitement synchronisées.

## 📱 Plateformes supportées

- ✅ Android
- ✅ iOS

## 🛠️ Commandes de développement

```bash
# Installer les dépendances
flutter pub get

# Lancer l'application
flutter run

# Analyser le code
flutter analyze

# Tests
flutter test

# Build Android
flutter build apk --release

# Build iOS
flutter build ios --release
```

## 📚 Documentation

- **README.md** : Vue d'ensemble et installation
- **GETTING_STARTED.md** : Guide pas à pas
- **PROJET_RECAP.md** : Récapitulatif complet du projet
- **STRUCTURE.md** : Ce fichier (structure détaillée)

---

**Dernière mise à jour** : Structure de base complète ✅


