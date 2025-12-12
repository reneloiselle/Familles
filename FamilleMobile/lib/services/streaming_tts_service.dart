import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:audioplayers/audioplayers.dart';
import 'openai_service.dart';
import 'audio_service.dart';

/// Service pour la lecture en streaming du TTS
/// Génère et lit l'audio au fur et à mesure que le texte arrive
class StreamingTTSService {
  final AudioPlayer _audioPlayer = AudioPlayer();
  final List<String> _audioQueue = [];
  bool _isPlaying = false;
  bool _isProcessing = false;
  String _accumulatedText = '';
  Timer? _chunkTimer;
  StreamSubscription<PlayerState>? _playerStateSubscription;
  static const int _chunkSize = 100; // Nombre de caractères par chunk
  static const Duration _chunkDelay = Duration(milliseconds: 2000); // Délai minimum entre chunks

  /// Démarre la lecture en streaming
  /// Appelé avec un stream de texte qui arrive progressivement
  Future<void> startStreaming(Stream<String> textStream) async {
    _accumulatedText = '';
    _isPlaying = true;
    _isProcessing = false;

    // Écouter le stream de texte
    textStream.listen(
      (chunk) {
        _accumulatedText += chunk;
        _processChunk();
      },
      onDone: () {
        // Traiter le dernier chunk
        if (_accumulatedText.isNotEmpty) {
          _generateAndQueueAudio(_accumulatedText);
          _accumulatedText = '';
        }
        // Marquer comme terminé
        _isProcessing = false;
      },
      onError: (error) {
        debugPrint('Erreur dans le stream de texte: $error');
        _isProcessing = false;
        _isPlaying = false;
      },
    );
  }

  /// Traite le texte accumulé et génère des chunks audio
  void _processChunk() {
    if (_isProcessing) return;

    // Si on a assez de texte, générer un chunk audio
    if (_accumulatedText.length >= _chunkSize) {
      final chunk = _accumulatedText.substring(0, _chunkSize);
      _accumulatedText = _accumulatedText.substring(_chunkSize);
      
      _generateAndQueueAudio(chunk);
    } else {
      // Utiliser un timer pour générer même avec moins de texte
      _chunkTimer?.cancel();
      _chunkTimer = Timer(_chunkDelay, () {
        if (_accumulatedText.isNotEmpty && _accumulatedText.length > 20) {
          final chunk = _accumulatedText;
          _accumulatedText = '';
          _generateAndQueueAudio(chunk);
        }
      });
    }
  }

  /// Génère l'audio pour un chunk de texte et l'ajoute à la queue
  Future<void> _generateAndQueueAudio(String text) async {
    if (text.trim().isEmpty) return;

    // Ne pas traiter si on n'est plus en mode playing
    if (!_isPlaying) return;

    try {
      _isProcessing = true;
      
      // Générer l'audio pour ce chunk
      final voice = await AudioService.getVoice();
      final speed = await AudioService.getSpeed();
      final model = await AudioService.getTTSModel();
      
      final audioPath = await OpenAIService.textToSpeech(
        text: text.trim(),
        voice: voice,
        speed: speed,
        model: model,
      );

      // Vérifier qu'on est toujours en mode playing avant d'ajouter
      if (!_isPlaying) {
        // Nettoyer le fichier si on a arrêté
        try {
          final file = File(audioPath);
          if (await file.exists() && audioPath.contains('openai_tts_') && !audioPath.contains('tts_cache')) {
            await file.delete();
          }
        } catch (e) {
          debugPrint('Erreur lors du nettoyage: $e');
        }
        _isProcessing = false;
        return;
      }

      // Ajouter à la queue
      _audioQueue.add(audioPath);
      
      // Si on n'est pas déjà en train de jouer, démarrer
      if (_audioPlayer.state != PlayerState.playing) {
        _playNextInQueue();
      }
      
      _isProcessing = false;
    } catch (e) {
      debugPrint('Erreur lors de la génération audio du chunk: $e');
      _isProcessing = false;
    }
  }

  /// Joue le prochain fichier dans la queue
  Future<void> _playNextInQueue() async {
    if (_audioQueue.isEmpty) {
      if (!_isProcessing) {
        _isPlaying = false;
      }
      return;
    }

    if (!_isPlaying) return;

    try {
      final audioPath = _audioQueue.removeAt(0);
      final file = File(audioPath);
      
      if (!await file.exists()) {
        // Fichier n'existe pas, passer au suivant
        _playNextInQueue();
        return;
      }

      // Annuler l'ancien listener s'il existe
      await _playerStateSubscription?.cancel();
      
      // Écouter la fin de la lecture pour passer au suivant
      _playerStateSubscription = _audioPlayer.onPlayerStateChanged.listen((state) {
        if (state == PlayerState.completed) {
          // Nettoyer le fichier temporaire
          try {
            if (audioPath.contains('openai_tts_') && !audioPath.contains('tts_cache')) {
              file.delete();
            }
          } catch (e) {
            debugPrint('Erreur lors de la suppression: $e');
          }
          
          // Jouer le suivant
          _playNextInQueue();
        }
      }, cancelOnError: true);

      await _audioPlayer.play(DeviceFileSource(audioPath));
    } catch (e) {
      debugPrint('Erreur lors de la lecture du chunk: $e');
      // Passer au suivant en cas d'erreur
      _playNextInQueue();
    }
  }

  /// Arrête la lecture en streaming
  Future<void> stop() async {
    _isPlaying = false;
    _isProcessing = false;
    _chunkTimer?.cancel();
    _audioQueue.clear();
    _accumulatedText = '';
    
    try {
      await _playerStateSubscription?.cancel();
      _playerStateSubscription = null;
      await _audioPlayer.stop();
    } catch (e) {
      debugPrint('Erreur lors de l\'arrêt: $e');
    }
  }

  /// Pause la lecture
  Future<void> pause() async {
    try {
      await _audioPlayer.pause();
    } catch (e) {
      debugPrint('Erreur lors de la pause: $e');
    }
  }

  /// Reprend la lecture
  Future<void> resume() async {
    try {
      await _audioPlayer.resume();
      if (_audioQueue.isNotEmpty) {
        _playNextInQueue();
      }
    } catch (e) {
      debugPrint('Erreur lors de la reprise: $e');
    }
  }

  /// Vérifie si la lecture est en cours
  bool get isPlaying => _isPlaying && _audioPlayer.state == PlayerState.playing;

  /// Stream des changements d'état
  Stream<PlayerState> get onPlayerStateChanged => _audioPlayer.onPlayerStateChanged;

  /// Libère les ressources
  Future<void> dispose() async {
    await stop();
    await _playerStateSubscription?.cancel();
    await _audioPlayer.dispose();
  }
}

