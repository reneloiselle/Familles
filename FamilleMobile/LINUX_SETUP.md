# Configuration Linux pour Flutter

## Problème

L'application Flutter ne compile pas sur Linux car le plugin `audioplayers_linux` nécessite des dépendances système GStreamer qui ne sont pas installées.

## Solution

Installez les dépendances GStreamer nécessaires :

```bash
sudo apt-get update
sudo apt-get install -y \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav
```

## Vérification

Après l'installation, vérifiez que les dépendances sont disponibles :

```bash
pkg-config --modversion gstreamer-1.0
pkg-config --modversion gstreamer-app-1.0
pkg-config --modversion gstreamer-audio-1.0
```

## Compilation

Une fois les dépendances installées, vous pouvez compiler l'application :

```bash
cd FamilleMobile
flutter clean
flutter pub get
flutter build linux
```

Ou pour lancer directement :

```bash
flutter run -d linux
```

## Alternative : Désactiver audioplayers sur Linux

Si vous ne souhaitez pas utiliser la fonctionnalité audio sur Linux, vous pouvez conditionner l'utilisation d'audioplayers :

1. Vérifier la plateforme avant d'utiliser audioplayers
2. Utiliser des imports conditionnels
3. Fournir des implémentations alternatives pour Linux

### Solution rapide : Installation des dépendances

Exécutez simplement cette commande dans votre terminal :

```bash
sudo apt-get update && sudo apt-get install -y libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav
```

Puis relancez la compilation :

```bash
flutter clean
flutter pub get
flutter run -d linux
```

## Notes

- Les dépendances GStreamer sont nécessaires uniquement pour le plugin `audioplayers_linux`
- Si vous n'utilisez pas la fonctionnalité audio dans votre application, vous pouvez envisager de rendre ce plugin optionnel
- Ces dépendances sont uniquement nécessaires pour la compilation, pas pour l'exécution (les plugins sont déjà compilés)

