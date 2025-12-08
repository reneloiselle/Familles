# Configuration Google Maps API

Pour utiliser la fonctionnalité de sélection de localisation avec Google Maps, vous devez configurer une clé API Google Maps.

## Étapes de configuration

### 1. Créer une clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez les APIs suivantes :
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Allez dans "Identifiants" > "Créer des identifiants" > "Clé API"
5. Copiez votre clé API

### 2. Configurer les restrictions (recommandé)

Pour sécuriser votre clé API :

1. Allez dans "Identifiants" > Sélectionnez votre clé API
2. Configurez les restrictions :
   - **Restrictions d'application** : Restreignez par domaine HTTP (ex: `localhost`, `votre-domaine.com`)
   - **Restrictions d'API** : Limitez aux APIs suivantes :
     - Maps JavaScript API
     - Places API
     - Geocoding API

### 3. Ajouter la clé API à votre projet

Ajoutez la variable d'environnement suivante dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre-clé-api-ici
```

**Important** : Le préfixe `NEXT_PUBLIC_` est nécessaire pour que la variable soit accessible côté client dans Next.js.

### 4. Redémarrer le serveur de développement

Après avoir ajouté la variable d'environnement, redémarrez votre serveur de développement :

```bash
npm run dev
```

## Utilisation

Une fois configuré, vous pouvez :

1. Cliquer sur le bouton "Carte" à côté du champ de localisation
2. Rechercher une adresse dans le champ de recherche (autocomplete Google Places)
3. Cliquer directement sur la carte pour sélectionner un point
4. L'adresse sélectionnée sera automatiquement remplie dans le champ

## Notes importantes

- La clé API est exposée côté client (d'où le préfixe `NEXT_PUBLIC_`)
- Assurez-vous de configurer les restrictions d'application pour limiter l'utilisation
- Google Maps propose un crédit gratuit mensuel (voir [tarification](https://mapsplatform.google.com/pricing/))
- Pour la production, configurez des restrictions strictes par domaine

