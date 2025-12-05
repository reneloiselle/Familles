# Configuration Syncfusion Calendar

## Installation

Pour utiliser le calendrier Syncfusion en mode ressource dans l'application, vous devez :

1. **Installer les dépendances** :
```bash
flutter pub get
```

2. **Obtenir une licence Syncfusion** (gratuite pour les projets open source ou avec une licence communautaire) :
   - Visitez https://www.syncfusion.com/products/flutter/calendar
   - Créez un compte et obtenez votre licence
   - Ajoutez la licence dans votre code (voir ci-dessous)

3. **Ajouter la licence dans votre code** :
   
   Dans `lib/main.dart`, ajoutez avant `runApp()` :
   
```dart
import 'package:syncfusion_flutter_core/theme.dart';

void main() {
  // Ajoutez votre clé de licence ici
  SyncfusionLicense.registerLicense('VOTRE_CLE_LICENCE_ICI');
  
  runApp(const MyApp());
}
```

## Utilisation

Le calendrier Syncfusion en mode ressource est maintenant intégré dans la vue famille de l'agenda. 

### Fonctionnalités

- **Vue ressource** : Chaque membre de la famille apparaît comme une ressource dans le calendrier
- **Couleurs distinctes** : Chaque membre a une couleur unique pour faciliter l'identification
- **Interaction** :
  - **Tap** : Affiche les détails de l'événement
  - **Long press** : Supprime l'événement (pour les parents uniquement)
- **Navigation** : Navigation entre les semaines avec les flèches
- **Sélection de date** : Bouton pour sélectionner une date spécifique

### Vue

Le calendrier utilise la vue `workWeek` (semaine de travail) qui affiche :
- Les jours de la semaine (lundi à dimanche)
- Les créneaux horaires (par défaut toutes les 30 minutes)
- Les ressources (membres de famille) sur le côté gauche

## Personnalisation

Vous pouvez personnaliser le calendrier en modifiant `lib/widgets/family_calendar_view.dart` :

- **Vue** : Changez `CalendarView.workWeek` pour `CalendarView.week`, `CalendarView.month`, etc.
- **Couleurs** : Modifiez la liste `colors` dans `_getColorForMember()`
- **Intervalle de temps** : Modifiez `timeInterval` dans `TimeSlotViewSettings`
- **Taille des ressources** : Modifiez `size` dans `ResourceViewSettings`

## Notes

- Le calendrier nécessite une licence Syncfusion pour fonctionner en production
- En développement, une licence d'évaluation est disponible
- Pour les projets open source, Syncfusion offre des licences gratuites

