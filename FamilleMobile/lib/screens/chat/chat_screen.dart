import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../services/openai_service.dart';
import '../../services/audio_service.dart';
import '../../services/speech_service.dart';
import '../../services/supabase_service.dart';
import '../../services/streaming_tts_service.dart';
import 'dart:io';
import 'dart:async';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, String>> _messages = [];
  final AudioService _audioService = AudioService();
  final SpeechService _speechService = SpeechService();
  final SupabaseService _supabaseService = SupabaseService();
  final StreamingTTSService _streamingTTSService = StreamingTTSService();
  bool _isLoading = false;
  bool _hasApiKey = false;
  bool _isPlayingAudio = false;
  String? _currentPlayingMessageId;
  bool _autoPlayEnabled = false;
  bool _autoSendDictationEnabled = false;
  bool _isListening = false;
  String? _conversationId;
  bool _isLoadingHistory = true;
  Duration? _audioDuration;
  Duration? _audioPosition;
  bool _isRealtimeMode = false; // Mode conversation en temps réel
  bool _isContinuousMode = false; // Mode écoute continue
  Timer? _continuousListeningCheckTimer; // Timer pour vérifier l'écoute continue

  @override
  void initState() {
    super.initState();
    _initializeChat();
    _audioService.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _isPlayingAudio = state == PlayerState.playing;
          if (state == PlayerState.completed || state == PlayerState.stopped) {
            _currentPlayingMessageId = null;
            _audioPosition = null;
            _audioDuration = null;
          }
        });
      }
    });

    // Écouter les changements de position et durée
    _audioService.onPositionChanged.listen((position) {
      if (mounted) {
        setState(() {
          _audioPosition = position;
        });
      }
    });

    _audioService.onDurationChanged.listen((duration) {
      if (mounted) {
        setState(() {
          _audioDuration = duration;
        });
      }
    });
  }

  Future<void> _initializeChat() async {
    await _checkApiKey();
    await _loadAutoPlaySetting();
    await _loadAutoSendDictationSetting();
    await _initializeSpeech();
    await _loadConversationHistory();
  }

  Future<void> _initializeSpeech() async {
    final available = await _speechService.initialize();
    if (!available && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('La reconnaissance vocale n\'est pas disponible sur cet appareil'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Future<void> _loadAutoPlaySetting() async {
    final enabled = await AudioService.isAutoPlayEnabled();
    setState(() {
      _autoPlayEnabled = enabled;
    });
  }

  Future<void> _loadAutoSendDictationSetting() async {
    final enabled = await AudioService.isAutoSendDictationEnabled();
    setState(() {
      _autoSendDictationEnabled = enabled;
    });
  }

  Future<void> _checkApiKey() async {
    // Plus besoin de vérifier la clé API côté client, elle est gérée côté serveur
    // Vérifier seulement que l'utilisateur est connecté
    final supabase = SupabaseService.client;
    final session = supabase.auth.currentSession;
    setState(() {
      _hasApiKey = session != null;
    });
  }

  Future<void> _loadConversationHistory() async {
    try {
      setState(() {
        _isLoadingHistory = true;
      });

      // Récupérer ou créer une conversation
      _conversationId = await _supabaseService.getOrCreateConversation();

      // Charger l'historique
      final conversationData = await _supabaseService.loadLatestConversation();

      if (conversationData != null && conversationData['messages'] != null) {
        final messages = conversationData['messages'] as List;
        if (messages.isNotEmpty) {
          setState(() {
            _messages.clear();
            for (final msg in messages) {
              final messageMap = <String, String>{
                'role': msg['role'] as String,
                'content': msg['content'] as String,
              };
              final id = msg['id'] as String?;
              if (id != null) {
                messageMap['id'] = id;
              }
              _messages.add(messageMap);
            }
          });
          _scrollToBottom();
        } else {
          // Pas de messages, afficher le message d'accueil
          _addWelcomeMessage();
        }
      } else {
        // Pas de conversation, afficher le message d'accueil
        _addWelcomeMessage();
      }
    } catch (e) {
      debugPrint('Erreur lors du chargement de l\'historique: $e');
      _addWelcomeMessage();
    } finally {
      setState(() {
        _isLoadingHistory = false;
      });
    }
  }

  void _addWelcomeMessage() {
    if (_hasApiKey) {
      _messages.add({
        'role': 'assistant',
        'content': 'Bonjour ! Je suis votre assistant OpenAI. Comment puis-je vous aider aujourd\'hui ?',
      });
    } else {
      _messages.add({
        'role': 'system',
        'content': 'Bienvenue ! Veuillez configurer votre clé API OpenAI pour commencer à chatter.',
      });
    }
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty || _isLoading) return;

    if (!_hasApiKey) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vous devez être connecté pour utiliser le chat'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // S'assurer qu'on a une conversation
    _conversationId ??= await _supabaseService.getOrCreateConversation();

    // Ajouter le message de l'utilisateur
    final userMessageId = DateTime.now().millisecondsSinceEpoch.toString();
    setState(() {
      _messages.add({
        'role': 'user',
        'content': message,
        'id': userMessageId,
      });
      _isLoading = true;
    });

    // Sauvegarder le message utilisateur
    try {
      await _supabaseService.saveMessage(
        conversationId: _conversationId!,
        role: 'user',
        content: message,
      );
    } catch (e) {
      debugPrint('Erreur lors de la sauvegarde du message utilisateur: $e');
    }

    // Vider le champ de texte dans un setState pour iOS
    // Utiliser addPostFrameCallback pour s'assurer que le clear() est bien appliqué
    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _messageController.clear();
          });
        }
      });
    }
    _scrollToBottom();

    try {
      // Créer le message assistant vide pour le streaming
      final assistantMessageId = DateTime.now().millisecondsSinceEpoch.toString();
      String fullResponse = '';
      
      // Sauvegarder l'état du mode realtime avant de commencer
      final isRealtimeMode = _isRealtimeMode;
      
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': '',
          'id': assistantMessageId,
        });
      });

      // Créer un stream controller pour le streaming TTS
      final textStreamController = StreamController<String>();
      
      // Démarrer le streaming TTS si on est en mode realtime
      if (isRealtimeMode && _autoPlayEnabled) {
        _streamingTTSService.startStreaming(textStreamController.stream);
      }

      // Utiliser le streaming pour recevoir la réponse au fur et à mesure
      await for (final chunk in OpenAIService.sendMessageStream(
        message: message,
        conversationHistory: _messages
            .where((m) => m['role'] != 'system')
            .map((m) => {'role': m['role']!, 'content': m['content']!})
            .toList(),
      )) {
        if (mounted) {
          fullResponse += chunk;
          
          // Envoyer le chunk au streaming TTS si en mode realtime
          if (isRealtimeMode && _autoPlayEnabled) {
            textStreamController.add(chunk);
          }
          
          // Mettre à jour le message avec le contenu accumulé
          setState(() {
            final messageIndex = _messages.indexWhere((m) => m['id'] == assistantMessageId);
            if (messageIndex != -1) {
              _messages[messageIndex]['content'] = fullResponse;
            }
          });
          // Faire défiler vers le bas à chaque chunk
          _scrollToBottom();
        }
      }

      // Fermer le stream
      await textStreamController.close();

      // Marquer le chargement comme terminé
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isRealtimeMode = false; // Réinitialiser le mode realtime
        });
      }

      // Sauvegarder le message assistant complet
      try {
        await _supabaseService.saveMessage(
          conversationId: _conversationId!,
          role: 'assistant',
          content: fullResponse,
        );
      } catch (e) {
        debugPrint('Erreur lors de la sauvegarde du message assistant: $e');
      }

      // Lecture automatique si activée et pas en mode realtime (déjà fait en streaming)
      if (!isRealtimeMode && _autoPlayEnabled && fullResponse.isNotEmpty && mounted) {
        // Vérifier la longueur minimale si configurée
        final minLength = await AudioService.getMinLengthForAutoPlay();
        if (minLength == 0) {
          // Pas de limite, lire directement
          _playTextToSpeech(fullResponse, assistantMessageId);
        } else {
          final wordCount = fullResponse.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
          if (wordCount >= minLength) {
            _playTextToSpeech(fullResponse, assistantMessageId);
          }
        }
      }
    } catch (e) {
      String errorMessage;
      bool isQuotaError = false;
      bool isAuthError = false;
      
      if (e is OpenAIException) {
        errorMessage = e.message;
        isQuotaError = e.type == 'quota_exceeded' || e.type == 'insufficient_quota';
        isAuthError = e.type == 'invalid_api_key';
      } else {
        errorMessage = 'Erreur: ${e.toString()}';
      }
      
      setState(() {
        _messages.add({
          'role': 'system',
          'content': errorMessage,
          'error_type': isQuotaError ? 'quota' : (isAuthError ? 'auth' : 'other'),
        });
        _isLoading = false;
      });
      
      // Afficher une snackbar pour les erreurs importantes
      if (isQuotaError || isAuthError) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(errorMessage),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 5),
                action: null,
              ),
            );
          }
        });
      }
    }

    _scrollToBottom();
  }

  /// Envoie un message directement sans passer par le TextField
  Future<void> _sendMessageDirectly(String message) async {
    if (message.trim().isEmpty) return;

    if (!_hasApiKey) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vous devez être connecté pour utiliser le chat'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // S'assurer qu'on a une conversation
    _conversationId ??= await _supabaseService.getOrCreateConversation();

    // Ajouter le message de l'utilisateur
    final userMessageId = DateTime.now().millisecondsSinceEpoch.toString();
    setState(() {
      _messages.add({
        'role': 'user',
        'content': message,
        'id': userMessageId,
      });
      _isLoading = true;
    });

    // Sauvegarder le message utilisateur
    try {
      await _supabaseService.saveMessage(
        conversationId: _conversationId!,
        role: 'user',
        content: message,
      );
    } catch (e) {
      debugPrint('Erreur lors de la sauvegarde du message utilisateur: $e');
    }

    _scrollToBottom();

    try {
      // Créer le message assistant vide pour le streaming
      final assistantMessageId = DateTime.now().millisecondsSinceEpoch.toString();
      String fullResponse = '';
      
      // Sauvegarder l'état du mode realtime avant de commencer
      final isRealtimeMode = _isRealtimeMode;
      
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': '',
          'id': assistantMessageId,
        });
      });

      // Créer un stream controller pour le streaming TTS
      final textStreamController = StreamController<String>();
      
      // Démarrer le streaming TTS si on est en mode realtime
      if (isRealtimeMode && _autoPlayEnabled) {
        _streamingTTSService.startStreaming(textStreamController.stream);
      }

      // Utiliser le streaming pour recevoir la réponse au fur et à mesure
      await for (final chunk in OpenAIService.sendMessageStream(
        message: message,
        conversationHistory: _messages
            .where((m) => m['role'] != 'system')
            .map((m) => {'role': m['role']!, 'content': m['content']!})
            .toList(),
      )) {
        if (mounted) {
          fullResponse += chunk;
          
          // Envoyer le chunk au streaming TTS si en mode realtime
          if (isRealtimeMode && _autoPlayEnabled) {
            textStreamController.add(chunk);
          }
          
          // Mettre à jour le message avec le contenu accumulé
          setState(() {
            final messageIndex = _messages.indexWhere((m) => m['id'] == assistantMessageId);
            if (messageIndex != -1) {
              _messages[messageIndex]['content'] = fullResponse;
            }
          });
          // Faire défiler vers le bas à chaque chunk
          _scrollToBottom();
        }
      }

      // Fermer le stream
      await textStreamController.close();

      // Marquer le chargement comme terminé
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isRealtimeMode = false; // Réinitialiser le mode realtime
        });
      }

      // Sauvegarder le message assistant complet
      try {
        await _supabaseService.saveMessage(
          conversationId: _conversationId!,
          role: 'assistant',
          content: fullResponse,
        );
      } catch (e) {
        debugPrint('Erreur lors de la sauvegarde du message assistant: $e');
      }

      // Lecture automatique si activée et pas en mode realtime (déjà fait en streaming)
      if (!isRealtimeMode && _autoPlayEnabled && fullResponse.isNotEmpty && mounted) {
        // Vérifier la longueur minimale si configurée
        final minLength = await AudioService.getMinLengthForAutoPlay();
        if (minLength == 0) {
          // Pas de limite, lire directement
          _playTextToSpeech(fullResponse, assistantMessageId);
        } else {
          final wordCount = fullResponse.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
          if (wordCount >= minLength) {
            _playTextToSpeech(fullResponse, assistantMessageId);
          }
        }
      }
    } catch (e) {
      String errorMessage;
      bool isQuotaError = false;
      bool isAuthError = false;
      
      if (e is OpenAIException) {
        errorMessage = e.message;
        isQuotaError = e.type == 'quota_exceeded' || e.type == 'insufficient_quota';
        isAuthError = e.type == 'invalid_api_key';
      } else {
        errorMessage = 'Erreur: ${e.toString()}';
      }
      
      setState(() {
        _messages.add({
          'role': 'system',
          'content': errorMessage,
          'error_type': isQuotaError ? 'quota' : (isAuthError ? 'auth' : 'other'),
        });
        _isLoading = false;
      });
      
      // Afficher une snackbar pour les erreurs importantes
      if (isQuotaError || isAuthError) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(errorMessage),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 5),
                action: null,
              ),
            );
          }
        });
      }
    }

    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(1, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> _startListening({bool continuous = false}) async {
    // Vérifier la disponibilité
    final available = await _speechService.isAvailable();
    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('La reconnaissance vocale n\'est pas disponible'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    // Vérifier les permissions
    final hasPermissions = await _speechService.checkPermissions();
    if (!hasPermissions) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Les permissions du microphone sont requises. Veuillez les activer dans les paramètres.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
      return;
    }

    // Mettre à jour l'état avant de démarrer
    if (mounted) {
      setState(() {
        _isListening = true;
        _isContinuousMode = continuous;
      });
    }

    if (continuous) {
      // Arrêter le timer de vérification précédent s'il existe
      _continuousListeningCheckTimer?.cancel();
      
      // Mode écoute continue - envoie automatiquement les résultats finaux
      final success = await _speechService.startContinuousListening(
        localeId: 'fr_FR',
        onFinalResult: (text) async {
          // Envoyer automatiquement chaque résultat final
          if (mounted && text.trim().isNotEmpty) {
            // Activer le mode realtime pour la lecture en streaming
            setState(() {
              _isRealtimeMode = _autoPlayEnabled;
            });
            
            // Envoyer directement le message
            await _sendMessageDirectly(text);
            
            // Vérifier et reprendre l'écoute après un court délai
            if (mounted && _isContinuousMode) {
              await Future.delayed(const Duration(milliseconds: 1500));
              // Vérifier si l'écoute est toujours active
              if (mounted && _isContinuousMode && !_speechService.isListening) {
                debugPrint('Reprise de l\'écoute continue après envoi...');
                // Reprendre l'écoute
                _startListening(continuous: true);
              }
            }
          }
        },
        onPartialResult: (text) {
          // Afficher le texte partiel dans le champ (optionnel)
          if (mounted) {
            setState(() {
              _messageController.text = text;
            });
          }
        },
        onError: (error) {
          if (mounted) {
            debugPrint('Erreur dans l\'écoute continue: $error');
            // Ne pas désactiver le mode continu immédiatement, essayer de reprendre
            setState(() {
              _isListening = false;
            });
            
            // Si on est toujours en mode continu, essayer de reprendre après un délai
            if (_isContinuousMode) {
              Future.delayed(const Duration(seconds: 2), () {
                if (mounted && _isContinuousMode && !_isListening) {
                  debugPrint('Tentative de reprise après erreur...');
                  _startListening(continuous: true);
                }
              });
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(error),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          }
        },
      );

      if (success && mounted && continuous) {
        // Démarrer un timer pour vérifier périodiquement que l'écoute est toujours active
        _continuousListeningCheckTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
          if (!mounted || !_isContinuousMode) {
            timer.cancel();
            return;
          }
          
          // Vérifier si l'écoute est toujours active
          if (!_speechService.isListening && _isContinuousMode && !_isLoading) {
            debugPrint('L\'écoute continue s\'est arrêtée, reprise automatique...');
            // Reprendre l'écoute
            _startListening(continuous: true);
          }
        });
      } else if (!success && mounted) {
        setState(() {
          _isListening = false;
          _isContinuousMode = false;
        });
        _continuousListeningCheckTimer?.cancel();
      }
    } else {
      // Mode normal - une seule dictée
      final success = await _speechService.startListening(
        localeId: 'fr_FR',
        onResult: (text) {
          if (mounted) {
            setState(() {
              _messageController.text = text;
            });
          }
        },
        onDone: () async {
          if (mounted) {
            setState(() {
              _isListening = false;
              // Activer le mode realtime pour la lecture en streaming
              _isRealtimeMode = _autoPlayEnabled;
            });
            
            // Envoyer automatiquement si l'option est activée
            if (_autoSendDictationEnabled && _messageController.text.trim().isNotEmpty) {
              // Attendre un peu pour que le texte final soit bien mis à jour
              await Future.delayed(const Duration(milliseconds: 300));
              if (mounted && _messageController.text.trim().isNotEmpty) {
                _sendMessage();
              }
            }
          }
          // Le texte est déjà dans le TextField grâce à onResult
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _isListening = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(error),
                backgroundColor: Colors.red,
                duration: const Duration(seconds: 4),
                action: SnackBarAction(
                  label: 'Réessayer',
                  textColor: Colors.white,
                  onPressed: () {
                    // Réessayer après un court délai
                    Future.delayed(const Duration(milliseconds: 500), () {
                      _startListening(continuous: _isContinuousMode);
                    });
                  },
                ),
              ),
            );
          }
        },
        timeoutSeconds: 60, // Timeout de 60 secondes
      );

      if (!success && mounted) {
        setState(() {
          _isListening = false;
        });
        // L'erreur a déjà été gérée par onError, mais on vérifie quand même
        final lastError = _speechService.lastError;
        if (lastError == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Impossible de démarrer l\'écoute. Vérifiez les permissions du microphone.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  Future<void> _stopListening() async {
    try {
      // Arrêter le timer de vérification
      _continuousListeningCheckTimer?.cancel();
      _continuousListeningCheckTimer = null;
      
      final finalText = await _speechService.stopListening();
      if (mounted) {
        setState(() {
          _isListening = false;
          _isContinuousMode = false; // Réinitialiser le mode continu
          // S'assurer que le texte final est dans le TextField
          if (finalText.isNotEmpty && _messageController.text != finalText) {
            _messageController.text = finalText;
          }
        });
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'arrêt de l\'écoute: $e');
      if (mounted) {
        setState(() {
          _isListening = false;
          _isContinuousMode = false;
        });
      }
    }
  }

  Future<void> _cancelListening() async {
    try {
      await _speechService.cancelListening();
      if (mounted) {
        setState(() {
          _isListening = false;
          _messageController.clear();
        });
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'annulation de l\'écoute: $e');
      if (mounted) {
        setState(() {
          _isListening = false;
          _messageController.clear();
        });
      }
    }
  }

  Future<void> _playTextToSpeech(String text, String messageId) async {
    try {
      // Vérifier la longueur minimale si configurée
      final minLength = await AudioService.getMinLengthForAutoPlay();
      if (minLength > 0) {
        final wordCount = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
        if (wordCount < minLength) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Texte trop court pour la lecture automatique (minimum: $minLength mots)'),
                duration: const Duration(seconds: 2),
              ),
            );
          }
          return;
        }
      }

      // Arrêter la lecture en cours si nécessaire
      if (_isPlayingAudio) {
        await _audioService.stop();
      }

      setState(() {
        _currentPlayingMessageId = messageId;
      });

      // Générer l'audio avec OpenAI (utilise le cache automatiquement)
      final voice = await AudioService.getVoice();
      final speed = await AudioService.getSpeed();
      final model = await AudioService.getTTSModel();
      final audioPath = await OpenAIService.textToSpeech(
        text: text,
        voice: voice,
        speed: speed,
        model: model,
      );

      // Jouer l'audio
      await _audioService.playAudio(audioPath);

      // Nettoyer le fichier temporaire après la lecture (mais pas le cache)
      _audioService.onPlayerStateChanged.listen((state) async {
        if (state == PlayerState.completed && _currentPlayingMessageId == messageId) {
          try {
            final file = File(audioPath);
            // Ne supprimer que si c'est un fichier temporaire (pas dans le cache)
            if (await file.exists() && !audioPath.contains('tts_cache')) {
              await file.delete();
            }
          } catch (e) {
            // Ignorer les erreurs de suppression
            debugPrint('Erreur lors de la suppression du fichier temporaire: $e');
          }
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentPlayingMessageId = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la lecture vocale: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }


  void _showTTSSettings() async {
    await showDialog(
      context: context,
      builder: (context) => _TTSSettingsDialog(),
    );
    // Recharger les paramètres après la fermeture de la boîte de dialogue
    await _loadAutoSendDictationSetting();
  }

  void _clearChat() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Effacer la conversation'),
        content: const Text('Êtes-vous sûr de vouloir effacer toute la conversation ? Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              
              // Supprimer la conversation de la base de données
              if (_conversationId != null) {
                try {
                  await _supabaseService.deleteConversation(_conversationId!);
                } catch (e) {
                  debugPrint('Erreur lors de la suppression de la conversation: $e');
                }
              }
              
              // Réinitialiser
              setState(() {
                _messages.clear();
                _conversationId = null;
              });
              
              // Créer une nouvelle conversation et afficher le message d'accueil
              await _loadConversationHistory();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Effacer'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _continuousListeningCheckTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    _audioService.dispose();
    _streamingTTSService.dispose();
    // Arrêter proprement l'écoute si elle est en cours
    if (_isListening) {
      _speechService.forceStop();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat OpenAI'),
        actions: [
          // Bouton lecture automatique
          IconButton(
            icon: Icon(_autoPlayEnabled ? Icons.volume_up : Icons.volume_off),
            onPressed: () async {
              final newValue = !_autoPlayEnabled;
              await AudioService.setAutoPlay(newValue);
              setState(() {
                _autoPlayEnabled = newValue;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    newValue
                        ? 'Lecture automatique activée'
                        : 'Lecture automatique désactivée',
                  ),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            tooltip: _autoPlayEnabled ? 'Désactiver la lecture auto' : 'Activer la lecture auto',
          ),
          // Bouton envoi automatique après dictée
          IconButton(
            icon: Stack(
              children: [
                Icon(
                  Icons.mic,
                  color: _autoSendDictationEnabled 
                      ? Theme.of(context).colorScheme.primary 
                      : null,
                ),
                if (_autoSendDictationEnabled)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check,
                        size: 10,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () async {
              final newValue = !_autoSendDictationEnabled;
              await AudioService.setAutoSendDictation(newValue);
              setState(() {
                _autoSendDictationEnabled = newValue;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    newValue
                        ? 'Envoi automatique après dictée activé'
                        : 'Envoi automatique après dictée désactivé',
                  ),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            tooltip: _autoSendDictationEnabled 
                ? 'Désactiver l\'envoi auto après dictée' 
                : 'Activer l\'envoi auto après dictée',
          ),
          // Menu des paramètres TTS
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) async {
              if (value == 'tts_settings') {
                _showTTSSettings();
              } else if (value == 'api_settings') {
              // La clé API est maintenant gérée côté serveur
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('La clé API OpenAI est gérée automatiquement côté serveur'),
                  backgroundColor: Colors.blue,
                ),
              );
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'tts_settings',
                child: Row(
                  children: [
                    Icon(Icons.record_voice_over, size: 20),
                    SizedBox(width: 8),
                    Text('Paramètres vocaux'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'api_settings',
                child: Row(
                  children: [
                    Icon(Icons.settings, size: 20),
                    SizedBox(width: 8),
                    Text('Paramètres API'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: _clearChat,
            tooltip: 'Effacer',
          ),
        ],
      ),
      body: Column(
        children: [
          // Zone de messages
          Expanded(
            child: _isLoadingHistory
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text(
                          'Chargement de l\'historique...',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : _messages.isEmpty
                    ? const Center(
                        child: Text(
                          'Aucun message',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length) {
                        // Indicateur de chargement
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                              SizedBox(width: 12),
                              Text(
                                'Réflexion...',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        );
                      }

                      final message = _messages[index];
                      final isUser = message['role'] == 'user';
                      final isSystem = message['role'] == 'system';
                      final errorType = message['error_type'];

                      if (isSystem) {
                        final isQuotaError = errorType == 'quota' || errorType == 'insufficient_quota';
                        final isAuthError = errorType == 'auth' || errorType == 'invalid_api_key';
                        
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Center(
                            child: Container(
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.9,
                              ),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isQuotaError
                                    ? Colors.red.shade50
                                    : isAuthError
                                        ? Colors.orange.shade50
                                        : Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isQuotaError
                                      ? Colors.red.shade300
                                      : isAuthError
                                          ? Colors.orange.shade300
                                          : Colors.orange.shade200,
                                  width: 1.5,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        isQuotaError
                                            ? Icons.error_outline
                                            : isAuthError
                                                ? Icons.warning_amber_rounded
                                                : Icons.info_outline,
                                        color: isQuotaError
                                            ? Colors.red.shade700
                                            : isAuthError
                                                ? Colors.orange.shade700
                                                : Colors.orange.shade700,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        isQuotaError
                                            ? 'Quota dépassé'
                                            : isAuthError
                                                ? 'Erreur d\'authentification'
                                                : 'Information',
                                        style: TextStyle(
                                          color: isQuotaError
                                              ? Colors.red.shade900
                                              : isAuthError
                                                  ? Colors.orange.shade900
                                                  : Colors.orange.shade900,
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    message['content']!,
                                    style: TextStyle(
                                      color: isQuotaError
                                          ? Colors.red.shade900
                                          : isAuthError
                                              ? Colors.orange.shade900
                                              : Colors.orange.shade900,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (isQuotaError) ...[
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Que faire ?',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.red.shade700,
                                              fontSize: 12,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '• Vérifiez votre compte OpenAI\n'
                                            '• Attendez la réinitialisation du quota\n'
                                            '• Ajoutez des crédits si nécessaire',
                                            style: TextStyle(
                                              color: Colors.grey.shade700,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                  if (isAuthError) ...[
                                    const SizedBox(height: 12),
                                    const Text(
                                      'La clé API est gérée côté serveur. Assurez-vous d\'être connecté.',
                                      style: TextStyle(fontSize: 12, color: Colors.grey),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        );
                      }

                      final messageId = message['id'];
                      final isCurrentPlaying = messageId != null && messageId == _currentPlayingMessageId;

                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: isUser
                                ? Theme.of(context).colorScheme.primary
                                : Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isUser)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.smart_toy,
                                        size: 16,
                                        color: Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Assistant',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const Spacer(),
                                      // Contrôles de lecture vocale
                                      if (message['content'] != null && message['content']!.isNotEmpty)
                                        Column(
                                          mainAxisSize: MainAxisSize.min,
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                // Bouton play/pause
                                                IconButton(
                                                  icon: Icon(
                                                    isCurrentPlaying && _isPlayingAudio
                                                        ? Icons.pause_circle_outline
                                                        : Icons.play_circle_outline,
                                                    size: 18,
                                                    color: isCurrentPlaying && _isPlayingAudio
                                                        ? Theme.of(context).colorScheme.primary
                                                        : Colors.grey.shade600,
                                                  ),
                                                  onPressed: () async {
                                                    if (isCurrentPlaying && _isPlayingAudio) {
                                                      await _audioService.pause();
                                                    } else if (isCurrentPlaying && !_isPlayingAudio) {
                                                      await _audioService.resume();
                                                    } else {
                                                      if (_isPlayingAudio) {
                                                        await _audioService.stop();
                                                      }
                                                      await _playTextToSpeech(
                                                        message['content']!,
                                                        messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
                                                      );
                                                    }
                                                  },
                                                  padding: EdgeInsets.zero,
                                                  constraints: const BoxConstraints(),
                                                  tooltip: isCurrentPlaying && _isPlayingAudio
                                                      ? 'Pause'
                                                      : isCurrentPlaying
                                                          ? 'Reprendre'
                                                          : 'Lire la réponse',
                                                ),
                                                // Bouton stop
                                                if (isCurrentPlaying)
                                                  IconButton(
                                                    icon: const Icon(Icons.stop, size: 18),
                                                    color: Colors.grey.shade600,
                                                    onPressed: () async {
                                                      await _audioService.stop();
                                                      setState(() {
                                                        _currentPlayingMessageId = null;
                                                      });
                                                    },
                                                    padding: EdgeInsets.zero,
                                                    constraints: const BoxConstraints(),
                                                    tooltip: 'Arrêter',
                                                  ),
                                              ],
                                            ),
                                            // Barre de progression
                                            if (isCurrentPlaying && _audioDuration != null && _audioPosition != null)
                                              SizedBox(
                                                width: 120,
                                                child: Column(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Slider(
                                                      value: _audioPosition!.inMilliseconds.toDouble(),
                                                      min: 0,
                                                      max: _audioDuration!.inMilliseconds.toDouble(),
                                                      onChanged: (value) async {
                                                        await _audioService.seek(Duration(milliseconds: value.toInt()));
                                                      },
                                                    ),
                                                    Text(
                                                      '${_formatDuration(_audioPosition!)} / ${_formatDuration(_audioDuration!)}',
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        color: Colors.grey.shade600,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                          ],
                                        ),
                                    ],
                                  ),
                                ),
                              Text(
                                message['content']!,
                                style: TextStyle(
                                  color: isUser ? Colors.white : Colors.black87,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          // Zone de saisie
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Indicateur d'écoute
                  if (_isListening)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.red.shade700),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Écoute en cours...',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              // Bouton Terminer et envoyer
                              if (_messageController.text.trim().isNotEmpty)
                                TextButton(
                                  onPressed: () async {
                                    // Arrêter l'écoute et récupérer le texte final
                                    final finalText = await _speechService.stopListening();
                                    setState(() {
                                      _isListening = false;
                                      // Mettre à jour le texte si nécessaire
                                      if (finalText.isNotEmpty) {
                                        _messageController.text = finalText;
                                      }
                                    });
                                    // Attendre un peu pour que le texte soit bien mis à jour
                                    await Future.delayed(const Duration(milliseconds: 200));
                                    // Envoyer le message si le texte n'est pas vide
                                    if (_messageController.text.trim().isNotEmpty) {
                                      _sendMessage();
                                    }
                                  },
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.green.shade700,
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.check, size: 14),
                                      const SizedBox(width: 4),
                                      const Text('OK', style: TextStyle(fontSize: 12)),
                                    ],
                                  ),
                                ),
                              // Bouton Arrêter (sans envoyer)
                              TextButton(
                                onPressed: _stopListening,
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.orange.shade700,
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.stop, size: 14),
                                    const SizedBox(width: 4),
                                    const Text('Stop', style: TextStyle(fontSize: 12)),
                                  ],
                                ),
                              ),
                              // Bouton Annuler
                              IconButton(
                                icon: const Icon(Icons.close, size: 18),
                                color: Colors.red,
                                onPressed: _cancelListening,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                tooltip: 'Annuler',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  Row(
                    children: [
                      // Bouton mode continu (si pas en écoute)
                      if (!_isListening && _hasApiKey && !_isLoading)
                        IconButton(
                          icon: Icon(
                            _isContinuousMode ? Icons.record_voice_over : Icons.mic,
                            color: _isContinuousMode ? Colors.green : null,
                          ),
                          onPressed: () {
                            setState(() {
                              _isContinuousMode = !_isContinuousMode;
                            });
                            if (_isContinuousMode) {
                              _startListening(continuous: true);
                            }
                          },
                          tooltip: _isContinuousMode
                              ? 'Mode continu activé - Cliquez pour désactiver'
                              : 'Activer le mode continu',
                          padding: const EdgeInsets.all(8),
                          constraints: const BoxConstraints(
                            minWidth: 40,
                            minHeight: 40,
                          ),
                        ),
                      // Bouton de dictée
                      IconButton(
                        icon: Icon(
                          _isListening ? Icons.mic : Icons.mic_none,
                          color: _isListening ? Colors.red : null,
                        ),
                        onPressed: _hasApiKey && !_isLoading
                            ? (_isListening
                                ? _stopListening
                                : () => _startListening(continuous: _isContinuousMode))
                            : null,
                        tooltip: _isListening
                            ? 'Arrêter la dictée'
                            : _isContinuousMode
                                ? 'Dictée vocale (mode continu)'
                                : 'Dictée vocale',
                        padding: const EdgeInsets.all(8),
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                      ),
                      const SizedBox(width: 4),
                      // Champ de texte
                      Expanded(
                        child: TextField(
                          controller: _messageController,
                          decoration: InputDecoration(
                            hintText: _isListening
                                ? 'Parlez maintenant...'
                                : _hasApiKey
                                    ? 'Tapez votre message ou utilisez la dictée...'
                                    : 'Configurez d\'abord votre clé API',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            enabled: _hasApiKey && !_isLoading,
                          ),
                          maxLines: null,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      const SizedBox(width: 4),
                      // Bouton d'envoi
                      IconButton.filled(
                        onPressed: _hasApiKey && !_isLoading && _messageController.text.trim().isNotEmpty
                            ? _sendMessage
                            : null,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Icon(Icons.send),
                        tooltip: 'Envoyer',
                        padding: const EdgeInsets.all(8),
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TTSSettingsDialog extends StatefulWidget {
  @override
  State<_TTSSettingsDialog> createState() => _TTSSettingsDialogState();
}

class _TTSSettingsDialogState extends State<_TTSSettingsDialog> {
  final List<String> _voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  final List<String> _models = ['tts-1', 'tts-1-hd'];
  String _selectedVoice = 'alloy';
  double _speed = 1.0;
  bool _autoSendDictation = false;
  String _selectedModel = 'tts-1';
  int _minLength = 0;
  int _maxLength = 5000;
  bool _isPreviewing = false;
  late TextEditingController _minLengthController;
  late TextEditingController _maxLengthController;

  @override
  void initState() {
    super.initState();
    _minLengthController = TextEditingController();
    _maxLengthController = TextEditingController();
    _loadSettings();
  }

  @override
  void dispose() {
    _minLengthController.dispose();
    _maxLengthController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final voice = await AudioService.getVoice();
    final speed = await AudioService.getSpeed();
    final autoSend = await AudioService.isAutoSendDictationEnabled();
    final model = await AudioService.getTTSModel();
    final minLength = await AudioService.getMinLengthForAutoPlay();
    final maxLength = await AudioService.getMaxLengthForTTS();
    setState(() {
      _selectedVoice = voice;
      _speed = speed;
      _autoSendDictation = autoSend;
      _selectedModel = model;
      _minLength = minLength;
      _maxLength = maxLength;
      _minLengthController.text = minLength.toString();
      _maxLengthController.text = maxLength.toString();
    });
  }

  Future<void> _previewVoice(String voice) async {
    if (_isPreviewing) return;
    
    setState(() {
      _isPreviewing = true;
    });

    try {
      final previewText = 'Bonjour, ceci est un exemple de voix $voice.';
      final audioPath = await OpenAIService.textToSpeech(
        text: previewText,
        voice: voice,
        speed: _speed,
        model: _selectedModel,
      );
      
      // Jouer l'audio de prévisualisation
      final audioService = AudioService();
      await audioService.playAudio(audioPath);
      
      // Attendre la fin de la lecture
      await audioService.onPlayerStateChanged.firstWhere(
        (state) => state == PlayerState.completed || state == PlayerState.stopped,
      );
      
      await audioService.dispose();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la prévisualisation: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPreviewing = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    await AudioService.setVoice(_selectedVoice);
    await AudioService.setSpeed(_speed);
    await AudioService.setAutoSendDictation(_autoSendDictation);
    await AudioService.setTTSModel(_selectedModel);
    await AudioService.setMinLengthForAutoPlay(_minLength);
    await AudioService.setMaxLengthForTTS(_maxLength);
    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Paramètres vocaux sauvegardés'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.record_voice_over),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              'Paramètres vocaux',
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Voix',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _voices.map((voice) {
                final isSelected = voice == _selectedVoice;
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ChoiceChip(
                      label: Text(voice.toUpperCase()),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedVoice = voice;
                          });
                        }
                      },
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      icon: _isPreviewing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.play_arrow, size: 18),
                      onPressed: _isPreviewing ? null : () => _previewVoice(voice),
                      tooltip: 'Écouter un exemple',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            const Text(
              'Modèle TTS',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _models.map((model) {
                final isSelected = model == _selectedModel;
                return ChoiceChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(model.toUpperCase()),
                      const SizedBox(width: 4),
                      Icon(
                        model == 'tts-1-hd' ? Icons.high_quality : Icons.speed,
                        size: 16,
                      ),
                    ],
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedModel = model;
                      });
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            Text(
              _selectedModel == 'tts-1-hd'
                  ? 'Haute qualité (plus cher)'
                  : 'Rapide et économique',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Vitesse de lecture',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Text('0.5x'),
                Expanded(
                  child: Slider(
                    value: _speed,
                    min: 0.5,
                    max: 2.0,
                    divisions: 15,
                    label: '${_speed.toStringAsFixed(1)}x',
                    onChanged: (value) {
                      setState(() {
                        _speed = value;
                      });
                    },
                  ),
                ),
                const Text('2.0x'),
              ],
            ),
            Text(
              'Vitesse actuelle: ${_speed.toStringAsFixed(1)}x',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Limites de longueur',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            TextField(
              decoration: InputDecoration(
                labelText: 'Longueur minimale (mots)',
                hintText: '0 = pas de limite',
                helperText: 'Ne pas lire automatiquement si le texte a moins de mots',
                border: const OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              controller: _minLengthController,
              onChanged: (value) {
                setState(() {
                  _minLength = int.tryParse(value) ?? 0;
                });
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                labelText: 'Longueur maximale (caractères)',
                hintText: '5000',
                helperText: 'Limite pour éviter les coûts excessifs',
                border: const OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              controller: _maxLengthController,
              onChanged: (value) {
                setState(() {
                  _maxLength = int.tryParse(value) ?? 5000;
                });
              },
            ),
            const SizedBox(height: 24),
            const Text(
              'Dictée vocale',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              title: const Text('Envoi automatique après dictée'),
              subtitle: const Text(
                'Envoie automatiquement le message lorsque la dictée est terminée',
                style: TextStyle(fontSize: 12),
              ),
              value: _autoSendDictation,
              onChanged: (value) {
                setState(() {
                  _autoSendDictation = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: _saveSettings,
          child: const Text('Sauvegarder'),
        ),
      ],
    );
  }
}

