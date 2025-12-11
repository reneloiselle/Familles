import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter/material.dart';
import 'dart:async';

class SpeechService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isInitialized = false;
  bool _isListening = false;
  String _lastWords = '';
  String? _lastError;

  /// Initialise le service de reconnaissance vocale avec retry
  Future<bool> initialize({int maxRetries = 3}) async {
    if (_isInitialized) return true;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        _lastError = null;
        
        final available = await _speech.initialize(
          onError: (error) {
            _lastError = error.errorMsg;
            debugPrint('Erreur de reconnaissance vocale: ${error.errorMsg}');
            // Réinitialiser l'état si erreur critique
            _isListening = false;
          },
          onStatus: (status) {
            debugPrint('Statut de reconnaissance vocale: $status');
            // Mettre à jour l'état d'écoute basé sur le statut réel
            final statusStr = status.toString().toLowerCase();
            if (statusStr.contains('done') || statusStr.contains('notlistening') || statusStr.contains('not_listening')) {
              _isListening = false;
            } else if (statusStr.contains('listening')) {
              _isListening = true;
            }
          },
        );

        if (available) {
          _isInitialized = true;
          return true;
        } else if (attempt < maxRetries) {
          // Attendre avant de réessayer
          await Future.delayed(Duration(milliseconds: 500 * attempt));
        }
      } catch (e) {
        debugPrint('Erreur d\'initialisation de la reconnaissance vocale (tentative $attempt/$maxRetries): $e');
        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 500 * attempt));
        }
      }
    }

    debugPrint('Échec de l\'initialisation après $maxRetries tentatives');
    return false;
  }

  /// Vérifie si la reconnaissance vocale est disponible
  Future<bool> isAvailable() async {
    if (!_isInitialized) {
      await initialize();
    }
    return _isInitialized && _speech.isAvailable;
  }

  /// Vérifie les permissions du microphone
  Future<bool> checkPermissions() async {
    if (!_isInitialized) {
      await initialize();
    }
    // Le plugin speech_to_text vérifie automatiquement les permissions
    // mais on peut vérifier si le service est disponible
    return _isInitialized && _speech.isAvailable;
  }

  /// Démarre l'écoute avec meilleure gestion d'erreur
  Future<bool> startListening({
    String localeId = 'fr_FR',
    Function(String)? onResult,
    Function()? onDone,
    Function(String)? onError,
    int timeoutSeconds = 10,
  }) async {
    // Réinitialiser si nécessaire
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) {
        onError?.call('Impossible d\'initialiser la reconnaissance vocale');
        return false;
      }
    }

    // Vérifier la disponibilité
    if (!_speech.isAvailable) {
      onError?.call('La reconnaissance vocale n\'est pas disponible sur cet appareil');
      return false;
    }

    // Arrêter l'écoute en cours si nécessaire
    if (_isListening) {
      try {
        await stopListening();
        // Attendre un peu pour que l'arrêt soit complet
        await Future.delayed(const Duration(milliseconds: 300));
      } catch (e) {
        debugPrint('Erreur lors de l\'arrêt de l\'écoute précédente: $e');
      }
    }

    try {
      _lastWords = '';
      _lastError = null;
      _isListening = true;

      // Démarrer l'écoute avec timeout
      await _speech.listen(
        onResult: (result) {
          _lastWords = result.recognizedWords;
          if (onResult != null) {
            onResult(result.recognizedWords);
          }
          if (result.finalResult) {
            _isListening = false;
            if (onDone != null) {
              onDone();
            }
          }
        },
        localeId: localeId,
        listenMode: stt.ListenMode.confirmation,
        pauseFor: const Duration(seconds: 3),
        cancelOnError: false, // Ne pas annuler automatiquement pour mieux gérer les erreurs
        partialResults: true,
        listenFor: Duration(seconds: timeoutSeconds),
      );

      // Attendre un peu pour vérifier si l'écoute a vraiment démarré
      await Future.delayed(const Duration(milliseconds: 500));

      // Vérifier l'état réel
      if (!_speech.isListening && _isListening) {
        // L'écoute n'a pas démarré malgré notre tentative
        _isListening = false;
        final errorMsg = _lastError ?? 'Impossible de démarrer l\'écoute. Vérifiez les permissions du microphone.';
        onError?.call(errorMsg);
        return false;
      }

      return true;
    } catch (e) {
      debugPrint('Erreur lors du démarrage de l\'écoute: $e');
      _isListening = false;
      final errorMsg = 'Erreur: ${e.toString()}';
      onError?.call(errorMsg);
      return false;
    }
  }

  /// Arrête l'écoute et retourne le texte final
  Future<String> stopListening() async {
    if (_isListening || _speech.isListening) {
      try {
        await _speech.stop();
        // Attendre un peu pour que l'arrêt soit complet
        await Future.delayed(const Duration(milliseconds: 200));
      } catch (e) {
        debugPrint('Erreur lors de l\'arrêt de l\'écoute: $e');
      } finally {
        _isListening = false;
      }
    }
    return _lastWords;
  }

  /// Annule l'écoute
  Future<void> cancelListening() async {
    if (_isListening || _speech.isListening) {
      try {
        await _speech.cancel();
        // Attendre un peu pour que l'annulation soit complète
        await Future.delayed(const Duration(milliseconds: 200));
      } catch (e) {
        debugPrint('Erreur lors de l\'annulation de l\'écoute: $e');
      } finally {
        _isListening = false;
        _lastWords = '';
      }
    }
  }

  /// Force l'arrêt et la réinitialisation
  Future<void> forceStop() async {
    try {
      if (_speech.isListening) {
        await _speech.cancel();
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'arrêt forcé: $e');
    } finally {
      _isListening = false;
      _lastWords = '';
    }
  }

  /// Récupère les derniers mots reconnus
  String get lastWords => _lastWords;

  /// Vérifie si l'écoute est en cours (état réel)
  bool get isListening => _isListening && _speech.isListening;

  /// Récupère la dernière erreur
  String? get lastError => _lastError;

  /// Récupère les locales disponibles
  Future<List<stt.LocaleName>> getAvailableLocales() async {
    if (!_isInitialized) {
      await initialize();
    }
    try {
      return await _speech.locales();
    } catch (e) {
      debugPrint('Erreur lors de la récupération des locales: $e');
      return [];
    }
  }

  /// Réinitialise le service
  Future<void> reset() async {
    await forceStop();
    _isInitialized = false;
    _lastError = null;
  }

  /// Dispose des ressources
  void dispose() {
    forceStop();
  }
}

