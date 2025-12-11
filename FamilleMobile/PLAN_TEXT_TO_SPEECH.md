# Plan d'utilisation du Text-to-Speech OpenAI

## 📋 Vue d'ensemble

Ce document décrit le plan d'utilisation et d'amélioration du système Text-to-Speech (TTS) d'OpenAI dans l'application Flutter.

## 🏗️ Architecture actuelle

### 1. **Côté Serveur (Next.js)**
- **Route API** : `/api/chat/tts`
- **Fichier** : `FamilleWeb/app/api/chat/tts/route.ts`
- **Fonctionnalités** :
  - Authentification via Supabase
  - Appel à l'API OpenAI TTS (`tts-1` model)
  - Retour de l'audio en base64
  - Gestion des erreurs (quota, authentification, etc.)

### 2. **Côté Client (Flutter)**
- **Service** : `OpenAIService.textToSpeech()`
- **Fichier** : `FamilleMobile/lib/services/openai_service.dart`
- **Service Audio** : `AudioService`
- **Fichier** : `FamilleMobile/lib/services/audio_service.dart`

### 3. **Interface Utilisateur**
- **Écran** : `ChatScreen`
- **Paramètres** : Dialog `_TTSSettingsDialog`
- **Fonctionnalités** :
  - Lecture automatique des réponses
  - Bouton de lecture manuelle par message
  - Paramètres de voix et vitesse

## 🎯 Fonctionnalités actuelles

### ✅ Implémentées
1. **Génération audio** : Conversion texte → audio via OpenAI
2. **Lecture audio** : Utilisation de `audioplayers` pour jouer l'audio
3. **Paramètres configurables** :
   - Voix : alloy, echo, fable, onyx, nova, shimmer
   - Vitesse : 0.5x à 2.0x
4. **Lecture automatique** : Option pour lire automatiquement les réponses
5. **Lecture manuelle** : Bouton de lecture par message
6. **Gestion d'état** : Suivi de la lecture en cours

## 🚀 Plan d'amélioration

### Phase 1 : Optimisations de base ⚡

#### 1.1 Cache des fichiers audio
- **Objectif** : Éviter de régénérer le même audio
- **Implémentation** :
  - Stocker les fichiers audio générés avec hash du texte
  - Vérifier le cache avant de générer
  - Nettoyer le cache périodiquement
- **Bénéfice** : Réduction des coûts API et amélioration de la performance

#### 1.2 Gestion de la mémoire
- **Objectif** : Éviter l'accumulation de fichiers temporaires
- **Implémentation** :
  - Nettoyer automatiquement les fichiers après lecture
  - Limiter le nombre de fichiers en cache
  - Gérer les erreurs de suppression
- **Bénéfice** : Meilleure gestion de l'espace disque

#### 1.3 Gestion des erreurs améliorée
- **Objectif** : Meilleure expérience utilisateur en cas d'erreur
- **Implémentation** :
  - Messages d'erreur plus clairs
  - Retry automatique en cas d'échec réseau
  - Fallback vers lecture système si TTS échoue
- **Bénéfice** : Robustesse accrue

### Phase 2 : Fonctionnalités avancées 🎨

#### 2.1 Streaming audio (optionnel)
- **Objectif** : Commencer la lecture pendant la génération
- **Implémentation** :
  - Streamer l'audio depuis le serveur
  - Buffer pour lecture fluide
  - Gestion de la latence réseau
- **Bénéfice** : Expérience plus réactive
- **Note** : Complexité élevée, à évaluer selon les besoins

#### 2.2 Prévisualisation des voix
- **Objectif** : Permettre d'écouter un échantillon avant de choisir
- **Implémentation** :
  - Bouton "Écouter" pour chaque voix
  - Texte d'exemple standardisé
  - Cache des échantillons
- **Bénéfice** : Meilleure sélection de voix

#### 2.3 Lecture par paragraphe
- **Objectif** : Lire les longs messages par sections
- **Implémentation** :
  - Détection des paragraphes
  - Génération audio par section
  - Lecture séquentielle avec pause
- **Bénéfice** : Meilleure compréhension des longs textes

#### 2.4 Contrôles de lecture avancés
- **Objectif** : Plus de contrôle sur la lecture
- **Implémentation** :
  - Bouton pause/reprendre
  - Barre de progression
  - Vitesse de lecture ajustable pendant la lecture
  - Saut de phrase/paragraphe
- **Bénéfice** : Expérience utilisateur améliorée

### Phase 3 : Intégration avec le streaming 🎬

#### 3.1 TTS en temps réel pendant le streaming
- **Objectif** : Générer et lire l'audio pendant que le texte arrive
- **Implémentation** :
  - Buffer de texte pour TTS (ex: 50 mots)
  - Génération audio par chunks
  - Concaténation audio fluide
  - Synchronisation texte/audio
- **Bénéfice** : Expérience immersive
- **Complexité** : Très élevée

#### 3.2 TTS après streaming complet
- **Objectif** : Lire automatiquement après réception complète
- **Implémentation** :
  - Détecter la fin du stream
  - Générer l'audio complet
  - Lancer la lecture automatiquement
- **Bénéfice** : Simple et efficace
- **Statut** : ✅ Déjà implémenté

### Phase 4 : Optimisations de coûts 💰

#### 4.1 Limite de longueur
- **Objectif** : Éviter les coûts excessifs pour très longs textes
- **Implémentation** :
  - Limite configurable (ex: 5000 caractères)
  - Avertissement si limite dépassée
  - Option de tronquer ou lire par sections
- **Bénéfice** : Contrôle des coûts

#### 4.2 Choix du modèle
- **Objectif** : Utiliser `tts-1-hd` pour qualité, `tts-1` pour vitesse
- **Implémentation** :
  - Option dans les paramètres
  - `tts-1` : Plus rapide, moins cher
  - `tts-1-hd` : Meilleure qualité, plus cher
- **Bénéfice** : Flexibilité qualité/coût

#### 4.3 Désactivation conditionnelle
- **Objectif** : Économiser sur les messages courts
- **Implémentation** :
  - Option "Ne pas lire si < X mots"
  - Détection automatique
- **Bénéfice** : Économies sur messages courts

## 📝 Implémentation recommandée (priorités)

### Priorité 1 : Essentiel ⭐⭐⭐
1. ✅ **Cache des fichiers audio** - Réduction des coûts
2. ✅ **Nettoyage automatique** - Gestion mémoire
3. ✅ **Gestion d'erreurs améliorée** - Robustesse

### Priorité 2 : Important ⭐⭐
4. **Prévisualisation des voix** - UX améliorée
5. **Contrôles de lecture avancés** - Meilleure expérience
6. **Limite de longueur** - Contrôle des coûts

### Priorité 3 : Optionnel ⭐
7. **Lecture par paragraphe** - Pour longs textes
8. **Choix du modèle** - Flexibilité qualité/coût
9. **Streaming audio** - Expérience premium

## 🔧 Configuration actuelle

### Variables d'environnement
```env
OPENAI_API_KEY=votre-cle-openai-ici
```

### Modèle OpenAI utilisé
- **Modèle** : `tts-1` (rapide et économique)
- **Voix disponibles** : alloy, echo, fable, onyx, nova, shimmer
- **Vitesse** : 0.5x à 2.0x

### Stockage
- **Format** : MP3
- **Emplacement** : Répertoire temporaire de l'appareil
- **Nettoyage** : Après lecture (actuellement)

## 📊 Métriques à surveiller

1. **Coûts API** : Nombre de requêtes TTS par jour
2. **Performance** : Temps de génération audio
3. **Utilisation** : Taux d'activation de la lecture auto
4. **Erreurs** : Taux d'échec de génération/lecture
5. **Stockage** : Espace disque utilisé par les fichiers audio

## 🐛 Problèmes connus

1. **Fichiers temporaires** : Peuvent s'accumuler en cas d'erreur
2. **Pas de cache** : Régénération du même audio
3. **Pas de retry** : Échec définitif en cas d'erreur réseau
4. **Pas de limite** : Coûts potentiellement élevés pour longs textes

## 🎯 Prochaines étapes

1. **Implémenter le cache** (Priorité 1)
2. **Améliorer le nettoyage** (Priorité 1)
3. **Ajouter les contrôles avancés** (Priorité 2)
4. **Surveiller les coûts** (Ongoing)

## 📚 Ressources

- [Documentation OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech)
- [API Reference](https://platform.openai.com/docs/api-reference/audio)
- [Modèles disponibles](https://platform.openai.com/docs/models/tts)

## 💡 Notes importantes

- Le TTS fonctionne uniquement avec une connexion Internet
- Les fichiers audio sont temporaires et supprimés après lecture
- La qualité audio dépend du modèle choisi (`tts-1` vs `tts-1-hd`)
- Les coûts varient selon la longueur du texte et le modèle utilisé

