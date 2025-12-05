import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../services/openai_service.dart';
import '../../services/audio_service.dart';
import '../../services/speech_service.dart';
import '../../services/supabase_service.dart';
import 'openai_config_screen.dart';
import 'dart:io';

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
  bool _isLoading = false;
  bool _hasApiKey = false;
  bool _isPlayingAudio = false;
  String? _currentPlayingMessageId;
  bool _autoPlayEnabled = false;
  bool _isListening = false;
  String? _conversationId;
  bool _isLoadingHistory = true;

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
          }
        });
      }
    });
  }

  Future<void> _initializeChat() async {
    await _checkApiKey();
    await _loadAutoPlaySetting();
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

  Future<void> _checkApiKey() async {
    final hasKey = await OpenAIService.hasApiKey();
    setState(() {
      _hasApiKey = hasKey;
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
      _showConfigDialog();
      return;
    }

    // S'assurer qu'on a une conversation
    if (_conversationId == null) {
      _conversationId = await _supabaseService.getOrCreateConversation();
    }

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

    _messageController.clear();
    _scrollToBottom();

    try {
      // Envoyer le message à OpenAI
      final response = await OpenAIService.sendMessage(
        message: message,
        conversationHistory: _messages
            .where((m) => m['role'] != 'system')
            .map((m) => {'role': m['role']!, 'content': m['content']!})
            .toList(),
      );

      final assistantMessageId = DateTime.now().millisecondsSinceEpoch.toString();
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': response,
          'id': assistantMessageId,
        });
        _isLoading = false;
      });

      // Sauvegarder le message assistant
      try {
        await _supabaseService.saveMessage(
          conversationId: _conversationId!,
          role: 'assistant',
          content: response,
        );
      } catch (e) {
        debugPrint('Erreur lors de la sauvegarde du message assistant: $e');
      }

      // Lecture automatique si activée
      if (_autoPlayEnabled && response.isNotEmpty) {
        _playTextToSpeech(response, assistantMessageId);
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
                action: isAuthError
                    ? SnackBarAction(
                        label: 'Paramètres',
                        textColor: Colors.white,
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => const OpenAIConfigScreen(),
                            ),
                          ).then((_) => _checkApiKey());
                        },
                      )
                    : null,
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

  Future<void> _startListening() async {
    final available = await _speechService.isAvailable();
    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('La reconnaissance vocale n\'est pas disponible'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    setState(() {
      _isListening = true;
    });

    final success = await _speechService.startListening(
      localeId: 'fr_FR',
      onResult: (text) {
        setState(() {
          _messageController.text = text;
        });
      },
      onDone: () {
        setState(() {
          _isListening = false;
        });
        // Le texte est déjà dans le TextField grâce à onResult
      },
    );

    if (!success && mounted) {
      setState(() {
        _isListening = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible de démarrer l\'écoute. Vérifiez les permissions du microphone.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _stopListening() async {
    final finalText = await _speechService.stopListening();
    setState(() {
      _isListening = false;
      // S'assurer que le texte final est dans le TextField
      if (finalText.isNotEmpty && _messageController.text != finalText) {
        _messageController.text = finalText;
      }
    });
  }

  Future<void> _cancelListening() async {
    await _speechService.cancelListening();
    setState(() {
      _isListening = false;
      _messageController.clear();
    });
  }

  Future<void> _playTextToSpeech(String text, String messageId) async {
    try {
      // Arrêter la lecture en cours si nécessaire
      if (_isPlayingAudio) {
        await _audioService.stop();
      }

      setState(() {
        _currentPlayingMessageId = messageId;
      });

      // Générer l'audio avec OpenAI
      final voice = await AudioService.getVoice();
      final speed = await AudioService.getSpeed();
      final audioPath = await OpenAIService.textToSpeech(
        text: text,
        voice: voice,
        speed: speed,
      );

      // Jouer l'audio
      await _audioService.playAudio(audioPath);

      // Nettoyer le fichier temporaire après la lecture
      _audioService.onPlayerStateChanged.listen((state) async {
        if (state == PlayerState.completed && _currentPlayingMessageId == messageId) {
          try {
            final file = File(audioPath);
            if (await file.exists()) {
              await file.delete();
            }
          } catch (e) {
            // Ignorer les erreurs de suppression
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

  void _showConfigDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clé API requise'),
        content: const Text(
          'Vous devez configurer votre clé API OpenAI pour utiliser le chat. '
          'Souhaitez-vous accéder aux paramètres maintenant ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const OpenAIConfigScreen(),
                ),
              ).then((_) => _checkApiKey());
            },
            child: const Text('Configurer'),
          ),
        ],
      ),
    );
  }

  void _showTTSSettings() {
    showDialog(
      context: context,
      builder: (context) => _TTSSettingsDialog(),
    );
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
    _messageController.dispose();
    _scrollController.dispose();
    _audioService.dispose();
    _speechService.stopListening();
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
          // Menu des paramètres TTS
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) async {
              if (value == 'tts_settings') {
                _showTTSSettings();
              } else if (value == 'api_settings') {
              await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const OpenAIConfigScreen(),
                ),
              );
              await _checkApiKey();
              // Recharger l'historique si nécessaire
              if (_messages.isEmpty || (_messages.length == 1 && _messages[0]['role'] == 'system')) {
                _addWelcomeMessage();
              }
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
                                    ElevatedButton.icon(
                                      onPressed: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (context) => const OpenAIConfigScreen(),
                                          ),
                                        ).then((_) => _checkApiKey());
                                      },
                                      icon: const Icon(Icons.settings, size: 18),
                                      label: const Text('Vérifier la clé API'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange.shade600,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16,
                                          vertical: 8,
                                        ),
                                      ),
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
                                      // Bouton de lecture vocale
                                      if (message['content'] != null && message['content']!.isNotEmpty)
                                        IconButton(
                                          icon: Icon(
                                            isCurrentPlaying && _isPlayingAudio
                                                ? Icons.pause_circle_outline
                                                : Icons.volume_up,
                                            size: 18,
                                            color: isCurrentPlaying && _isPlayingAudio
                                                ? Theme.of(context).colorScheme.primary
                                                : Colors.grey.shade600,
                                          ),
                                          onPressed: () async {
                                            if (isCurrentPlaying && _isPlayingAudio) {
                                              await _audioService.pause();
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
                                              : 'Lire la réponse',
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
                      child: Row(
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
                          const Expanded(
                            child: Text(
                              'Écoute en cours...',
                              style: TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          // Bouton Terminer et envoyer
                          if (_messageController.text.trim().isNotEmpty)
                            TextButton.icon(
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
                              icon: const Icon(Icons.check, size: 16),
                              label: const Text('Terminer'),
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.green.shade700,
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          // Bouton Arrêter (sans envoyer)
                          TextButton.icon(
                            onPressed: _stopListening,
                            icon: const Icon(Icons.stop, size: 16),
                            label: const Text('Arrêter'),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.orange.shade700,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
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
                    ),
                  Row(
                    children: [
                      // Bouton de dictée
                      IconButton(
                        icon: Icon(
                          _isListening ? Icons.mic : Icons.mic_none,
                          color: _isListening ? Colors.red : null,
                        ),
                        onPressed: _hasApiKey && !_isLoading
                            ? (_isListening ? _stopListening : _startListening)
                            : null,
                        tooltip: _isListening ? 'Arrêter la dictée' : 'Dictée vocale',
                      ),
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
                      const SizedBox(width: 8),
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
  String _selectedVoice = 'alloy';
  double _speed = 1.0;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final voice = await AudioService.getVoice();
    final speed = await AudioService.getSpeed();
    setState(() {
      _selectedVoice = voice;
      _speed = speed;
    });
  }

  Future<void> _saveSettings() async {
    await AudioService.setVoice(_selectedVoice);
    await AudioService.setSpeed(_speed);
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
      title: const Row(
        children: [
          Icon(Icons.record_voice_over),
          SizedBox(width: 8),
          Text('Paramètres vocaux'),
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
                return ChoiceChip(
                  label: Text(voice.toUpperCase()),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedVoice = voice;
                      });
                    }
                  },
                );
              }).toList(),
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

