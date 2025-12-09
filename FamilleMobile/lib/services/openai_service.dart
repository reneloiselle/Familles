import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../config/supabase_config.dart';
import 'supabase_service.dart';

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
  // Utiliser l'API du serveur web Next.js au lieu d'OpenAI directement
  static String get _apiUrl => '${ApiConfig.baseUrl}/api/chat';
  static String get _ttsUrl => '${ApiConfig.baseUrl}/api/chat/tts';

  // Note: Les méthodes de gestion de clé API ne sont plus utilisées
  // La clé API est maintenant gérée côté serveur
  // Ces méthodes sont conservées pour compatibilité mais ne sont plus nécessaires
  static Future<String?> getApiKey() async {
    // Plus utilisé - la clé est côté serveur
    return null;
  }

  static Future<bool> setApiKey(String apiKey) async {
    // Plus utilisé - la clé est côté serveur
    return false;
  }

  static Future<bool> removeApiKey() async {
    // Plus utilisé - la clé est côté serveur
    return false;
  }

  static Future<bool> hasApiKey() async {
    // Vérifier que l'utilisateur est connecté (la clé API est côté serveur)
    final supabase = SupabaseService.client;
    final session = supabase.auth.currentSession;
    return session != null;
  }

  /// Envoie un message à OpenAI via le serveur web et récupère la réponse
  static Future<String> sendMessage({
    required String message,
    required List<Map<String, String>> conversationHistory,
  }) async {
    // Récupérer le token d'authentification Supabase
    final supabase = SupabaseService.client;
    final session = supabase.auth.currentSession;
    if (session == null) {
      throw OpenAIException('Vous devez être connecté pour utiliser le chat');
    }

    try {
      debugPrint('Envoi de la requête à: $_apiUrl');
      final response = await http.post(
        Uri.parse(_apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
        },
        body: jsonEncode({
          'message': message,
          'conversationHistory': conversationHistory,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw OpenAIException('Timeout: Le serveur ne répond pas. Vérifiez que votre serveur Next.js est démarré et que l\'URL est correcte dans ApiConfig.baseUrl.');
        },
      );
      
      debugPrint('Réponse reçue: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['content'] as String;
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final errorMessage = errorData['error'] as String? ?? 'Erreur inconnue';
        final errorType = errorData['type'] as String?;
        
        // Gestion spécifique des erreurs de quota
        if (response.statusCode == 429 || 
            errorMessage.toLowerCase().contains('quota') ||
            errorMessage.toLowerCase().contains('exceeded') ||
            errorMessage.toLowerCase().contains('rate limit')) {
          throw OpenAIException(
            errorMessage,
            type: 'quota_exceeded',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs d'authentification
        if (response.statusCode == 401) {
          throw OpenAIException(
            errorMessage,
            type: 'invalid_api_key',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs de paiement
        if (response.statusCode == 402 || errorType == 'insufficient_quota') {
          throw OpenAIException(
            errorMessage,
            type: 'insufficient_quota',
            statusCode: response.statusCode,
          );
        }
        
        throw OpenAIException(
          errorMessage,
          type: errorType,
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is OpenAIException) {
        rethrow;
      }
      if (e is SocketException) {
        throw OpenAIException(
          'Impossible de se connecter au serveur. Vérifiez que:\n'
          '1. Votre serveur Next.js est démarré (npm run dev)\n'
          '2. L\'URL dans ApiConfig.baseUrl est correcte\n'
          '3. Pour un appareil physique, utilisez votre IP locale au lieu de localhost\n'
          '4. Le serveur est accessible depuis votre réseau',
        );
      }
      if (e is FormatException) {
        throw OpenAIException('Erreur de format de réponse: ${e.toString()}');
      }
      throw OpenAIException('Erreur de connexion: ${e.toString()}');
    }
  }

  /// Génère un fichier audio à partir d'un texte en utilisant l'API TTS via le serveur web
  /// Retourne le chemin du fichier audio généré
  static Future<String> textToSpeech({
    required String text,
    String voice = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
    double speed = 1.0,
  }) async {
    // Récupérer le token d'authentification Supabase
    final supabase = SupabaseService.client;
    final session = supabase.auth.currentSession;
    if (session == null) {
      throw OpenAIException('Vous devez être connecté pour utiliser le TTS');
    }

    try {
      debugPrint('Envoi de la requête TTS à: $_ttsUrl');
      final response = await http.post(
        Uri.parse(_ttsUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
        },
        body: jsonEncode({
          'text': text,
          'voice': voice,
          'speed': speed,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw OpenAIException('Timeout: Le serveur ne répond pas. Vérifiez que votre serveur Next.js est démarré et que l\'URL est correcte dans ApiConfig.baseUrl.');
        },
      );
      
      debugPrint('Réponse TTS reçue: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final audioBase64 = data['audio'] as String;
        
        // Décoder le base64 et sauvegarder le fichier audio temporaire
        final audioBytes = base64Decode(audioBase64);
        final tempDir = await getTemporaryDirectory();
        final audioFile = File('${tempDir.path}/openai_tts_${DateTime.now().millisecondsSinceEpoch}.mp3');
        await audioFile.writeAsBytes(audioBytes);
        return audioFile.path;
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final errorMessage = errorData['error'] as String? ?? 'Erreur inconnue';
        final errorType = errorData['type'] as String?;
        
        // Gestion spécifique des erreurs de quota
        if (response.statusCode == 429 || 
            errorMessage.toLowerCase().contains('quota') ||
            errorMessage.toLowerCase().contains('exceeded') ||
            errorMessage.toLowerCase().contains('rate limit')) {
          throw OpenAIException(
            errorMessage,
            type: 'quota_exceeded',
            statusCode: response.statusCode,
          );
        }
        
        // Gestion des erreurs d'authentification
        if (response.statusCode == 401) {
          throw OpenAIException(
            errorMessage,
            type: 'invalid_api_key',
            statusCode: response.statusCode,
          );
        }
        
        throw OpenAIException(
          errorMessage,
          type: errorType,
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is OpenAIException) {
        rethrow;
      }
      if (e is SocketException) {
        throw OpenAIException(
          'Impossible de se connecter au serveur. Vérifiez que:\n'
          '1. Votre serveur Next.js est démarré (npm run dev)\n'
          '2. L\'URL dans ApiConfig.baseUrl est correcte\n'
          '3. Pour un appareil physique, utilisez votre IP locale au lieu de localhost\n'
          '4. Le serveur est accessible depuis votre réseau',
        );
      }
      if (e is FormatException) {
        throw OpenAIException('Erreur de format de réponse TTS: ${e.toString()}');
      }
      throw OpenAIException('Erreur de connexion TTS: ${e.toString()}');
    }
  }
}

