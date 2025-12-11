import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AudioService {
  static const String _autoPlayPrefKey = 'tts_auto_play';
  static const String _voicePrefKey = 'tts_voice';
  static const String _speedPrefKey = 'tts_speed';
  static const String _autoSendDictationPrefKey = 'auto_send_dictation';
  
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  bool _isLoading = false;

  /// Vérifie si la lecture automatique est activée
  static Future<bool> isAutoPlayEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_autoPlayPrefKey) ?? false;
  }

  /// Active ou désactive la lecture automatique
  static Future<bool> setAutoPlay(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.setBool(_autoPlayPrefKey, enabled);
  }

  /// Récupère la voix sélectionnée
  static Future<String> getVoice() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_voicePrefKey) ?? 'alloy';
  }

  /// Définit la voix
  static Future<bool> setVoice(String voice) async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.setString(_voicePrefKey, voice);
  }

  /// Récupère la vitesse de lecture
  static Future<double> getSpeed() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_speedPrefKey) ?? 1.0;
  }

  /// Définit la vitesse de lecture
  static Future<bool> setSpeed(double speed) async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.setDouble(_speedPrefKey, speed);
  }

  /// Vérifie si l'envoi automatique après dictée est activé
  static Future<bool> isAutoSendDictationEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_autoSendDictationPrefKey) ?? false;
  }

  /// Active ou désactive l'envoi automatique après dictée
  static Future<bool> setAutoSendDictation(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.setBool(_autoSendDictationPrefKey, enabled);
  }

  /// Joue un fichier audio
  Future<void> playAudio(String filePath) async {
    if (_isPlaying || _isLoading) {
      await stop();
    }

    try {
      _isLoading = true;
      await _audioPlayer.play(DeviceFileSource(filePath));
      _isPlaying = true;
      _isLoading = false;
    } catch (e) {
      _isLoading = false;
      _isPlaying = false;
      rethrow;
    }
  }

  /// Arrête la lecture
  Future<void> stop() async {
    try {
      await _audioPlayer.stop();
      _isPlaying = false;
    } catch (e) {
      // Ignorer les erreurs d'arrêt
    }
  }

  /// Pause la lecture
  Future<void> pause() async {
    try {
      await _audioPlayer.pause();
      _isPlaying = false;
    } catch (e) {
      // Ignorer les erreurs de pause
    }
  }

  /// Reprend la lecture
  Future<void> resume() async {
    try {
      await _audioPlayer.resume();
      _isPlaying = true;
    } catch (e) {
      // Ignorer les erreurs de reprise
    }
  }

  /// Vérifie si l'audio est en cours de lecture
  bool get isPlaying => _isPlaying;

  /// Vérifie si l'audio est en cours de chargement
  bool get isLoading => _isLoading;

  /// Stream des changements d'état de lecture
  Stream<PlayerState> get onPlayerStateChanged => _audioPlayer.onPlayerStateChanged;

  /// Libère les ressources
  Future<void> dispose() async {
    await stop();
    await _audioPlayer.dispose();
  }
}

