# Configuration Caddy pour FamilleWeb

Ce guide explique comment configurer Caddy comme reverse proxy pour FamilleWeb sur Rocky Linux.

## Prérequis

- Caddy installé sur le serveur
- L'application FamilleWeb fonctionne sur `localhost:3000`
- Le domaine `assistantfamilleai.ca` pointe vers l'IP du serveur

## Installation de Caddy sur Rocky Linux

```bash
# Ajouter le repository Caddy
sudo dnf install 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy

# Installer Caddy
sudo dnf install caddy
```

## Configuration

1. **Copier le Caddyfile** :
   ```bash
   sudo cp Caddyfile /etc/caddy/Caddyfile
   ```

2. **Créer le répertoire de logs** (si nécessaire) :
   ```bash
   sudo mkdir -p /var/log/caddy
   sudo chown caddy:caddy /var/log/caddy
   ```

3. **Tester la configuration** :
   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   ```

4. **Démarrer et activer Caddy** :
   ```bash
   sudo systemctl enable caddy
   sudo systemctl start caddy
   ```

5. **Vérifier le statut** :
   ```bash
   sudo systemctl status caddy
   ```

## Vérification des ports

Assurez-vous que les ports 80 et 443 sont ouverts dans le firewall :

```bash
# Avec firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Vérifier
sudo firewall-cmd --list-services
```

## Commandes utiles

**Voir les logs** :
```bash
sudo journalctl -u caddy -f
# ou
sudo tail -f /var/log/caddy/assistantfamilleai.ca.log
```

**Recharger la configuration** :
```bash
sudo systemctl reload caddy
```

**Redémarrer Caddy** :
```bash
sudo systemctl restart caddy
```

**Vérifier la configuration** :
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

**Tester en local** :
```bash
sudo caddy run --config /etc/caddy/Caddyfile
```

## Configuration DNS

Assurez-vous que votre domaine pointe vers l'IP du serveur :

- **Type A** : `assistantfamilleai.ca` → IP du serveur
- **Type A** : `www.assistantfamilleai.ca` → IP du serveur (optionnel, pour la redirection)

## HTTPS automatique

Caddy obtient et renouvelle automatiquement les certificats SSL/TLS via Let's Encrypt. Aucune configuration supplémentaire n'est nécessaire.

## Dépannage

### Caddy ne démarre pas

1. Vérifier les logs :
   ```bash
   sudo journalctl -u caddy -n 50
   ```

2. Vérifier que le port 3000 est bien utilisé par l'application :
   ```bash
   sudo netstat -tlnp | grep 3000
   # ou
   sudo ss -tlnp | grep 3000
   ```

3. Vérifier que le domaine pointe bien vers le serveur :
   ```bash
   dig assistantfamilleai.ca
   # ou
   nslookup assistantfamilleai.ca
   ```

### Certificat SSL ne s'obtient pas

- Vérifier que le port 80 est accessible depuis l'extérieur
- Vérifier que le domaine pointe bien vers l'IP du serveur
- Vérifier les logs de Caddy pour plus de détails

### L'application ne répond pas

1. Vérifier que l'application tourne sur le port 3000 :
   ```bash
   podman ps
   # ou
   sudo ss -tlnp | grep 3000
   ```

2. Tester l'application directement :
   ```bash
   curl http://localhost:3000
   ```

3. Vérifier les logs de l'application :
   ```bash
   podman-compose logs -f
   ```

## Configuration avancée

### Si vous avez besoin de WebSocket (pour Realtime Supabase)

Le Caddyfile actuel devrait déjà supporter WebSocket grâce à la configuration du reverse proxy. Si vous avez des problèmes, vous pouvez ajouter :

```caddy
reverse_proxy localhost:3000 {
    header_up Connection {>Connection}
    header_up Upgrade {>Upgrade}
}
```

### Rate limiting

Pour ajouter une limitation de débit :

```caddy
@limited {
    path /api/*
}
rate_limit @limited {
    zone api_limit {
        key {remote_host}
        events 100
        window 1m
    }
}
```

### Cache statique (optionnel)

Si vous servez des fichiers statiques :

```caddy
handle /_next/static/* {
    file_server
    header Cache-Control "public, max-age=31536000, immutable"
}
```
