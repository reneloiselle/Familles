# ⚡ Démarrage rapide - FamilleMobile Android

## ✅ Tout est prêt !

Votre environnement est configuré :
- ✅ Flutter installé (`/home/rene/snap/flutter/common/flutter`)
- ✅ Android SDK configuré (`/home/rene/Android/Sdk`)
- ✅ Appareil connecté : **SM S931W** (Android 16)
- ✅ Supabase configuré
- ✅ Dépendances installées

## 🚀 Lancer l'application maintenant

### Méthode simple (recommandée)

```bash
cd /home/rene/sources/projets/Familles/FamilleMobile
flutter run
```

L'application va :
1. Se compiler
2. S'installer sur votre téléphone (SM S931W)
3. Se lancer automatiquement

### Commandes pendant l'exécution

Une fois lancée, vous pouvez :
- **`r`** : Hot reload (rechargement rapide)
- **`R`** : Hot restart (redémarrage complet)
- **`q`** : Quitter l'application

## 📱 Votre appareil

- **Nom** : SM S931W
- **ID** : RFGYA17A91P
- **Android** : 16 (API 36)

## 🔧 Commandes utiles

### Lister les appareils
```bash
flutter devices
```

### Lancer sur un appareil spécifique
```bash
flutter run -d RFGYA17A91P
```

### Mode release (production)
```bash
flutter run --release
```

### Analyser le code
```bash
flutter analyze
```

### Nettoyer et réinstaller
```bash
flutter clean
flutter pub get
```

## ⚠️ Si ça ne fonctionne pas

### L'appareil n'est pas détecté ?

1. Vérifiez que le téléphone est bien connecté en USB
2. Activez le mode développeur :
   - Paramètres → À propos du téléphone
   - Appuyez 7 fois sur "Numéro de build"
3. Activez le débogage USB :
   - Paramètres → Options pour les développeurs
   - Activez "Débogage USB"
4. Acceptez la demande d'autorisation sur le téléphone

### Erreur de build ?

```bash
flutter clean
flutter pub get
flutter run
```

### Erreur Supabase ?

Vérifiez que les valeurs dans `lib/config/supabase_config.dart` sont correctes.

## 📦 Build APK

Pour créer un fichier APK à installer :

```bash
flutter build apk --release
```

L'APK sera dans : `build/app/outputs/flutter-apk/app-release.apk`

## 🎯 Ce que vous verrez

1. Écran de connexion
2. Possibilité de créer un compte
3. Dashboard avec navigation par onglets
4. Écrans de base pour chaque fonctionnalité

## 📚 Documentation complète

- **LANCER_APPLICATION.md** : Guide détaillé
- **GETTING_STARTED.md** : Installation et configuration
- **README.md** : Vue d'ensemble

---

**Prêt à lancer ? Exécutez simplement :**
```bash
cd /home/rene/sources/projets/Familles/FamilleMobile && flutter run
```

🎉 **Bon développement !**

