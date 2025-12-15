#!/bin/bash

# Script pour démarrer Caddy après installation/configuration

echo "🔧 Configuration de Caddy pour assistantfamilleai.ca"
echo "=================================================="

# Copier le Caddyfile
if [ -f "Caddyfile" ]; then
    echo "📋 Copie du Caddyfile vers /etc/caddy/Caddyfile..."
    sudo cp Caddyfile /etc/caddy/Caddyfile
else
    echo "❌ Erreur: Caddyfile non trouvé dans le répertoire courant"
    exit 1
fi

# Créer le répertoire de logs si nécessaire
echo "📁 Création du répertoire de logs..."
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy 2>/dev/null || sudo chown root:root /var/log/caddy

# Formater le Caddyfile
echo "✨ Formatage du Caddyfile..."
sudo caddy fmt /etc/caddy/Caddyfile

# Valider la configuration
echo "✅ Validation de la configuration..."
if sudo caddy validate --config /etc/caddy/Caddyfile; then
    echo "✅ Configuration valide!"
else
    echo "❌ Erreur dans la configuration"
    exit 1
fi

# Démarrer Caddy
echo "🚀 Démarrage de Caddy..."
sudo systemctl start caddy

# Activer au démarrage
sudo systemctl enable caddy

# Vérifier le statut
echo ""
echo "📊 Statut du service Caddy:"
sudo systemctl status caddy --no-pager

echo ""
echo "✅ Caddy est configuré et démarré!"
echo ""
echo "📝 Commandes utiles:"
echo "   Voir les logs:        sudo journalctl -u caddy -f"
echo "   Redémarrer:           sudo systemctl restart caddy"
echo "   Recharger config:     sudo systemctl reload caddy"
echo "   Arrêter:              sudo systemctl stop caddy"

