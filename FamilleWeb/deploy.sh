#!/bin/bash

# Script de déploiement pour FamilleWeb sur serveur cloud avec Podman
# Usage: ./deploy.sh [version]

set -e

VERSION=${1:-latest}
IMAGE_NAME="docker.io/reneloiselle/famille-web:${VERSION}"
COMPOSE_FILE="podman-compose.yml"

echo "🚀 Déploiement de FamilleWeb version: ${VERSION}"
echo "=========================================="

# Vérifier que podman est installé
if ! command -v podman &> /dev/null; then
    echo "❌ Erreur: Podman n'est pas installé"
    echo "   Installez-le avec: sudo dnf install podman (RHEL/CentOS) ou sudo apt install podman (Debian/Ubuntu)"
    exit 1
fi

# Vérifier que podman-compose est installé
if ! command -v podman-compose &> /dev/null; then
    echo "❌ Erreur: podman-compose n'est pas installé"
    echo "   Installez-le avec: pip3 install podman-compose"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Avertissement: Le fichier .env n'existe pas"
    echo "   Créez un fichier .env avec vos variables d'environnement"
    echo ""
    echo "   Exemple de contenu:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon"
    echo "   SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key"
    echo ""
    read -p "Voulez-vous continuer quand même? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Vérifier que podman-compose.yml existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Erreur: Le fichier $COMPOSE_FILE n'existe pas"
    exit 1
fi

echo ""
echo "📥 Téléchargement de l'image depuis Docker Hub..."
podman pull ${IMAGE_NAME}

# Si on pull une version spécifique, tagger aussi comme latest pour podman-compose
if [ "$VERSION" != "latest" ]; then
    echo "🏷️  Tag de l'image comme latest..."
    podman tag ${IMAGE_NAME} docker.io/reneloiselle/famille-web:latest
fi

echo ""
echo "🛑 Arrêt des conteneurs existants (s'il y en a)..."
podman-compose -f ${COMPOSE_FILE} down || true

echo ""
echo "🚀 Démarrage des conteneurs..."
podman-compose -f ${COMPOSE_FILE} up -d

echo ""
echo "⏳ Attente du démarrage de l'application..."
sleep 5

echo ""
echo "📊 Statut des conteneurs:"
podman-compose -f ${COMPOSE_FILE} ps

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📝 Commandes utiles:"
echo "   Voir les logs:        podman-compose -f ${COMPOSE_FILE} logs -f"
echo "   Arrêter:              podman-compose -f ${COMPOSE_FILE} down"
echo "   Redémarrer:           podman-compose -f ${COMPOSE_FILE} restart"
echo "   Voir le statut:       podman-compose -f ${COMPOSE_FILE} ps"
echo "   Mettre à jour:        ./deploy.sh nouvelle-version"
echo ""
echo "🌐 L'application devrait être accessible sur http://localhost:3000"
echo "   (ou sur l'IP de votre serveur si vous avez configuré un reverse proxy)"
