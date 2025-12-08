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
  final Function(DateTime)? onViewChanged; // Callback quand la plage visible change

  const FamilyCalendarView({
    super.key,
    required this.schedules,
    required this.familyMembers,
    required this.selectedDate,
    this.onAppointmentTap,
    this.onAppointmentLongPress,
    this.currentUserId,
    this.calendarView = CalendarView.workWeek,
    this.onViewChanged,
  });

  /// Convertit les Schedule en Appointments pour Syncfusion
  List<Appointment> _getAppointments() {
    final appointments = <Appointment>[];
    
    debugPrint('=== _getAppointments DEBUG ===');
    debugPrint('Schedules count: ${schedules.length}');
    debugPrint('Family members count: ${familyMembers.length}');
    
    // Afficher tous les IDs des membres
    debugPrint('Family member IDs:');
    for (final member in familyMembers) {
      debugPrint('  - ${member.id} (name: ${member.name ?? "N/A"}, email: ${member.email ?? "N/A"})');
    }
    
    for (final schedule in schedules) {
      debugPrint('Processing schedule: ${schedule.id}');
      debugPrint('  - familyMemberId: ${schedule.familyMemberId}');
      debugPrint('  - title: ${schedule.title}');
      debugPrint('  - date: ${schedule.date}');
      debugPrint('  - startTime: ${schedule.startTime}');
      debugPrint('  - endTime: ${schedule.endTime}');
      debugPrint('  - startDateTime: ${schedule.startDateTime}');
      debugPrint('  - endDateTime: ${schedule.endDateTime}');
      
      // Trouver le membre de famille correspondant
      // IMPORTANT: Ne créer un appointment que si le membre existe dans familyMembers
      // Chaque resourceId doit correspondre à une ressource existante dans le calendrier
      final matchingMembers = familyMembers.where((m) => m.id == schedule.familyMemberId).toList();
      
      if (matchingMembers.isEmpty) {
        debugPrint('  SKIPPING: No member found with ID ${schedule.familyMemberId}');
        debugPrint('  Available member IDs: ${familyMembers.map((m) => m.id).join(", ")}');
        debugPrint('  This schedule will not be displayed because its member is not in the resources list');
        continue; // Ne pas créer d'appointment si le membre n'existe pas
      }
      
      final member = matchingMembers.first;
      debugPrint('  Found member: ${member.id} (${member.name ?? member.email})');

      // Créer la couleur basée sur le membre (hash de l'ID pour une couleur stable)
      final color = _getColorForMember(member.id);

      // IMPORTANT: Utiliser l'ID du membre trouvé comme resourceId
      // Cela garantit que le resourceId correspond toujours à une ressource existante
      final resourceId = member.id.trim();
      
      debugPrint('  Creating appointment with resourceId: "$resourceId" (from member.id)');
      debugPrint('  Member ID: "${member.id}"');
      debugPrint('  Schedule familyMemberId: "${schedule.familyMemberId}"');
      debugPrint('  IDs match: ${member.id == schedule.familyMemberId}');
      debugPrint('  Using resourceId: "$resourceId" (type: String)');

      // Créer l'appointment avec le resourceId
      // Note: resourceIds peut être une liste de String ou d'objets CalendarResource
      final appointment = Appointment(
        startTime: schedule.startDateTime,
        endTime: schedule.endDateTime,
        subject: schedule.title,
        notes: schedule.description,
        color: color,
        resourceIds: <Object>[resourceId], // S'assurer que c'est une liste d'Objects
        id: schedule.id,
      );
      
      debugPrint('  Appointment resourceIds type: ${appointment.resourceIds.runtimeType}');
      debugPrint('  Appointment resourceIds[0] type: ${appointment.resourceIds?.first.runtimeType}');
      
      debugPrint('  Appointment created:');
      debugPrint('    - id: "${appointment.id}"');
      debugPrint('    - resourceIds: ${appointment.resourceIds}');
      debugPrint('    - resourceIds[0]: "${appointment.resourceIds?.first.toString() ?? "NULL"}"');
      debugPrint('    - startTime: ${appointment.startTime}');
      debugPrint('    - endTime: ${appointment.endTime}');
      debugPrint('    - subject: ${appointment.subject}');
      
      appointments.add(appointment);
    }
    
    debugPrint('Total appointments created: ${appointments.length}');
    debugPrint('=== End _getAppointments DEBUG ===');
    
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
  /// IMPORTANT: Une ressource est créée pour CHAQUE membre de la famille,
  /// même s'il n'a pas de schedules. Cela garantit que chaque resourceId
  /// dans les appointments correspond à une ressource existante.
  List<CalendarResource> _getResources() {
    debugPrint('=== _getResources DEBUG ===');
    debugPrint('Creating resources for ${familyMembers.length} family members');
    
    if (familyMembers.isEmpty) {
      debugPrint('WARNING: No family members provided!');
      return [];
    }
    
    // Créer une ressource pour CHAQUE membre de la famille
    final resources = <CalendarResource>[];
    
    for (final member in familyMembers) {
      String displayName = 'Membre';
      if (member.userId == currentUserId) {
        displayName = 'Vous';
      } else if (member.name != null && member.name!.isNotEmpty) {
        displayName = member.name!;
      } else if (member.email != null && member.email!.isNotEmpty) {
        displayName = member.email!;
      } else {
        displayName = 'Membre ${member.id.substring(0, 8)}';
      }

      // Ajouter le rôle si c'est un parent
      if (member.role == 'parent') {
        displayName += ' (Parent)';
      }

      // IMPORTANT: Utiliser member.id qui est l'ID de la table family_members
      // C'est cet ID qui est utilisé dans schedules.family_member_id
      final resourceId = member.id.trim(); // Nettoyer les espaces
      
      debugPrint('  Creating resource for member:');
      debugPrint('    - member.id: "$resourceId"');
      debugPrint('    - displayName: "$displayName"');
      debugPrint('    - role: ${member.role}');
      
      final resource = CalendarResource(
        id: resourceId, // ID de la table family_members - doit être String
        displayName: displayName,
        color: _getColorForMember(member.id),
      );
      
      debugPrint('    - Resource created with id: "${resource.id}"');
      
      resources.add(resource);
    }
    
    debugPrint('Total resources created: ${resources.length}');
    debugPrint('Resource IDs: ${resources.map((r) => r.id.toString()).join(", ")}');
    debugPrint('=== End _getResources DEBUG ===');
    
    return resources;
  }

  @override
  Widget build(BuildContext context) {
    // IMPORTANT: Créer les resources AVANT les appointments
    // Cela garantit que chaque resourceId dans les appointments correspond à une ressource existante
    final resources = _getResources();
    final appointments = _getAppointments();
    
    // Vérification: s'assurer que tous les resourceIds des appointments correspondent à des resources
    final resourceIds = resources.map((r) => r.id.toString()).toSet();
    for (final appointment in appointments) {
      if (appointment.resourceIds != null && appointment.resourceIds!.isNotEmpty) {
        final aptResourceId = appointment.resourceIds!.first.toString();
        if (!resourceIds.contains(aptResourceId)) {
          debugPrint('ERROR: Appointment ${appointment.id} has resourceId "$aptResourceId" that does not exist in resources!');
        }
      }
    }

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
      resourceViewSettings: const ResourceViewSettings(
        size: 120,
        displayNameTextStyle: TextStyle(
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
      onViewChanged: (ViewChangedDetails details) {
        // Détecter quand l'utilisateur change de plage (semaine/mois) dans le calendrier
        debugPrint('=== Calendar view changed ===');
        debugPrint('Visible dates count: ${details.visibleDates.length}');
        if (details.visibleDates.isNotEmpty) {
          final firstVisibleDate = details.visibleDates.first;
          final lastVisibleDate = details.visibleDates.last;
          debugPrint('First visible date: $firstVisibleDate');
          debugPrint('Last visible date: $lastVisibleDate');
          debugPrint('Current selected date: $selectedDate');
          
          // Pour workWeek et timelineWeek, utiliser le lundi de la semaine visible
          DateTime dateToUse = firstVisibleDate;
          if (view == CalendarView.workWeek || view == CalendarView.timelineWeek) {
            // Calculer le lundi de la semaine
            final daysFromMonday = firstVisibleDate.weekday - 1;
            dateToUse = firstVisibleDate.subtract(Duration(days: daysFromMonday));
            debugPrint('Calculated Monday of week: $dateToUse');
          }
          
          // Appeler le callback pour recharger les données pour la nouvelle plage
          if (onViewChanged != null) {
            debugPrint('Calling onViewChanged with date: $dateToUse');
            onViewChanged!(dateToUse);
          }
        }
      },
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
        final resourceIdObj = appointment.resourceIds!.first;
        final resourceId = resourceIdObj.toString();
        debugPrint('  Appointment resourceId type: ${resourceIdObj.runtimeType}');
        debugPrint('  Appointment resourceId value: "$resourceId"');
        
        // Vérifier avec différents formats
        final resourceExistsById = resources.any((r) {
          final rId = r.id.toString();
          final match = rId == resourceId;
          if (!match) {
            debugPrint('    Comparing: "$rId" == "$resourceId" = $match');
          }
          return match;
        });
        
        // Vérifier aussi avec l'objet directement
        final resourceExistsByObject = resources.any((r) => r.id == resourceIdObj);
        
        debugPrint('  Resource exists (by string): $resourceExistsById');
        debugPrint('  Resource exists (by object): $resourceExistsByObject');
        
        if (!resourceExistsById && !resourceExistsByObject) {
          debugPrint('ERROR: Appointment ${appointment.id} references non-existent resource "$resourceId"');
          debugPrint('  Available resource IDs:');
          for (final r in resources) {
            debugPrint('    - "${r.id}" (type: ${r.id.runtimeType})');
          }
        } else {
          debugPrint('OK: Appointment ${appointment.id} linked to resource "$resourceId"');
          debugPrint('  - Start: ${appointment.startTime}');
          debugPrint('  - End: ${appointment.endTime}');
          debugPrint('  - Subject: ${appointment.subject}');
        }
      }
    }
    
    for (final resource in resources) {
      debugPrint('Checking resource: "${resource.displayName}"');
      debugPrint('  Resource ID: "${resource.id}" (type: ${resource.id.runtimeType})');
      
      final resourceAppointments = appointments.where((a) {
        if (a.resourceIds == null || a.resourceIds!.isEmpty) {
          return false;
        }
        
        final aptResourceIdObj = a.resourceIds!.first;
        final aptResourceId = aptResourceIdObj.toString().trim();
        final resId = resource.id.toString().trim();
        
        // Essayer plusieurs méthodes de comparaison
        final matchString = aptResourceId == resId;
        final matchObject = aptResourceIdObj == resource.id;
        final matchHashCode = aptResourceIdObj.hashCode == resource.id.hashCode;
        
        debugPrint('    Comparing appointment resourceId with resource id:');
        debugPrint('      - Appointment resourceId: "$aptResourceId" (type: ${aptResourceIdObj.runtimeType})');
        debugPrint('      - Resource id: "$resId" (type: ${resource.id.runtimeType})');
        debugPrint('      - Match (string): $matchString');
        debugPrint('      - Match (object): $matchObject');
        debugPrint('      - Match (hashCode): $matchHashCode');
        
        final match = matchString || matchObject;
        if (!match) {
          debugPrint('      - ERROR: IDs do not match!');
        }
        
        return match;
      }).toList();
      
      debugPrint('Resource "${resource.displayName}" ("${resource.id}"): ${resourceAppointments.length} appointments');
      if (resourceAppointments.isEmpty) {
        debugPrint('  WARNING: No appointments for this resource!');
        // Afficher les resourceIds des appointments pour debug
        debugPrint('  Available appointment resourceIds:');
        for (final apt in appointments.take(5)) {
          if (apt.resourceIds != null && apt.resourceIds!.isNotEmpty) {
            debugPrint('    - "${apt.resourceIds!.first}" (type: ${apt.resourceIds!.first.runtimeType})');
          }
        }
      } else {
        debugPrint('  SUCCESS: Found ${resourceAppointments.length} appointments for this resource');
      }
    }
    debugPrint('=== End DataSource Initialization ===');
  }
  
}

