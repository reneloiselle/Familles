# Configuration de l'URL du serveur API

## Problème : "Connection refused"

Si vous obtenez l'erreur "Connection refused", c'est que l'application mobile ne peut pas se connecter à votre serveur Next.js.

## Solutions selon votre environnement

### 1. Simulateur iOS (macOS)

Le simulateur iOS peut accéder à `localhost` de votre Mac :

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:3000';
}
```

**Assurez-vous que votre serveur Next.js est démarré :**
```bash
cd FamilleWeb
npm run dev
```

### 2. Simulateur Android

Le simulateur Android peut accéder à `localhost` via `10.0.2.2` :

```dart
class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:3000';
}
```

### 3. Appareil physique (iOS ou Android)

Pour un appareil physique, vous devez utiliser l'**IP locale** de votre machine de développement :

#### Trouver votre IP locale

**Sur macOS/Linux :**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Sur Windows :**
```bash
ipconfig
```
(Cherchez "IPv4 Address" dans la section de votre carte réseau)

**Exemple d'IP locale :** `192.168.1.100`

#### Configurer dans le code

Modifiez `lib/config/supabase_config.dart` :

```dart
class ApiConfig {
  // Remplacez par votre IP locale
  static const String baseUrl = 'http://192.168.1.100:3000';
}
```

**Important :** Assurez-vous que :
- Votre appareil mobile et votre ordinateur sont sur le **même réseau Wi-Fi**
- Votre pare-feu autorise les connexions sur le port 3000
- Votre serveur Next.js est démarré et écoute sur `0.0.0.0:3000` (pas seulement `localhost`)

### 4. Production (déploiement)

Si votre application Next.js est déployée (Vercel, Netlify, etc.) :

```dart
class ApiConfig {
  static const String baseUrl = 'https://votre-app.vercel.app';
}
```

## Vérifier que le serveur est accessible

### Test depuis votre appareil mobile

1. Ouvrez un navigateur sur votre appareil mobile
2. Allez à : `http://VOTRE_IP:3000` (ou `http://localhost:3000` pour simulateur)
3. Vous devriez voir votre application Next.js

### Test avec curl

```bash
# Depuis votre machine
curl http://localhost:3000/api/chat

# Depuis votre appareil (remplacez par votre IP)
curl http://192.168.1.100:3000/api/chat
```

## Démarrer Next.js pour accepter les connexions externes

Par défaut, Next.js écoute seulement sur `localhost`. Pour accepter les connexions depuis votre réseau local :

```bash
# Option 1: Utiliser l'IP directement
npm run dev -- -H 0.0.0.0

# Option 2: Modifier package.json
# Ajoutez dans "scripts": "dev": "next dev -H 0.0.0.0"
```

## Dépannage

### Erreur : "Connection refused"

1. ✅ Vérifiez que votre serveur Next.js est démarré
2. ✅ Vérifiez que l'URL dans `ApiConfig.baseUrl` est correcte
3. ✅ Pour appareil physique, utilisez votre IP locale (pas `localhost`)
4. ✅ Vérifiez que vous êtes sur le même réseau Wi-Fi
5. ✅ Vérifiez votre pare-feu

### Erreur : "Timeout"

1. ✅ Vérifiez votre connexion réseau
2. ✅ Vérifiez que le serveur Next.js répond (testez dans un navigateur)
3. ✅ Vérifiez que le port 3000 n'est pas bloqué

### Erreur : "Requested path is invalid"

1. ✅ Vérifiez que les routes `/api/chat` et `/api/chat/tts` existent
2. ✅ Vérifiez que votre serveur Next.js est bien démarré
3. ✅ Vérifiez les logs du serveur pour voir les erreurs

## Configuration recommandée par environnement

### Développement local (simulateur)
```dart
static const String baseUrl = 'http://localhost:3000';
```

### Développement local (appareil physique)
```dart
static const String baseUrl = 'http://192.168.1.100:3000'; // Votre IP locale
```

### Production
```dart
static const String baseUrl = 'https://votre-app.vercel.app';
```

