# Containerisation avec Docker ou Podman

Ce guide explique comment construire et pousser l'image FamilleWeb vers Docker Hub en utilisant Docker ou Podman. Les images sont construites pour **linux/amd64**.

## Guide rapide (résumé)

### Option 1 : Utiliser Docker

1. **S'authentifier sur Docker Hub** :
   ```bash
   docker login
   ```

2. **Utiliser le script helper** :
   ```bash
   cd FamilleWeb
   ./build-and-push-docker.sh
   ```

### Option 2 : Utiliser Podman

1. **S'authentifier sur Docker Hub** :
   ```bash
   podman login docker.io
   ```

2. **Utiliser le script helper** :
   ```bash
   cd FamilleWeb
   ./build-and-push.sh
   ```

### Scripts disponibles

- **`build-and-push-docker.sh`** : Pour utiliser Docker
- **`build-and-push.sh`** : Pour utiliser Podman

Les deux scripts construisent automatiquement pour **linux/amd64** et gèrent le tag et le push vers Docker Hub.

## Prérequis

- **Docker** OU **Podman** installé et configuré
- Compte Docker Hub (nom d'utilisateur: `reneloiselle`)
- Identifiants Docker Hub (nom d'utilisateur + mot de passe ou access token si 2FA activé)
- Accès aux variables d'environnement nécessaires (Supabase, etc.)

## Plateforme cible

Toutes les images sont construites pour **linux/amd64** pour garantir la compatibilité avec la plupart des serveurs cloud et machines.

## Construction de l'image

### Avec Docker

Depuis le répertoire `FamilleWeb`:

```bash
docker build --platform linux/amd64 -t famille-web:latest .
```

Ou avec un tag spécifique:

```bash
docker build --platform linux/amd64 -t famille-web:v0.1.0 .
```

### Avec Podman

Depuis le répertoire `FamilleWeb`:

```bash
podman build --platform linux/amd64 -t famille-web:latest .
```

Ou avec un tag spécifique:

```bash
podman build --platform linux/amd64 -t famille-web:v0.1.0 .
```

## Tag de l'image pour Docker Hub

Avant de pousser, vous devez taguer l'image avec votre nom d'utilisateur Docker Hub:

```bash
podman tag famille-web:latest docker.io/reneloiselle/famille-web:latest
```

Pour une version spécifique:

```bash
podman tag famille-web:v0.1.0 docker.io/reneloiselle/famille-web:v0.1.0
```

## Authentification sur Docker Hub

### Avec Docker

**Méthode interactive (recommandée)** :

```bash
docker login
```

Vous serez invité à entrer :
- **Username** : `reneloiselle` (ou votre nom d'utilisateur Docker Hub)
- **Password** : Votre mot de passe Docker Hub (ou un access token si vous avez activé l'authentification à deux facteurs)

### Avec Podman

**Méthode interactive (recommandée)** :

```bash
podman login docker.io
```

Vous serez invité à entrer :
- **Username** : `reneloiselle` (ou votre nom d'utilisateur Docker Hub)
- **Password** : Votre mot de passe Docker Hub (ou un access token si vous avez activé l'authentification à deux facteurs)

### Créer un Access Token sur Docker Hub (si 2FA activé)

Si vous avez activé l'authentification à deux facteurs (2FA) sur Docker Hub, vous devez créer un **Access Token** :

1. Allez sur https://hub.docker.com/settings/security
2. Cliquez sur "New Access Token"
3. Donnez un nom au token (ex: "docker-famille-web" ou "podman-famille-web")
4. Copiez le token (il ne sera affiché qu'une seule fois)
5. Utilisez ce token comme mot de passe lors de `docker login` ou `podman login docker.io`

### Vérifier que vous êtes connecté

**Avec Docker** :
```bash
docker info | grep Username
```

**Avec Podman** :
```bash
podman login docker.io --get-login
```

Ces commandes affichent votre nom d'utilisateur si vous êtes connecté.

## Tag de l'image pour Docker Hub

Avant de pousser, vous devez tagger l'image avec votre nom d'utilisateur Docker Hub:

**Avec Docker** :
```bash
docker tag famille-web:latest docker.io/reneloiselle/famille-web:latest
```

**Avec Podman** :
```bash
podman tag famille-web:latest docker.io/reneloiselle/famille-web:latest
```

Pour une version spécifique, remplacez `latest` par la version (ex: `v0.1.0`).

## Push vers Docker Hub

**Avec Docker** :
```bash
docker push docker.io/reneloiselle/famille-web:latest
```

**Avec Podman** :
```bash
podman push docker.io/reneloiselle/famille-web:latest
```

Pour une version spécifique, remplacez `latest` par la version (ex: `v0.1.0`).

## Exécution du conteneur

L'application nécessite des variables d'environnement. Créez un fichier `.env` ou passez-les lors de l'exécution:

**Avec Docker** :
```bash
docker run -d \
  --name famille-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="votre-url" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-key" \
  --env-file .env \
  docker.io/reneloiselle/famille-web:latest
```

**Avec Podman** :
```bash
podman run -d \
  --name famille-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="votre-url" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-key" \
  --env-file .env \
  docker.io/reneloiselle/famille-web:latest
```

## Déploiement sur serveur cloud

Pour déployer l'application sur un serveur cloud avec Podman, utilisez le script de déploiement fourni.

### Prérequis sur le serveur

- Podman installé
- `podman-compose` installé (`pip3 install podman-compose`)

### Fichiers de déploiement

- **`podman-compose.yml`** : Configuration pour podman-compose
- **`deploy.sh`** : Script de déploiement automatique

### Étapes de déploiement

1. **Copier les fichiers sur le serveur** :
   ```bash
   scp podman-compose.yml deploy.sh user@votre-serveur:/chemin/vers/app/
   ```

2. **Créer le fichier `.prodenv` sur le serveur** :
   ```bash
   # Sur le serveur
   nano .prodenv
   ```
   
   Ajoutez vos variables d'environnement :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
   SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
   ```

3. **Exécuter le script de déploiement** :
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   Pour une version spécifique :
   ```bash
   ./deploy.sh v0.1.0
   ```

### Commandes utiles

**Voir les logs** :
```bash
podman-compose -f podman-compose.yml logs -f
```

**Arrêter l'application** :
```bash
podman-compose -f podman-compose.yml down
```

**Redémarrer l'application** :
```bash
podman-compose -f podman-compose.yml restart
```

**Voir le statut** :
```bash
podman-compose -f podman-compose.yml ps
```

**Mettre à jour vers une nouvelle version** :
```bash
./deploy.sh nouvelle-version
```

## Variables d'environnement requises

- `NEXT_PUBLIC_SUPABASE_URL`: URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clé service role (pour les opérations backend)
- Autres variables selon vos besoins (API keys, etc.)

## Optimisations

L'image utilise une construction multi-stage pour réduire la taille finale. L'image finale contient uniquement les fichiers nécessaires pour l'exécution en production.
