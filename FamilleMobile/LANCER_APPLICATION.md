# 🚀 Guide pour lancer l'application FamilleMobile sur Android

## ✅ Votre environnement est prêt !

- ✅ Flutter 3.38.3 installé
- ✅ Android SDK configuré
- ✅ Appareil Android connecté (SM S931W)
- ✅ Dépendances installées

## 📋 Étapes pour lancer l'application

### 1. Configurer Supabase (IMPORTANT)

Avant de lancer l'application, vous devez configurer votre projet Supabase :

1. Ouvrez le fichier `lib/config/supabase_config.dart`
2. Remplacez les valeurs par celles de votre projet Supabase :

```dart
class SupabaseConfig {
  static const String url = 'https://votre-projet.supabase.co';  // Votre URL
  static const String anonKey = 'votre_cle_anon_ici';           // Votre clé
}
```

Pour obtenir ces valeurs :
- Allez dans votre projet Supabase
- Settings → API
- Copiez l'URL du projet et la clé "anon/public"

### 2. Lancer l'application sur Android

#### Option A : Sur votre appareil connecté (SM S931W)

```bash
cd /home/rene/sources/projets/Familles/FamilleMobile
flutter run -d RFGYA17A91P
```

Ou simplement :
```bash
flutter run
```
(Flutter détectera automatiquement votre appareil)

#### Option B : Sur un émulateur Android

1. Lister les émulateurs disponibles :
```bash
flutter emulators
```

2. Démarrer un émulateur :
```bash
flutter emulators --launch <emulator_id>
```

3. Lancer l'application :
```bash
flutter run
```

### 3. Mode debug vs release

#### Mode debug (développement) :
```bash
flutter run --debug
```

#### Mode release (production) :
```bash
flutter run --release
```

## 🔧 Commandes utiles

### Voir les appareils connectés
```bash
flutter devices
```

### Analyser le code
```bash
flutter analyze
```

### Nettoyer le projet
```bash
flutter clean
flutter pub get
```

### Hot reload
Pendant l'exécution, vous pouvez :
- Appuyer sur `r` pour hot reload
- Appuyer sur `R` pour hot restart
- Appuyer sur `q` pour quitter

### Build APK pour Android
```bash
flutter build apk --release
```

L'APK sera créé dans : `build/app/outputs/flutter-apk/app-release.apk`

## ⚠️ Dépannage

### L'appareil n'est pas détecté

1. Activez le mode développeur sur votre téléphone :
   - Paramètres → À propos du téléphone
   - Appuyez 7 fois sur "Numéro de build"

2. Activez le débogage USB :
   - Paramètres → Options pour les développeurs
   - Activez "Débogage USB"

3. Autorisez l'ordinateur :
   - Connectez le téléphone via USB
   - Acceptez la demande d'autorisation sur le téléphone

### Erreur de configuration Supabase

Si vous voyez une erreur comme "Supabase not initialized" :
- Vérifiez que vous avez bien modifié `lib/config/supabase_config.dart`
- Vérifiez que l'URL et la clé sont correctes
- Vérifiez votre connexion Internet

### Erreur de build

Si vous avez des erreurs de build :
```bash
flutter clean
flutter pub get
flutter run
```

## 📱 Votre appareil

Appareil détecté : **SM S931W**
- ID : RFGYA17A91P
- Plateforme : Android 16 (API 36)
- Architecture : android-arm64

## 🎯 Prochaines étapes

1. ✅ Configurez Supabase dans `lib/config/supabase_config.dart`
2. ✅ Lancez l'application avec `flutter run`
3. 🚧 Testez l'authentification (login/signup)
4. 🚧 Testez les fonctionnalités au fur et à mesure de leur implémentation

## 📚 Ressources

- Documentation Flutter : https://flutter.dev/docs
- Documentation Supabase Flutter : https://supabase.com/docs/reference/dart/introduction
- Guide de débogage : https://flutter.dev/docs/testing/building-web-apps

---

**Bonne chance avec votre application ! 🎉**

