import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/schedule.dart';
import '../services/supabase_service.dart';

/// Provider pour la gestion des horaires
class ScheduleProvider with ChangeNotifier {
  List<Schedule> _schedules = [];
  String _view = 'personal'; // 'personal', 'family', 'calendar', 'week'
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;
  String? _error;

  // Realtime subscriptions
  RealtimeChannel? _schedulesChannel;
  String? _currentFamilyId;

  List<Schedule> get schedules => _schedules;
  String get view => _view;
  DateTime get selectedDate => _selectedDate;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final _service = SupabaseService();

  void setView(String view) {
    _view = view;
    notifyListeners();
  }

  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  Future<void> loadSchedules({
    required String familyId,
    String? familyMemberId,
    DateTime? date,
    DateTime? weekStart,
    DateTime? dateRangeStart,
    DateTime? dateRangeEnd,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (familyMemberId != null) {
        // Charger pour un membre spécifique
        _schedules = await _service.getSchedules(
          familyMemberId: familyMemberId,
          weekStart: weekStart,
        );
        // Filtrer par date si nécessaire
        if (date != null) {
          final dateStr = date.toIso8601String().split('T')[0];
          _schedules = _schedules.where((s) => s.date == dateStr).toList();
        }
        // Trier les horaires par date puis par heure de début
        _schedules.sort((a, b) {
          final dateCompare = a.date.compareTo(b.date);
          if (dateCompare != 0) return dateCompare;
          return a.startTime.compareTo(b.startTime);
        });
      } else {
        // Charger pour toute la famille
        debugPrint('=== ScheduleProvider.loadSchedules ===');
        debugPrint('Loading schedules for family: $familyId');
        debugPrint('Date filter: $date');
        debugPrint('WeekStart: $weekStart');
        
        _schedules = await _service.getSchedules(
          familyId: familyId,
          weekStart: weekStart,
          dateRangeStart: dateRangeStart,
          dateRangeEnd: dateRangeEnd,
        );
        
        debugPrint('Loaded ${_schedules.length} schedules');
        
        // Filtrer par date seulement pour la vue personnelle avec une date spécifique
        // Pour les vues family et week, on ne filtre pas par date car on veut voir toute la semaine
        if (date != null && weekStart == null) {
          // Seulement filtrer par date si on n'a pas de weekStart (vue personnelle avec date spécifique)
          final dateStr = date.toIso8601String().split('T')[0];
          debugPrint('Filtering by date: $dateStr');
          final beforeFilter = _schedules.length;
          _schedules = _schedules.where((s) => s.date == dateStr).toList();
          debugPrint('After date filter: ${_schedules.length} schedules (was $beforeFilter)');
        }
        
        // Trier les horaires par date puis par heure de début
        _schedules.sort((a, b) {
          final dateCompare = a.date.compareTo(b.date);
          if (dateCompare != 0) return dateCompare;
          return a.startTime.compareTo(b.startTime);
        });
        
        // Debug: afficher les schedules par membre
        final schedulesByMember = <String, int>{};
        for (final schedule in _schedules) {
          schedulesByMember[schedule.familyMemberId] = 
              (schedulesByMember[schedule.familyMemberId] ?? 0) + 1;
        }
        debugPrint('Schedules by member: $schedulesByMember');
        debugPrint('Final schedules count: ${_schedules.length}');
      }

      // Initialiser les subscriptions Realtime
      _setupRealtimeSubscription(familyId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _setupRealtimeSubscription(String familyId) {
    // Nettoyer l'ancienne subscription
    _schedulesChannel?.unsubscribe();
    if (_currentFamilyId == familyId) return;
    _currentFamilyId = familyId;

    // Subscription pour tous les horaires (on filtre côté client)
    // On s'abonne à tous les changements et on filtre par famille côté client
    _schedulesChannel = SupabaseService.client
        .channel('schedules_$familyId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'schedules',
          callback: (payload) {
            _handleScheduleChange(payload);
          },
        )
        .subscribe();
  }

  void _handleScheduleChange(PostgresChangePayload payload) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newSchedule = Schedule.fromJson(payload.newRecord);
        _schedules = [..._schedules, newSchedule];
        _schedules.sort((a, b) {
          final dateCompare = a.date.compareTo(b.date);
          if (dateCompare != 0) return dateCompare;
          return a.startTime.compareTo(b.startTime);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedSchedule = Schedule.fromJson(payload.newRecord);
        _schedules = _schedules
            .map((schedule) => schedule.id == updatedSchedule.id ? updatedSchedule : schedule)
            .toList();
        _schedules.sort((a, b) {
          final dateCompare = a.date.compareTo(b.date);
          if (dateCompare != 0) return dateCompare;
          return a.startTime.compareTo(b.startTime);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String;
        _schedules = _schedules.where((schedule) => schedule.id != deletedId).toList();
        notifyListeners();
        break;
      default:
        break;
    }
  }

  Future<void> createSchedule({
    required String familyMemberId,
    required String title,
    String? description,
    required String date,
    required String startTime,
    required String endTime,
    String? location,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.createSchedule(
        familyMemberId: familyMemberId,
        title: title,
        description: description,
        date: date,
        startTime: startTime,
        endTime: endTime,
        location: location,
      );
      // Realtime mettra à jour automatiquement _schedules
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteSchedule(String scheduleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.deleteSchedule(scheduleId);
      // Realtime mettra à jour automatiquement _schedules
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<Schedule> getSchedulesForDate(String date) {
    return _schedules.where((s) => s.date == date).toList();
  }

  List<Schedule> getSchedulesForMemberAndDate(String memberId, String date) {
    return _schedules.where((s) => s.familyMemberId == memberId && s.date == date).toList();
  }

  List<Schedule> getPersonalSchedules(String userId) {
    // Filtrer côté client pour obtenir les horaires personnels
    // Note: Cela nécessite que les schedules incluent l'information du membre
    return _schedules;
  }

  // Fonctions de détection de chevauchement et back-to-back
  bool schedulesOverlap(Schedule schedule1, Schedule schedule2) {
    if (schedule1.date != schedule2.date) return false;
    
    // Convertir les heures en minutes pour faciliter la comparaison
    int timeToMinutes(String time) {
      final parts = time.split(':');
      return int.parse(parts[0]) * 60 + int.parse(parts[1]);
    }
    
    final start1 = timeToMinutes(schedule1.startTime);
    final end1 = timeToMinutes(schedule1.endTime);
    final start2 = timeToMinutes(schedule2.startTime);
    final end2 = timeToMinutes(schedule2.endTime);
    
    // Deux horaires se chevauchent si l'un commence avant que l'autre se termine
    // et se termine après que l'autre commence
    return (start1 < end2 && end1 > start2);
  }

  List<String> getOverlappingScheduleIds(Schedule schedule, List<Schedule> allSchedules) {
    return allSchedules
        .where((s) => s.id != schedule.id && schedulesOverlap(schedule, s))
        .map((s) => s.id)
        .toList();
  }

  // Fonction pour vérifier si deux horaires sont back-to-back (moins de 30 minutes entre eux)
  bool schedulesAreBackToBack(Schedule schedule1, Schedule schedule2) {
    // Doit être le même membre et la même date
    if (schedule1.familyMemberId != schedule2.familyMemberId || schedule1.date != schedule2.date) {
      return false;
    }

    // Convertir les heures en minutes pour faciliter la comparaison
    int timeToMinutes(String time) {
      final parts = time.split(':');
      return int.parse(parts[0]) * 60 + int.parse(parts[1]);
    }

    final end1 = timeToMinutes(schedule1.endTime);
    final start2 = timeToMinutes(schedule2.startTime);
    final end2 = timeToMinutes(schedule2.endTime);
    final start1 = timeToMinutes(schedule1.startTime);

    // Vérifier si schedule1 se termine et schedule2 commence dans les 30 minutes
    if (end1 <= start2 && start2 - end1 <= 30) {
      return true;
    }

    // Vérifier si schedule2 se termine et schedule1 commence dans les 30 minutes
    if (end2 <= start1 && start1 - end2 <= 30) {
      return true;
    }

    return false;
  }

  List<String> getBackToBackScheduleIds(Schedule schedule, List<Schedule> allSchedules) {
    return allSchedules
        .where((s) => s.id != schedule.id && schedulesAreBackToBack(schedule, s))
        .map((s) => s.id)
        .toList();
  }

  Future<void> updateSchedule({
    required String scheduleId,
    String? title,
    String? description,
    String? date,
    String? startTime,
    String? endTime,
    String? location,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.updateSchedule(
        scheduleId: scheduleId,
        title: title,
        description: description,
        date: date,
        startTime: startTime,
        endTime: endTime,
        location: location,
      );
      // Realtime mettra à jour automatiquement _schedules
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
    // Nettoyer les subscriptions Realtime
    _schedulesChannel?.unsubscribe();
    super.dispose();
  }
}

