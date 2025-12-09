# Dépannage Google Maps - Carte vide

Si la carte Google Maps apparaît mais reste vide (gris), voici les étapes à suivre :

## 1. Vérifier les APIs activées

Dans Google Cloud Console (https://console.cloud.google.com/), assurez-vous que les APIs suivantes sont **activées** :

- ✅ **Maps SDK for Android** (pour Android)
- ✅ **Maps SDK for iOS** (pour iOS)
- ✅ **Places API** (pour la recherche d'adresses)
- ✅ **Geocoding API** (pour convertir les adresses en coordonnées)

## 2. Vérifier les restrictions de la clé API

### Pour iOS :
1. Allez dans Google Cloud Console > APIs & Services > Credentials
2. Cliquez sur votre clé API
3. Dans "Application restrictions", sélectionnez **iOS apps**
4. Ajoutez votre **Bundle ID** : `com.example.famille_mobile`
   - Vous pouvez trouver votre Bundle ID dans `ios/Runner.xcodeproj` ou dans Xcode

### Pour Android :
1. Dans "Application restrictions", sélectionnez **Android apps**
2. Ajoutez votre **Package name** : `com.example.famille_mobile`
3. Ajoutez votre **SHA-1 certificate fingerprint**
   - Pour obtenir votre SHA-1 :
     ```bash
     # Debug keystore
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

### Alternative : Pas de restrictions (développement uniquement)
Pour le développement, vous pouvez temporairement mettre **"None"** dans les restrictions, mais **NE FAITES PAS CELA EN PRODUCTION**.

## 3. Vérifier la configuration dans le code

### iOS (Info.plist)
Vérifiez que la clé API est bien dans `ios/Runner/Info.plist` :
```xml
<key>GMSApiKey</key>
<string>VOTRE_CLE_API</string>
```

### Android (AndroidManifest.xml)
Vérifiez que la clé API est bien dans `android/app/src/main/AndroidManifest.xml` :
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="VOTRE_CLE_API"/>
```

### AppDelegate.swift (iOS)
Vérifiez que Google Maps est initialisé dans `ios/Runner/AppDelegate.swift` :
```swift
import GoogleMaps

// Dans didFinishLaunchingWithOptions :
if let path = Bundle.main.path(forResource: "Info", ofType: "plist"),
   let dict = NSDictionary(contentsOfFile: path),
   let apiKey = dict["GMSApiKey"] as? String {
  GMSServices.provideAPIKey(apiKey)
}
```

## 4. Vérifier les logs

Dans les logs de l'application, cherchez des erreurs comme :
- "Google Maps SDK for iOS must be initialized"
- "API key not valid"
- "This API key is not authorized"

## 5. Tester avec une clé API sans restrictions

Pour tester rapidement, créez une nouvelle clé API dans Google Cloud Console avec **aucune restriction** (uniquement pour le développement). Si cela fonctionne, le problème vient des restrictions.

## 6. Vérifier le quota

Assurez-vous que votre projet Google Cloud a un quota suffisant pour les APIs Maps.

## 7. Réinstaller les pods (iOS)

Si vous êtes sur iOS, réinstallez les pods :
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
flutter clean
flutter pub get
```

## 8. Rebuild complet

Parfois, un rebuild complet résout le problème :
```bash
flutter clean
flutter pub get
cd ios && pod install && cd ..
flutter run
```

## Erreurs courantes

### "API key not valid"
- Vérifiez que la clé API est correcte
- Vérifiez que les APIs sont activées
- Vérifiez les restrictions de la clé

### "This API key is not authorized"
- Vérifiez que les APIs nécessaires sont activées
- Vérifiez que la clé API a les bonnes restrictions

### Carte grise sans erreur
- Vérifiez que la clé API est bien dans Info.plist (iOS) et AndroidManifest.xml (Android)
- Vérifiez que Google Maps est initialisé dans AppDelegate.swift (iOS)
- Vérifiez les restrictions de la clé API

