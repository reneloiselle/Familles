import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';

/// Exception personnalisée pour les erreurs OpenAI
class OpenAIException implements Exception {
  final String message;
  final String? type;
  final int? statusCode;

  OpenAIException(this.message, {this.type, this.statusCode});

  @override
  String toString() => message;
}

class OpenAIService {
  static const String _apiKeyPrefKey = 'openai_api_key';
  static const String _apiUrl = 'https://api.openai.com/v1/chat/completions';
  static const String _ttsUrl = 'https://api.openai.com/v1/audio/speech';

  /// Récupère la clé API stockée
  static Future<String?> getApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_apiKeyPrefKey);
  }

  /// Sauvegarde la clé API
  static Future<bool> setApiKey(String apiKey) async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.setString(_apiKeyPrefKey, apiKey);
  }

  /// Supprime la clé API
  static Future<bool> removeApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    return await prefs.remove(_apiKeyPrefKey);
  }

  /// Vérifie si une clé API est configurée
  static Future<bool> hasApiKey() async {
    final apiKey = await getApiKey();
    return apiKey != null && apiKey.isNotEmpty;
  }

  /// Envoie un message à OpenAI et récupère la réponse
  static Future<String> sendMessage({
    required String message,
    required List<Map<String, String>> conversationHistory,
  }) async {
    final apiKey = await getApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('Clé API OpenAI non configurée');
    }

    // Construire l'historique de conversation au format OpenAI
    final messages = <Map<String, dynamic>>[
      {
        'role': 'system',
        'content': 'Tu es un assistant utile et amical. Tu réponds en français de manière claire et concise.',
      },
      ...conversationHistory.map((msg) => {
            'role': msg['role'],
            'content': msg['content'],
          }),
      {
        'role': 'user',
        'content': message,
      },
    ];

    try {
      final response = await http.post(
        Uri.parse(_apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': 'gpt-3.5-turbo',
          'messages': messages,
          'temperature': 0.7,
          'max_tokens': 1000,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final choices = data['choices'] as List;
        if (choices.isNotEmpty) {
          final message = choices[0]['message'] as Map<String, dynamic>;
          return message['content'] as String;
        }
        throw OpenAIException('Aucune réponse reçue d\'OpenAI');
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final error = errorData['error'] as Map<String, dynamic>?;
        final errorMessage = error?['message'] as String? ?? 'Erreur inconnue';
        final errorType = error?['type'] as String?;
        
        // Gestion spécifique des erreurs de quota
        if (response.statusCode == 429 || 
            errorMessage.toLowerCase().contains('quota') ||
            errorMessage.toLowerCase().contains('exceeded') ||
            errorMessage.toLowerCase().contains('rate limit')) {
          throw OpenAIException(
            'Vous avez dépassé votre quota OpenAI. Veuillez vérifier votre compte OpenAI ou attendre la réinitialisation de votre quota.',
            type: 'quota_exceeded',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs d'authentification
        if (response.statusCode == 401) {
          throw OpenAIException(
            'Clé API invalide. Veuillez vérifier votre clé API dans les paramètres.',
            type: 'invalid_api_key',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs de paiement
        if (response.statusCode == 402 || errorType == 'insufficient_quota') {
          throw OpenAIException(
            'Votre compte OpenAI n\'a pas de crédits suffisants. Veuillez ajouter des crédits à votre compte OpenAI.',
            type: 'insufficient_quota',
            statusCode: response.statusCode,
          );
        }
        
        throw OpenAIException(
          'Erreur OpenAI: $errorMessage',
          type: errorType,
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is OpenAIException) {
        rethrow;
      }
      if (e is FormatException) {
        throw OpenAIException('Erreur de format de réponse: ${e.toString()}');
      }
      throw OpenAIException('Erreur de connexion: ${e.toString()}');
    }
  }

  /// Génère un fichier audio à partir d'un texte en utilisant l'API TTS d'OpenAI
  /// Retourne le chemin du fichier audio généré
  static Future<String> textToSpeech({
    required String text,
    String voice = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
    double speed = 1.0,
  }) async {
    final apiKey = await getApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      throw OpenAIException('Clé API OpenAI non configurée');
    }

    try {
      final response = await http.post(
        Uri.parse(_ttsUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $apiKey',
        },
        body: jsonEncode({
          'model': 'tts-1', // ou 'tts-1-hd' pour une meilleure qualité
          'input': text,
          'voice': voice,
          'speed': speed,
        }),
      );

      if (response.statusCode == 200) {
        // Sauvegarder le fichier audio temporaire
        final tempDir = await getTemporaryDirectory();
        final audioFile = File('${tempDir.path}/openai_tts_${DateTime.now().millisecondsSinceEpoch}.mp3');
        await audioFile.writeAsBytes(response.bodyBytes);
        return audioFile.path;
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final error = errorData['error'] as Map<String, dynamic>?;
        final errorMessage = error?['message'] as String? ?? 'Erreur inconnue';
        final errorType = error?['type'] as String?;
        
        // Gestion spécifique des erreurs de quota
        if (response.statusCode == 429 || 
            errorMessage.toLowerCase().contains('quota') ||
            errorMessage.toLowerCase().contains('exceeded') ||
            errorMessage.toLowerCase().contains('rate limit')) {
          throw OpenAIException(
            'Vous avez dépassé votre quota OpenAI. Veuillez vérifier votre compte OpenAI ou attendre la réinitialisation de votre quota.',
            type: 'quota_exceeded',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs d'authentification
        if (response.statusCode == 401) {
          throw OpenAIException(
            'Clé API invalide. Veuillez vérifier votre clé API dans les paramètres.',
            type: 'invalid_api_key',
            statusCode: response.statusCode,
          );
        }
        
        throw OpenAIException(
          'Erreur TTS OpenAI: $errorMessage',
          type: errorType,
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is OpenAIException) {
        rethrow;
      }
      if (e is FormatException) {
        throw OpenAIException('Erreur de format de réponse TTS: ${e.toString()}');
      }
      throw OpenAIException('Erreur de connexion TTS: ${e.toString()}');
    }
  }
}

