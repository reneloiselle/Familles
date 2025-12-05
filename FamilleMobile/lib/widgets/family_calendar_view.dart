import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_calendar/calendar.dart';
import '../models/schedule.dart';
import '../models/family.dart';

/// Widget qui affiche un calendrier Syncfusion en mode ressource pour l'agenda famille
class FamilyCalendarView extends StatelessWidget {
  final List<Schedule> schedules;
  final List<FamilyMember> familyMembers;
  final DateTime selectedDate;
  final Function(Schedule)? onAppointmentTap;
  final Function(Schedule)? onAppointmentLongPress;
  final String? currentUserId;
  final CalendarView calendarView;

  const FamilyCalendarView({
    super.key,
    required this.schedules,
    required this.familyMembers,
    required this.selectedDate,
    this.onAppointmentTap,
    this.onAppointmentLongPress,
    this.currentUserId,
    this.calendarView = CalendarView.workWeek,
  });

  /// Convertit les Schedule en Appointments pour Syncfusion
  List<Appointment> _getAppointments() {
    final appointments = <Appointment>[];
    
    for (final schedule in schedules) {
      // Trouver le membre de famille pour obtenir le nom
      final member = familyMembers.firstWhere(
        (m) => m.id == schedule.familyMemberId,
        orElse: () {
          // Si le membre n'est pas trouvé, retourner le premier ou créer un membre par défaut
          if (familyMembers.isEmpty) {
            throw Exception('Aucun membre de famille trouvé');
          }
          return familyMembers.first;
        },
      );

      // Créer la couleur basée sur le membre (hash de l'ID pour une couleur stable)
      final color = _getColorForMember(member.id);

      // S'assurer que le resourceId correspond bien à l'ID du membre
      final resourceId = member.id;

      appointments.add(Appointment(
        startTime: schedule.startDateTime,
        endTime: schedule.endDateTime,
        subject: schedule.title,
        notes: schedule.description,
        color: color,
        resourceIds: [resourceId],
        id: schedule.id,
      ));
    }
    
    return appointments;
  }

  /// Calcule le lundi de la semaine pour une date donnée
  DateTime _getMondayOfWeek(DateTime date) {
    final daysFromMonday = date.weekday - 1;
    final monday = date.subtract(Duration(days: daysFromMonday));
    // Retourner le lundi à minuit pour éviter les problèmes de timezone
    return DateTime(monday.year, monday.month, monday.day);
  }

  /// Génère une couleur stable pour chaque membre
  Color _getColorForMember(String memberId) {
    // Hash simple de l'ID pour obtenir une couleur stable
    int hash = memberId.hashCode;
    // Utiliser des couleurs prédéfinies pour un meilleur rendu
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.indigo,
      Colors.pink,
      Colors.amber,
      Colors.cyan,
    ];
    return colors[hash.abs() % colors.length];
  }

  /// Crée les ressources (membres de famille) pour le calendrier
  List<CalendarResource> _getResources() {
    return familyMembers.map((member) {
      String displayName = 'Membre';
      if (member.userId == currentUserId) {
        displayName = 'Vous';
      } else if (member.name != null) {
        displayName = member.name!;
      } else if (member.email != null) {
        displayName = member.email!;
      } else {
        displayName = 'Membre ${member.id.substring(0, 8)}';
      }

      // Ajouter le rôle si c'est un parent
      if (member.role == 'parent') {
        displayName += ' (Parent)';
      }

      return CalendarResource(
        id: member.id,
        displayName: displayName,
        color: _getColorForMember(member.id),
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final appointments = _getAppointments();
    final resources = _getResources();

    // Debug: vérifier les données
    debugPrint('FamilyCalendarView: ${schedules.length} schedules, ${appointments.length} appointments, ${resources.length} resources');
    if (appointments.isNotEmpty) {
      debugPrint('First appointment resourceIds: ${appointments.first.resourceIds}');
      debugPrint('First appointment startTime: ${appointments.first.startTime}');
      debugPrint('First appointment endTime: ${appointments.first.endTime}');
    }
    if (resources.isNotEmpty) {
      debugPrint('First resource id: ${resources.first.id}');
    }
    debugPrint('Selected date: $selectedDate');

    // Pour la vue semaine, utiliser timelineWeek pour supporter les ressources
    final view = calendarView == CalendarView.week 
        ? CalendarView.timelineWeek 
        : calendarView;

    // Calculer le lundi de la semaine pour timelineWeek
    final displayDate = view == CalendarView.timelineWeek 
        ? _getMondayOfWeek(selectedDate)
        : selectedDate;
    
    debugPrint('Calendar view: $view');
    debugPrint('Display date: $displayDate');
    debugPrint('Selected date: $selectedDate');
    
    // Vérifier si les appointments sont dans la semaine visible
    if (view == CalendarView.timelineWeek && appointments.isNotEmpty) {
      final weekStart = displayDate;
      final weekEnd = weekStart.add(const Duration(days: 6));
      final visibleAppointments = appointments.where((a) {
        return a.startTime.isAfter(weekStart.subtract(const Duration(days: 1))) &&
               a.startTime.isBefore(weekEnd.add(const Duration(days: 1)));
      }).toList();
      debugPrint('Appointments in visible week: ${visibleAppointments.length} / ${appointments.length}');
      if (visibleAppointments.isEmpty && appointments.isNotEmpty) {
        debugPrint('WARNING: No appointments in visible week range!');
        debugPrint('Week range: $weekStart to $weekEnd');
        for (final apt in appointments.take(3)) {
          debugPrint('  Appointment: ${apt.startTime} (in range: ${apt.startTime.isAfter(weekStart.subtract(const Duration(days: 1))) && apt.startTime.isBefore(weekEnd.add(const Duration(days: 1)))})');
        }
      }
    }

    return SfCalendar(
      view: view,
      resourceViewSettings: ResourceViewSettings(
        size: 120,
        displayNameTextStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      dataSource: _FamilyCalendarDataSource(appointments, resources),
      monthViewSettings: const MonthViewSettings(
        appointmentDisplayMode: MonthAppointmentDisplayMode.appointment,
        showAgenda: false,
      ),
      headerStyle: const CalendarHeaderStyle(
        textStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      todayHighlightColor: Theme.of(context).colorScheme.primary,
      onTap: (CalendarTapDetails details) {
        if (details.appointments != null && details.appointments!.isNotEmpty) {
          final appointment = details.appointments!.first as Appointment;
          final schedule = schedules.firstWhere(
            (s) => s.id == appointment.id,
          );
          onAppointmentTap?.call(schedule);
        }
      },
      onLongPress: (CalendarLongPressDetails details) {
        if (details.appointments != null && details.appointments!.isNotEmpty) {
          final appointment = details.appointments!.first as Appointment;
          final schedule = schedules.firstWhere(
            (s) => s.id == appointment.id,
          );
          onAppointmentLongPress?.call(schedule);
        }
      },
      allowViewNavigation: true,
      showNavigationArrow: true,
      showDatePickerButton: true,
      initialDisplayDate: displayDate,
      initialSelectedDate: selectedDate,
      timeSlotViewSettings: const TimeSlotViewSettings(
        timeInterval: Duration(minutes: 30),
        timeFormat: 'HH:mm',
        timeRulerSize: 60,
        dateFormat: 'EEE',
        dayFormat: 'd',
      ),
      // Personnalisation des couleurs
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
    );
  }
}

/// DataSource personnalisé pour le calendrier famille
class _FamilyCalendarDataSource extends CalendarDataSource {
  _FamilyCalendarDataSource(
    List<Appointment> appointments,
    List<CalendarResource> resources,
  ) {
    // S'assurer que les appointments et resources sont bien assignés
    this.appointments = appointments;
    this.resources = resources;
    
    // Debug: vérifier que les appointments ont bien des resourceIds
    debugPrint('=== DataSource Initialization ===');
    debugPrint('Appointments count: ${appointments.length}');
    debugPrint('Resources count: ${resources.length}');
    
    for (final appointment in appointments) {
      if (appointment.resourceIds == null || appointment.resourceIds!.isEmpty) {
        debugPrint('ERROR: Appointment ${appointment.id} has no resourceIds');
      } else {
        final resourceId = appointment.resourceIds!.first;
        final resourceExists = resources.any((r) => r.id == resourceId);
        if (!resourceExists) {
          debugPrint('ERROR: Appointment ${appointment.id} references non-existent resource $resourceId');
          debugPrint('  Available resource IDs: ${resources.map((r) => r.id).join(", ")}');
        } else {
          debugPrint('OK: Appointment ${appointment.id} linked to resource $resourceId');
          debugPrint('  - Start: ${appointment.startTime}');
          debugPrint('  - End: ${appointment.endTime}');
          debugPrint('  - Subject: ${appointment.subject}');
        }
      }
    }
    
    for (final resource in resources) {
      final resourceAppointments = appointments.where((a) => 
        a.resourceIds != null && 
        a.resourceIds!.isNotEmpty && 
        a.resourceIds!.first == resource.id
      ).toList();
      debugPrint('Resource "${resource.displayName}" (${resource.id}): ${resourceAppointments.length} appointments');
      if (resourceAppointments.isEmpty) {
        debugPrint('  WARNING: No appointments for this resource!');
      }
    }
    debugPrint('=== End DataSource Initialization ===');
  }
  
}

