# FamilleMobile

Application mobile **Flutter** (Android & iOS) — version mobile de **FamilleWeb**. Partage la même base **Supabase** que l'application web et offre une expérience native complète de gestion familiale avec un assistant IA vocal intégré.

---

## Fonctionnalités

- **Famille** : création de famille, gestion des membres, invitations par e-mail
- **Horaires** : planning personnel et familial, vue semaine/agenda, intégration Google Maps pour les lieux
- **Tâches** : création, assignation aux membres, filtres par statut, synchronisation temps réel
- **Listes partagées** : listes de courses et autres listes collaboratives, mise à jour temps réel
- **Chat IA** : assistant familial propulsé par l'API web (Next.js), avec streaming, synthèse vocale (TTS) et reconnaissance vocale
- **Authentification** : Supabase Auth (PKCE), session persistante
- **Realtime** : canaux Supabase Realtime sur horaires, tâches et listes partagées

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Langage | Dart ≥ 3.0 |
| Framework | Flutter (Material 3) |
| Backend / DB | Supabase (Auth, Postgres, Realtime) |
| State management | `provider` (ChangeNotifier) |
| Navigation | NavigationBar (5 onglets) + `Navigator.push` |
| Cartes & lieux | `google_maps_flutter`, `google_places_flutter`, `geolocator` |
| Audio & voix | `audioplayers`, `speech_to_text` |
| Chat IA | Appels HTTP vers l'API Next.js (FamilleWeb) avec Bearer token Supabase |
| Calendrier | `table_calendar` |
| Localisation | `intl` (fr/en, défaut fr-FR) |

---

## Prérequis

- Flutter SDK ≥ 3.0 / Dart ≥ 3.0
- Android Studio (Android) ou Xcode (iOS)
- Un projet Supabase avec les migrations FamilleWeb appliquées
- Une clé API Google Maps (Android + iOS)
- L'API FamilleWeb (Next.js) accessible depuis l'appareil

---

## Installation

### 1. Installer Flutter

Suivez le guide officiel : <https://flutter.dev/docs/get-started/install>

### 2. Cloner le dépôt et installer les dépendances

```bash
cd FamilleMobile
flutter pub get
```

### 3. Configurer les variables

Éditez `lib/config/supabase_config.dart` avec vos valeurs :

```dart
class SupabaseConfig {
  static const String url = 'https://votre-projet.supabase.co';
  static const String anonKey = 'votre_cle_anon';
}

class GoogleMapsConfig {
  static const String apiKey = 'votre_cle_google_maps';
}

class ApiConfig {
  // URL du serveur Next.js (FamilleWeb)
  // Simulateur Android : 'http://10.0.2.2:3000'
  // Réseau local     : 'http://192.168.x.x:3000'
  // Production       : 'https://votre-domaine.com'
  static const String baseUrl = 'http://10.0.2.2:3000';
}
```

> **Note :** La clé Google Maps doit également être renseignée dans `android/app/src/main/AndroidManifest.xml` (meta-data `com.google.android.geo.API_KEY`).

> **Sécurité :** Ne commitez pas de clés ou secrets. En production, injectez les valeurs via un mécanisme de build sécurisé (CI/CD secrets, `--dart-define`, etc.).

### 4. Lancer l'application

```bash
# Lister les appareils disponibles
flutter devices

# Android (émulateur ou physique)
flutter run

# iOS
flutter run -d ios

# Cibler un appareil précis
flutter run -d <device-id>
```
ba
### 5. Construire pour la production

```bash
# APK Android
flutter build apk --release

# App Bundle Android (recommandé pour le Play Store)
flutter build appbundle --release

# iOS
flutter build ios --release
```

---

## Structure du projet

```
lib/
├── config/
│   └── supabase_config.dart   # URLs, clés Supabase, Google Maps, API base URL
├── models/
│   ├── family.dart
│   ├── schedule.dart
│   ├── task.dart
│   ├── shared_list.dart
│   └── invitation.dart
├── services/
│   ├── supabase_service.dart  # CRUD centralisé (Supabase)
│   ├── openai_service.dart    # Appels chat + streaming vers l'API Next.js
│   └── ...                    # Audio, TTS, speech, etc.
├── providers/
│   ├── auth_provider.dart
│   ├── family_provider.dart
│   ├── schedule_provider.dart # Inclut le canal Realtime horaires
│   ├── tasks_provider.dart    # Inclut le canal Realtime tâches
│   └── lists_provider.dart    # Inclut le canal Realtime listes
├── screens/
│   ├── auth/                  # Login, Signup
│   ├── dashboard/             # DashboardScreen (5 onglets)
│   ├── family/                # Gestion des membres et invitations
│   ├── schedule/              # Planning, formulaires, lieux
│   ├── tasks/                 # Tâches, filtres
│   ├── lists/                 # Listes partagées et items
│   └── chat/                  # Assistant IA, TTS, dictée
├── widgets/
│   ├── location_picker.dart   # Sélection de lieu (Google Maps)
│   └── location_viewer.dart   # Affichage de lieu
└── main.dart                  # Point d'entrée, providers globaux, AuthWrapper
```

---

## Architecture

### Démarrage

`main.dart` initialise Supabase, configure la locale **fr-FR**, puis monte un `MultiProvider` racine avec `AuthProvider` et `FamilyProvider`. L'`AuthWrapper` redirige vers `DashboardScreen` (session active) ou `LoginScreen`.

### Navigation

`DashboardScreen` utilise une `NavigationBar` avec 5 onglets :
1. Accueil
2. Horaires
3. Tâches
4. Listes
5. Famille

Le Chat IA est accessible via un bouton de l'AppBar et une carte d'accueil (`Navigator.push`).

### State management

- **Global** : `AuthProvider` (session, user) et `FamilyProvider` (famille courante, membres)
- **Par écran** : `ChangeNotifierProvider` local pour les providers d'horaires, tâches et listes, instancié uniquement quand une famille est disponible

### Realtime

Chaque provider d'écran ouvre un canal nommé Supabase Realtime :
- `schedules_<familyId>`
- `tasks_<familyId>`
- Canaux listes et items

---

## Base de données

L'application utilise la **même base Supabase** que FamilleWeb. Toutes les migrations doivent être appliquées dans l'ordre :

| Fichier | Description |
|---------|-------------|
| `001_initial_schema.sql` | Schéma initial |
| `002_add_user_email_function.sql` | Fonction e-mail utilisateur |
| `003_fix_family_members_rls.sql` | RLS membres de famille |
| `004_fix_families_rls.sql` | RLS familles |
| `005_add_invitations_system.sql` | Système d'invitations |
| `006_update_rls_for_members_without_accounts.sql` | RLS membres sans compte |
| `007_fix_invitations_rls_auth_users.sql` | RLS invitations (auth.users) |
| `008_fix_schedules_rls_for_all_members.sql` | RLS horaires tous membres |
| `009_add_shared_lists.sql` | Listes partagées |
| `010_enable_realtime_shared_lists.sql` | Realtime listes partagées |

---

## Commandes utiles

```bash
# Analyse statique
flutter analyze

# Tests
flutter test

# Nettoyer le build cache
flutter clean && flutter pub get
```

---

## Notes

- L'application partage intégralement la base de données avec FamilleWeb (web).
- Le chat IA délègue toute la logique LLM à l'API Next.js ; un token Supabase valide est transmis en Bearer.
- `go_router` est déclaré dans `pubspec.yaml` mais non câblé ; la navigation repose actuellement sur `IndexedStack` et `Navigator.push`.
- L'`applicationId` Android (`com.example.famille_mobile`) devra être personnalisé avant toute publication.
