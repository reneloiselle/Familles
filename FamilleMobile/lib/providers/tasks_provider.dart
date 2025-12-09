import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/task.dart';
import '../services/supabase_service.dart';

/// Provider pour la gestion des tâches
class TasksProvider with ChangeNotifier {
  List<Task> _tasks = [];
  String _statusFilter = 'all';
  bool _isLoading = false;
  String? _error;

  // Realtime subscription
  RealtimeChannel? _tasksChannel;
  String? _currentFamilyId;

  List<Task> get tasks => _tasks;
  String get statusFilter => _statusFilter;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<Task> get filteredTasks {
    if (_statusFilter == 'all') {
      return _tasks;
    }
    return _tasks.where((task) => task.status.toString() == _statusFilter).toList();
  }

  final _service = SupabaseService();
  String? _currentFamilyMemberId;
  String? _currentUserId;

  Future<void> loadTasks(String familyId, String familyMemberId, String userId, {String? status}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentFamilyMemberId = familyMemberId;
      _currentUserId = userId;
      _tasks = await _service.getTasks(
        familyId: familyId,
        familyMemberId: familyMemberId,
        userId: userId,
        status: status,
      );
      
      // Initialiser la subscription Realtime si nécessaire
      if (_currentFamilyId != familyId) {
        _setupRealtimeSubscription(familyId, familyMemberId, userId);
        _currentFamilyId = familyId;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _setupRealtimeSubscription(String familyId, String familyMemberId, String userId) {
    // Nettoyer l'ancienne subscription
    _tasksChannel?.unsubscribe();

    // Subscription pour les tâches
    _tasksChannel = SupabaseService.client
        .channel('tasks_$familyId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'tasks',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'family_id',
            value: familyId,
          ),
          callback: (payload) {
            _handleTaskChange(payload);
          },
        )
        .subscribe();
  }

  void _handleTaskChange(PostgresChangePayload payload) {
    // Filtrer pour ne garder que les tâches créées par l'utilisateur ou assignées à l'utilisateur
    final shouldIncludeTask = (Task task) {
      if (_currentUserId == null || _currentFamilyMemberId == null) return false;
      return task.createdBy == _currentUserId || task.assignedTo == _currentFamilyMemberId;
    };

    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newTask = Task.fromJson(payload.newRecord);
        if (shouldIncludeTask(newTask)) {
          _tasks = [newTask, ..._tasks];
        }
        _tasks.sort((a, b) {
          // Trier par date d'échéance (null en dernier), puis par date de création
          if (a.dueDate != null && b.dueDate != null) {
            final dateCompare = a.dueDate!.compareTo(b.dueDate!);
            if (dateCompare != 0) return dateCompare;
          } else if (a.dueDate != null) {
            return -1;
          } else if (b.dueDate != null) {
            return 1;
          }
          return b.createdAt.compareTo(a.createdAt);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedTask = Task.fromJson(payload.newRecord);
        if (shouldIncludeTask(updatedTask)) {
          // Si la tâche existe déjà, la mettre à jour, sinon l'ajouter
          final existingIndex = _tasks.indexWhere((t) => t.id == updatedTask.id);
          if (existingIndex >= 0) {
            _tasks[existingIndex] = updatedTask;
          } else {
            _tasks = [updatedTask, ..._tasks];
          }
        } else {
          // Si la tâche n'est plus pertinente, la retirer
          _tasks = _tasks.where((t) => t.id != updatedTask.id).toList();
        }
        _tasks.sort((a, b) {
          if (a.dueDate != null && b.dueDate != null) {
            final dateCompare = a.dueDate!.compareTo(b.dueDate!);
            if (dateCompare != 0) return dateCompare;
          } else if (a.dueDate != null) {
            return -1;
          } else if (b.dueDate != null) {
            return 1;
          }
          return b.createdAt.compareTo(a.createdAt);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String;
        _tasks = _tasks.where((task) => task.id != deletedId).toList();
        notifyListeners();
        break;
      default:
        break;
    }
  }

  void setStatusFilter(String status) {
    _statusFilter = status;
    notifyListeners();
  }

  Future<void> createTask({
    required String familyId,
    String? assignedTo,
    required String title,
    String? description,
    DateTime? dueDate,
    String priority = 'medium',
    required String createdBy,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.createTask(
        familyId: familyId,
        assignedTo: assignedTo,
        title: title,
        description: description,
        dueDate: dueDate,
        priority: priority,
        createdBy: createdBy,
      );
      // Realtime mettra à jour automatiquement _tasks
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateTaskStatus(String taskId, TaskStatus status) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.updateTask(taskId: taskId, status: status);
      // Realtime mettra à jour automatiquement _tasks
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateTask({
    required String taskId,
    String? assignedTo,
    String? title,
    String? description,
    DateTime? dueDate,
    String? priority,
    TaskStatus? status,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.updateTask(
        taskId: taskId,
        assignedTo: assignedTo,
        title: title,
        description: description,
        dueDate: dueDate,
        priority: priority,
        status: status,
      );
      // Realtime mettra à jour automatiquement _tasks
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteTask(String taskId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.deleteTask(taskId);
      // Realtime mettra à jour automatiquement _tasks
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    // Nettoyer la subscription Realtime
    _tasksChannel?.unsubscribe();
    super.dispose();
  }
}

