import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter/material.dart';

class SpeechService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isInitialized = false;
  bool _isListening = false;
  String _lastWords = '';

  /// Initialise le service de reconnaissance vocale
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      final available = await _speech.initialize(
        onError: (error) {
          debugPrint('Erreur de reconnaissance vocale: $error');
        },
        onStatus: (status) {
          debugPrint('Statut de reconnaissance vocale: $status');
        },
      );

      _isInitialized = available;
      return available;
    } catch (e) {
      debugPrint('Erreur d\'initialisation de la reconnaissance vocale: $e');
      return false;
    }
  }

  /// Vérifie si la reconnaissance vocale est disponible
  Future<bool> isAvailable() async {
    if (!_isInitialized) {
      await initialize();
    }
    return _isInitialized && _speech.isAvailable;
  }

  /// Démarre l'écoute
  Future<bool> startListening({
    String localeId = 'fr_FR',
    Function(String)? onResult,
    Function()? onDone,
  }) async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) {
        return false;
      }
    }

    if (_isListening) {
      await stopListening();
    }

    try {
      _lastWords = '';
      _isListening = true;

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
        cancelOnError: true,
        partialResults: true,
      );

      return true;
    } catch (e) {
      debugPrint('Erreur lors du démarrage de l\'écoute: $e');
      _isListening = false;
      return false;
    }
  }

  /// Arrête l'écoute et retourne le texte final
  Future<String> stopListening() async {
    if (_isListening) {
      await _speech.stop();
      _isListening = false;
      // Retourner le dernier texte reconnu
      return _lastWords;
    }
    return _lastWords;
  }

  /// Annule l'écoute
  Future<void> cancelListening() async {
    if (_isListening) {
      await _speech.cancel();
      _isListening = false;
      _lastWords = '';
    }
  }

  /// Récupère les derniers mots reconnus
  String get lastWords => _lastWords;

  /// Vérifie si l'écoute est en cours
  bool get isListening => _isListening;

  /// Récupère les locales disponibles
  Future<List<stt.LocaleName>> getAvailableLocales() async {
    if (!_isInitialized) {
      await initialize();
    }
    return _speech.locales();
  }
}

