#!/bin/bash

# Script pour construire et pousser l'image FamilleWeb vers Docker Hub avec Docker
# Construit pour linux/amd64
# Usage: ./build-and-push-docker.sh [version]

set -e

VERSION=${1:-latest}
IMAGE_NAME="famille-web"
DOCKER_HUB_REPO="reneloiselle/famille-web"
PLATFORM="linux/amd64"

echo "🔨 Construction de l'image ${IMAGE_NAME}:${VERSION} pour ${PLATFORM}..."

# Construction de l'image avec spécification de la plateforme
docker build --platform ${PLATFORM} -t ${IMAGE_NAME}:${VERSION} .

echo "🏷️  Tag de l'image pour Docker Hub..."

# Tag pour Docker Hub
docker tag ${IMAGE_NAME}:${VERSION} docker.io/${DOCKER_HUB_REPO}:${VERSION}

# Si c'est "latest", taguer aussi comme latest
if [ "$VERSION" != "latest" ]; then
    echo "🏷️  Tag aussi comme latest..."
    docker tag ${IMAGE_NAME}:${VERSION} docker.io/${DOCKER_HUB_REPO}:latest
fi

echo "📤 Push vers Docker Hub..."
echo "⚠️  Assurez-vous d'être connecté à Docker Hub (docker login)"

# Push vers Docker Hub
docker push docker.io/${DOCKER_HUB_REPO}:${VERSION}

if [ "$VERSION" != "latest" ]; then
    docker push docker.io/${DOCKER_HUB_REPO}:latest
fi

echo "✅ Image poussée avec succès!"
echo "   Image: docker.io/${DOCKER_HUB_REPO}:${VERSION}"
