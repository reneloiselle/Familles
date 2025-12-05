import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/family.dart';
import '../models/schedule.dart';
import '../models/task.dart';
import '../models/shared_list.dart';
import '../models/invitation.dart';

/// Service Supabase - Point d'accès unique à Supabase
class SupabaseService {
  static bool _isInitialized = false;

  static SupabaseClient get client {
    if (!_isInitialized) {
      throw Exception('Supabase n\'est pas initialisé. Appelez SupabaseService.initialize() d\'abord.');
    }
    return Supabase.instance.client;
  }

  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    await Supabase.initialize(
      url: SupabaseConfig.url,
      anonKey: SupabaseConfig.anonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
        autoRefreshToken: true,
      ),
      realtimeClientOptions: const RealtimeClientOptions(
        logLevel: RealtimeLogLevel.info,
      ),
      storageOptions: const StorageClientOptions(
        retryAttempts: 2,
      ),
    );
    
    _isInitialized = true;
  }

  static bool get isInitialized => _isInitialized;

  // Auth methods
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    return await client.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  // Family methods
  Future<Family?> getFamilyByUserId(String userId) async {
    final response = await client
        .from('family_members')
        .select('family_id, families(*)')
        .eq('user_id', userId)
        .maybeSingle();

    if (response == null) return null;

    final familyData = (response)['families'];
    if (familyData == null) return null;

    return Family.fromJson(familyData as Map<String, dynamic>);
  }

  Future<FamilyMember?> getFamilyMemberByUserId(String userId) async {
    final response = await client
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (response == null) return null;
    return FamilyMember.fromJson(response);
  }

  Future<Family> createFamily({required String name, required String userId}) async {
    final response = await client
        .from('families')
        .insert({
          'name': name,
          'created_by': userId,
        })
        .select()
        .single();

    final family = Family.fromJson(response);

    // Créer le membre parent automatiquement
    await client.from('family_members').insert({
      'family_id': family.id,
      'user_id': userId,
      'role': 'parent',
    });

    return family;
  }

  Future<List<FamilyMember>> getFamilyMembers(String familyId) async {
    final response = await client
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => FamilyMember.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<String?> findUserByEmail(String email) async {
    final response = await client.rpc('find_user_by_email', params: {
      'email_search': email,
    });

    return response as String?;
  }

  Future<void> removeFamilyMember(String memberId) async {
    await client.from('family_members').delete().eq('id', memberId);
  }

  // Invitation methods
  Future<List<Invitation>> getInvitations(String familyId) async {
    final response = await client
        .from('invitations')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', ascending: false);

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => Invitation.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Invitation> createInvitation({
    required String familyId,
    required String email,
    required String role,
    String? name,
  }) async {
    final user = currentUser;
    if (user == null) {
      throw Exception('Vous devez être connecté');
    }

    // Vérifier si l'utilisateur existe
    final existingUserId = await findUserByEmail(email);

    // Créer ou trouver le membre de famille
    Map<String, dynamic> memberData = {
      'family_id': familyId,
      'email': email,
      'role': role,
      'invitation_status': 'pending',
    };

    if (name != null && name.isNotEmpty) {
      memberData['name'] = name;
    }

    if (existingUserId != null) {
      memberData['user_id'] = existingUserId;
    }

    final memberResponse = await client
        .from('family_members')
        .insert(memberData)
        .select()
        .single();

    final member = FamilyMember.fromJson(memberResponse);

    // Créer l'invitation
    final invitationResponse = await client
        .from('invitations')
        .insert({
          'family_id': familyId,
          'family_member_id': member.id,
          'email': email,
          'role': role,
          'invited_by': user.id,
        })
        .select()
        .single();

    return Invitation.fromJson(invitationResponse);
  }

  Future<void> cancelInvitation(String invitationId) async {
    await client
        .from('invitations')
        .update({'status': 'declined'})
        .eq('id', invitationId);
  }

  // Schedule methods
  Future<List<Schedule>> getSchedules({
    String? familyMemberId,
    String? familyId,
    DateTime? weekStart,
  }) async {
    debugPrint('=== getSchedules DEBUG ===');
    debugPrint('familyMemberId: $familyMemberId');
    debugPrint('familyId: $familyId');
    debugPrint('weekStart: $weekStart');

    var query = client.from('schedules').select('*');

    if (familyMemberId != null) {
      query = query.eq('family_member_id', familyMemberId);
      debugPrint('Filtering by familyMemberId: $familyMemberId');
    } else if (familyId != null) {
      // Pour récupérer tous les horaires de la famille
      debugPrint('Loading schedules for all family members (familyId: $familyId)');
      final members = await getFamilyMembers(familyId);
      debugPrint('Found ${members.length} family members');
      if (members.isEmpty) {
        return [];
      }
      
      // Utiliser une seule requête avec .inFilter() pour récupérer tous les schedules en une fois
      final memberIds = members.map((m) => m.id).toList();
      debugPrint('Loading schedules for member IDs: $memberIds');
      
      query = query.inFilter('family_member_id', memberIds);
      
      // Appliquer le filtre de semaine si nécessaire
      if (weekStart != null) {
        final weekEnd = weekStart.add(const Duration(days: 6));
        final weekStartStr = weekStart.toIso8601String().split('T')[0];
        final weekEndStr = weekEnd.toIso8601String().split('T')[0];
        debugPrint('Filtering by week: $weekStartStr to $weekEndStr');
        query = query
            .gte('date', weekStartStr)
            .lte('date', weekEndStr);
      }
      
      final response = await query.order('date').order('start_time');
      
      if (response.isEmpty) {
        debugPrint('No schedules found for family members');
        return [];
      }
      
      final allSchedules = (response as List)
          .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
          .toList();
      
      debugPrint('Total schedules for all members: ${allSchedules.length}');
      
      // Debug: compter les schedules par membre
      final schedulesByMember = <String, int>{};
      for (final schedule in allSchedules) {
        schedulesByMember[schedule.familyMemberId] = 
            (schedulesByMember[schedule.familyMemberId] ?? 0) + 1;
      }
      debugPrint('Schedules by member: $schedulesByMember');
      
      // Trier par date et heure
      allSchedules.sort((a, b) {
        final dateCompare = a.date.compareTo(b.date);
        if (dateCompare != 0) return dateCompare;
        return a.startTime.compareTo(b.startTime);
      });
      
      return allSchedules;
    }

    if (weekStart != null) {
      final weekEnd = weekStart.add(const Duration(days: 6));
      final weekStartStr = weekStart.toIso8601String().split('T')[0];
      final weekEndStr = weekEnd.toIso8601String().split('T')[0];
      debugPrint('Filtering by week: $weekStartStr to $weekEndStr');
      query = query
          .gte('date', weekStartStr)
          .lte('date', weekEndStr);
    }

    final response = await query.order('date').order('start_time');

    if (response.isEmpty) {
      debugPrint('No schedules found in query');
      return [];
    }

    final schedules = (response as List)
        .map((json) => Schedule.fromJson(json as Map<String, dynamic>))
        .toList();
    
    debugPrint('Returning ${schedules.length} schedules');
    for (final schedule in schedules.take(3)) {
      debugPrint('  - ${schedule.title} (${schedule.date}) - member: ${schedule.familyMemberId}');
    }
    
    return schedules;
  }

  Future<Schedule> createSchedule({
    required String familyMemberId,
    required String title,
    String? description,
    required String date,
    required String startTime,
    required String endTime,
  }) async {
    final response = await client
        .from('schedules')
        .insert({
          'family_member_id': familyMemberId,
          'title': title,
          'description': description,
          'date': date,
          'start_time': startTime,
          'end_time': endTime,
        })
        .select()
        .single();

    return Schedule.fromJson(response);
  }

  Future<void> deleteSchedule(String scheduleId) async {
    await client.from('schedules').delete().eq('id', scheduleId);
  }

  // Task methods
  Future<List<Task>> getTasks({
    required String familyId,
    String? status,
  }) async {
    var query = client.from('tasks').select('*').eq('family_id', familyId);

    if (status != null) {
      query = query.eq('status', status);
    }

    final response = await query.order('due_date', ascending: true);

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => Task.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Task> createTask({
    required String familyId,
    String? assignedTo,
    required String title,
    String? description,
    DateTime? dueDate,
    required String createdBy,
  }) async {
    final response = await client
        .from('tasks')
        .insert({
          'family_id': familyId,
          'assigned_to': assignedTo,
          'title': title,
          'description': description,
          'due_date': dueDate?.toIso8601String(),
          'status': 'pending',
          'created_by': createdBy,
        })
        .select()
        .single();

    return Task.fromJson(response);
  }

  Future<void> updateTaskStatus(String taskId, TaskStatus status) async {
    await client
        .from('tasks')
        .update({'status': status.toString()})
        .eq('id', taskId);
  }

  Future<void> deleteTask(String taskId) async {
    await client.from('tasks').delete().eq('id', taskId);
  }

  // Shared Lists methods
  Future<List<SharedList>> getSharedLists(String familyId) async {
    final response = await client
        .from('shared_lists')
        .select('*')
        .eq('family_id', familyId)
        .order('updated_at', ascending: false);

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => SharedList.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<SharedList> createSharedList({
    required String familyId,
    required String name,
    String? description,
    required String color,
    required String createdBy,
  }) async {
    final response = await client
        .from('shared_lists')
        .insert({
          'family_id': familyId,
          'name': name,
          'description': description,
          'color': color,
          'created_by': createdBy,
        })
        .select()
        .single();

    return SharedList.fromJson(response);
  }

  Future<void> updateSharedList(String listId, {String? name, String? description, String? color}) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (description != null) updates['description'] = description;
    if (color != null) updates['color'] = color;

    await client.from('shared_lists').update(updates).eq('id', listId);
  }

  Future<void> deleteSharedList(String listId) async {
    await client.from('shared_lists').delete().eq('id', listId);
  }

  Future<List<SharedListItem>> getSharedListItems(String listId) async {
    final response = await client
        .from('shared_list_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', ascending: true);

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => SharedListItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<SharedListItem>> addSharedListItems({
    required String listId,
    required List<String> texts,
    required String createdBy,
  }) async {
    final items = texts.map((text) => {
      'list_id': listId,
      'text': text.trim(),
      'created_by': createdBy,
    }).toList();

    final response = await client
        .from('shared_list_items')
        .insert(items)
        .select();

    if (response.isEmpty) return [];

    return (response as List)
        .map((json) => SharedListItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateSharedListItem(String itemId, {String? text, bool? checked}) async {
    final updates = <String, dynamic>{};
    if (text != null) updates['text'] = text;
    if (checked != null) {
      updates['checked'] = checked;
      if (checked) {
        updates['checked_at'] = DateTime.now().toIso8601String();
        updates['checked_by'] = currentUser?.id;
      } else {
        updates['checked_at'] = null;
        updates['checked_by'] = null;
      }
    }

    await client.from('shared_list_items').update(updates).eq('id', itemId);
  }

  Future<void> deleteSharedListItem(String itemId) async {
    await client.from('shared_list_items').delete().eq('id', itemId);
  }

  // Chat conversations methods
  /// Récupère ou crée une conversation pour l'utilisateur actuel
  Future<String> getOrCreateConversation() async {
    final user = currentUser;
    if (user == null) {
      throw Exception('Vous devez être connecté');
    }

    // Chercher la conversation la plus récente
    final response = await client
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (response != null) {
      return response['id'] as String;
    }

    // Créer une nouvelle conversation
    final newConversation = await client
        .from('chat_conversations')
        .insert({
          'user_id': user.id,
          'title': 'Conversation',
        })
        .select()
        .single();

    return newConversation['id'] as String;
  }

  /// Sauvegarde un message dans une conversation
  Future<void> saveMessage({
    required String conversationId,
    required String role,
    required String content,
    int? order,
  }) async {
    final user = currentUser;
    if (user == null) {
      throw Exception('Vous devez être connecté');
    }

    // Vérifier que la conversation appartient à l'utilisateur
    final conversation = await client
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (conversation == null) {
      throw Exception('Conversation non trouvée');
    }

    // Récupérer le dernier ordre si non spécifié
    int messageOrder = order ?? 0;
    if (order == null) {
      final lastMessage = await client
          .from('chat_messages')
          .select('message_order')
          .eq('conversation_id', conversationId)
          .order('message_order', ascending: false)
          .limit(1)
          .maybeSingle();

      if (lastMessage != null) {
        messageOrder = (lastMessage['message_order'] as int) + 1;
      }
    }

    await client.from('chat_messages').insert({
      'conversation_id': conversationId,
      'role': role,
      'content': content,
      'message_order': messageOrder,
    });
  }

  /// Charge une conversation avec tous ses messages
  Future<Map<String, dynamic>> loadConversation(String conversationId) async {
    final user = currentUser;
    if (user == null) {
      throw Exception('Vous devez être connecté');
    }

    // Vérifier que la conversation appartient à l'utilisateur
    final conversation = await client
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (conversation == null) {
      throw Exception('Conversation non trouvée');
    }

    // Charger les messages
    final messages = await client
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('message_order', ascending: true);

    return {
      'conversation': conversation,
      'messages': messages,
    };
  }

  /// Charge la conversation la plus récente de l'utilisateur
  Future<Map<String, dynamic>?> loadLatestConversation() async {
    final user = currentUser;
    if (user == null) {
      return null;
    }

    final conversation = await client
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (conversation == null) {
      return null;
    }

    return await loadConversation(conversation['id'] as String);
  }

  /// Liste toutes les conversations de l'utilisateur
  Future<List<Map<String, dynamic>>> getConversations() async {
    final user = currentUser;
    if (user == null) {
      return [];
    }

    final conversations = await client
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', ascending: false);

    if (conversations.isEmpty) {
      return [];
    }

    return (conversations as List)
        .map((c) => c as Map<String, dynamic>)
        .toList();
  }

  /// Supprime une conversation et tous ses messages
  Future<void> deleteConversation(String conversationId) async {
    final user = currentUser;
    if (user == null) {
      throw Exception('Vous devez être connecté');
    }

    // Vérifier que la conversation appartient à l'utilisateur
    final conversation = await client
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (conversation == null) {
      throw Exception('Conversation non trouvée');
    }

    // Supprimer la conversation (les messages seront supprimés en cascade)
    await client.from('chat_conversations').delete().eq('id', conversationId);
  }

  // Realtime subscriptions
  RealtimeChannel channel(String channelName) {
    return client.channel(channelName);
  }
}
