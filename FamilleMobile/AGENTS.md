# FamilleMobile — instructions agents

Application **Flutter** (Dart ≥ 3.0) — même backend **Supabase** que FamilleWeb.

## Commandes

```bash
cd FamilleMobile
flutter pub get
flutter analyze
flutter test                    # si tests pertinents demandés
flutter run                     # appareil / émulateur
```

## Configuration

- Fichier central : `lib/config/supabase_config.dart` (URL Supabase, clés, URL API Next.js, Google Maps).
- Les migrations Supabase doivent être appliquées depuis **FamilleWeb** (`supabase/migrations/`).
- Chat IA : appels HTTP vers l’API **FamilleWeb** (`openai_service.dart`) avec token Supabase.

## Arborescence clé

| Chemin | Usage |
|--------|--------|
| `lib/models/` | Modèles Dart (family, task, schedule, shared_list, …) |
| `lib/services/` | CRUD Supabase, chat, audio, TTS |
| `lib/providers/` | État (`provider` / ChangeNotifier) |
| `lib/screens/` | Écrans et navigation |
| `lib/main.dart` | Point d’entrée |

## Conventions code

- **State** : `provider` — ne pas introduire un autre gestionnaire d’état sans demande.
- **UI** : Material 3 ; textes utilisateur en **français** (`intl`, locale `fr-FR`).
- **Supabase** : passer par `supabase_service.dart` pour les accès données quand c’est déjà le pattern.
- **Realtime** : canaux alignés sur le web (tâches, listes, horaires) — même schéma DB.

## Plateformes

- Android : `android/` — clé Maps dans la config native si requis.
- iOS : `ios/` — même chose pour Maps.
- Ne pas modifier les fichiers générés (`linux/flutter/generated_*`, etc.) à la main.

## Parité avec le web

- Nouvelle colonne ou table : migration dans `FamilleWeb/supabase/migrations/`, puis modèles + service mobile.
- Comportement métier (RLS, rôles parent/enfant) : se caler sur FamilleWeb.

## À éviter

- Hardcoder des secrets dans le code source (utiliser config / `--dart-define` selon le README).
- Dupliquer une grosse logique serveur côté mobile si une route API FamilleWeb existe déjà.
