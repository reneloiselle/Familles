import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:syncfusion_flutter_calendar/calendar.dart';
import '../../providers/schedule_provider.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/schedule.dart';
import '../../models/family.dart';
import '../../widgets/family_calendar_view.dart';
import '../../widgets/location_picker.dart';
import '../../widgets/location_viewer.dart';

class ScheduleScreen extends StatelessWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<FamilyProvider>(
      builder: (context, familyProvider, _) {
        if (!familyProvider.hasFamily) {
          return Scaffold(
            appBar: AppBar(title: const Text('Horaires')),
            body: const Center(
              child: Text('Vous devez d\'abord créer une famille'),
            ),
          );
        }

        return ChangeNotifierProvider(
          create: (_) => ScheduleProvider(),
          child: _ScheduleScreenContent(
            familyId: familyProvider.family!.id,
            familyMember: familyProvider.familyMember!,
            familyMembers: familyProvider.familyMembers,
            isParent: familyProvider.isParent,
          ),
        );
      },
    );
  }
}

class _ScheduleScreenContent extends StatefulWidget {
  final String familyId;
  final FamilyMember familyMember;
  final List<FamilyMember> familyMembers;
  final bool isParent;

  const _ScheduleScreenContent({
    required this.familyId,
    required this.familyMember,
    required this.familyMembers,
    required this.isParent,
  });

  @override
  State<_ScheduleScreenContent> createState() => _ScheduleScreenContentState();
}

class _ScheduleScreenContentState extends State<_ScheduleScreenContent> {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedules();
    });
  }

  void _loadSchedules() {
    final provider = context.read<ScheduleProvider>();
    final view = provider.view;
    final selectedDate = provider.selectedDate;

    DateTime? weekStart;
    DateTime? date;

    DateTime? dateRangeStart;
    DateTime? dateRangeEnd;

    if (view == 'week') {
      // Calculer le lundi de la semaine
      final monday = selectedDate.subtract(Duration(days: selectedDate.weekday - 1));
      weekStart = DateTime(monday.year, monday.month, monday.day);
    } else if (view == 'calendar') {
      // Pour la vue calendrier, afficher les 7 prochains jours à partir d'aujourd'hui
      final today = DateTime.now();
      dateRangeStart = DateTime(today.year, today.month, today.day);
      dateRangeEnd = dateRangeStart.add(const Duration(days: 7));
    } else if (view == 'family') {
      // Pour la vue famille, afficher les 7 prochains jours à partir d'aujourd'hui
      final today = DateTime.now();
      dateRangeStart = DateTime(today.year, today.month, today.day);
      dateRangeEnd = dateRangeStart.add(const Duration(days: 7));
    }

    provider.loadSchedules(
      familyId: widget.familyId,
      familyMemberId: view == 'personal' ? widget.familyMember.id : null,
      date: date,
      weekStart: weekStart,
      dateRangeStart: dateRangeStart,
      dateRangeEnd: dateRangeEnd,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Horaires'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showScheduleModal(context),
          ),
        ],
      ),
      body: Consumer<ScheduleProvider>(
        builder: (context, provider, _) {
          // Pour les vues avec calendrier (calendar et week), on utilise une structure avec Expanded
          // Pour les vues personal et family, on utilise un SingleChildScrollView
          final isCalendarView = provider.view == 'calendar' || provider.view == 'week';
          
          return RefreshIndicator(
            onRefresh: () async => _loadSchedules(),
            child: isCalendarView
                ? Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (provider.error != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              border: Border.all(color: Colors.red.shade300),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              provider.error!,
                              style: TextStyle(color: Colors.red.shade700),
                            ),
                          ),
                        if (widget.isParent) ...[
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _ViewChip(
                                  label: 'Mon agenda',
                                  isSelected: provider.view == 'personal',
                                  onTap: () {
                                    provider.setView('personal');
                                    _loadSchedules();
                                  },
                                ),
                                const SizedBox(width: 8),
                                _ViewChip(
                                  label: 'Familles',
                                  isSelected: provider.view == 'family',
                                  onTap: () {
                                    provider.setView('family');
                                    _loadSchedules();
                                  },
                                ),
                                const SizedBox(width: 8),
                                _ViewChip(
                                  label: 'Calendrier',
                                  isSelected: provider.view == 'calendar',
                                  onTap: () {
                                    provider.setView('calendar');
                                    _loadSchedules();
                                  },
                                ),
                                const SizedBox(width: 8),
                                _ViewChip(
                                  label: 'Vue semaine',
                                  isSelected: provider.view == 'week',
                                  onTap: () {
                                    provider.setView('week');
                                    _loadSchedules();
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (provider.isLoading && provider.schedules.isEmpty)
                          const Expanded(
                            child: Center(
                              child: CircularProgressIndicator(),
                            ),
                          )
                        else
                          Expanded(
                            child: FamilyCalendarView(
                              schedules: provider.schedules,
                              familyMembers: widget.familyMembers,
                              selectedDate: provider.selectedDate,
                              currentUserId: context.read<AuthProvider>().user?.id,
                              calendarView: provider.view == 'calendar' 
                                  ? CalendarView.workWeek
                                  : CalendarView.week,
                              onAppointmentTap: (schedule) {
                                _showScheduleDetails(context, schedule, widget.familyMembers);
                              },
                              onAppointmentLongPress: widget.isParent
                                  ? (schedule) {
                                      _deleteSchedule(context, provider, schedule.id);
                                    }
                                  : null,
                              onViewChanged: (newDate) {
                                // Quand l'utilisateur change de plage dans le calendrier, mettre à jour la date sélectionnée et recharger
                                debugPrint('Calendar view changed to date: $newDate');
                                provider.setSelectedDate(newDate);
                                _loadSchedules();
                              },
                            ),
                          ),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (provider.error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        border: Border.all(color: Colors.red.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        provider.error!,
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    ),

                  // Filtres de vue (pour les parents)
                  if (widget.isParent) ...[
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _ViewChip(
                            label: 'Mon agenda',
                            isSelected: provider.view == 'personal',
                            onTap: () {
                              provider.setView('personal');
                              _loadSchedules();
                            },
                          ),
                          const SizedBox(width: 8),
                          _ViewChip(
                            label: 'Familles',
                            isSelected: provider.view == 'family',
                            onTap: () {
                              provider.setView('family');
                              _loadSchedules();
                            },
                          ),
                          const SizedBox(width: 8),
                          _ViewChip(
                            label: 'Calendrier',
                            isSelected: provider.view == 'calendar',
                            onTap: () {
                              provider.setView('calendar');
                              _loadSchedules();
                            },
                          ),
                          const SizedBox(width: 8),
                          _ViewChip(
                            label: 'Vue semaine',
                            isSelected: provider.view == 'week',
                            onTap: () {
                              provider.setView('week');
                              _loadSchedules();
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Sélecteur de date (pour les vues calendrier et semaine)
                  if (provider.view == 'calendar' || provider.view == 'week') ...[
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            provider.view == 'week' ? 'Semaine à visualiser' : 'Date à visualiser',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: provider.selectedDate,
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2030),
                                locale: const Locale('fr', 'FR'),
                              );
                              if (picked != null) {
                                provider.setSelectedDate(picked);
                                _loadSchedules();
                              }
                            },
                            icon: const Icon(Icons.calendar_today),
                            label: Text(
                              provider.view == 'week'
                                  ? _formatWeekRange(provider.selectedDate)
                                  : DateFormat('dd/MM/yyyy').format(provider.selectedDate),
                            ),
                          ),
                        ),
                        if (provider.view == 'week') ...[
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.chevron_left),
                            onPressed: () {
                              final newDate = provider.selectedDate.subtract(const Duration(days: 7));
                              provider.setSelectedDate(newDate);
                              _loadSchedules();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.chevron_right),
                            onPressed: () {
                              final newDate = provider.selectedDate.add(const Duration(days: 7));
                              provider.setSelectedDate(newDate);
                              _loadSchedules();
                            },
                          ),
                        ] else ...[
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.chevron_left),
                            onPressed: () {
                              final newDate = provider.selectedDate.subtract(const Duration(days: 1));
                              provider.setSelectedDate(newDate);
                              _loadSchedules();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.today),
                            onPressed: () {
                              provider.setSelectedDate(DateTime.now());
                              _loadSchedules();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.chevron_right),
                            onPressed: () {
                              final newDate = provider.selectedDate.add(const Duration(days: 1));
                              provider.setSelectedDate(newDate);
                              _loadSchedules();
                            },
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],


                  // Contenu selon la vue (pour les vues personal et family dans le SingleChildScrollView)
                  if (provider.isLoading && provider.schedules.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else
                    _PersonalView(
                      schedules: provider.schedules,
                      currentUserId: context.read<AuthProvider>().user?.id,
                      onDelete: (id) => _deleteSchedule(context, provider, id),
                      onEdit: (schedule) => _showScheduleModal(context, schedule: schedule),
                      provider: provider,
                      showMemberName: provider.view == 'family',
                      familyMembers: widget.familyMembers,
                      onLocationTap: (address) => _showLocationViewer(context, address),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatWeekRange(DateTime date) {
    final monday = date.subtract(Duration(days: date.weekday - 1));
    final sunday = monday.add(const Duration(days: 6));
    return '${DateFormat('dd/MM').format(monday)} - ${DateFormat('dd/MM/yyyy').format(sunday)}';
  }

  Future<void> _deleteSchedule(BuildContext context, ScheduleProvider provider, String scheduleId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer l\'horaire'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cet horaire ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await provider.deleteSchedule(scheduleId);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Horaire supprimé')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur: ${e.toString()}')),
          );
        }
      }
    }
  }

  void _showScheduleDetails(BuildContext context, Schedule schedule, List<FamilyMember> familyMembers) {
    final member = familyMembers.firstWhere(
      (m) => m.id == schedule.familyMemberId,
      orElse: () => familyMembers.first,
    );

    String memberName = 'Inconnu';
    if (member.name != null) {
      memberName = member.name!;
    } else if (member.email != null) {
      memberName = member.email!;
    }

    final canEdit = widget.isParent || schedule.familyMemberId == widget.familyMember.id;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(schedule.title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (schedule.description != null) ...[
              Text(schedule.description!),
              const SizedBox(height: 8),
            ],
            Text('Membre: $memberName'),
            const SizedBox(height: 4),
            Text('Date: ${DateFormat('dd/MM/yyyy').format(schedule.dateTime)}'),
            const SizedBox(height: 4),
            Text('Heure: ${schedule.startTime} - ${schedule.endTime}'),
            if (schedule.location != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16),
                  const SizedBox(width: 4),
                  Expanded(child: Text(schedule.location!)),
                ],
              ),
            ],
          ],
        ),
        actions: [
          if (canEdit)
            TextButton.icon(
              onPressed: () {
                Navigator.pop(context);
                _showScheduleModal(context, schedule: schedule);
              },
              icon: const Icon(Icons.edit),
              label: const Text('Modifier'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  void _showScheduleModal(BuildContext context, {Schedule? schedule}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => ChangeNotifierProvider.value(
        value: context.read<ScheduleProvider>(),
        child: Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalContext).viewInsets.bottom,
          ),
          child: _ScheduleModal(
            schedule: schedule,
            familyId: widget.familyId,
            familyMember: widget.familyMember,
            familyMembers: widget.familyMembers,
            isParent: widget.isParent,
            onSuccess: () {
              Navigator.pop(modalContext);
              _loadSchedules();
            },
          ),
        ),
      ),
    );
  }

  void _showLocationViewer(BuildContext context, String address) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => LocationViewer(
        address: address,
        onClose: () => Navigator.pop(modalContext),
      ),
    );
  }
}

class _ViewChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ViewChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onTap(),
      selectedColor: Theme.of(context).colorScheme.primaryContainer,
      checkmarkColor: Theme.of(context).colorScheme.onPrimaryContainer,
    );
  }
}

class _ScheduleModal extends StatefulWidget {
  final Schedule? schedule;
  final String familyId;
  final FamilyMember familyMember;
  final List<FamilyMember> familyMembers;
  final bool isParent;
  final VoidCallback onSuccess;

  const _ScheduleModal({
    this.schedule,
    required this.familyId,
    required this.familyMember,
    required this.familyMembers,
    required this.isParent,
    required this.onSuccess,
  });

  @override
  State<_ScheduleModal> createState() => _ScheduleModalState();
}

class _ScheduleModalState extends State<_ScheduleModal> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  String? _selectedMemberId;
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 10, minute: 0);
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.schedule != null) {
      // Mode édition
      _titleController.text = widget.schedule!.title;
      _descriptionController.text = widget.schedule!.description ?? '';
      _locationController.text = widget.schedule!.location ?? '';
      _selectedMemberId = widget.schedule!.familyMemberId;
      _selectedDate = widget.schedule!.dateTime;
      final startParts = widget.schedule!.startTime.split(':');
      _startTime = TimeOfDay(
        hour: int.parse(startParts[0]),
        minute: int.parse(startParts[1]),
      );
      final endParts = widget.schedule!.endTime.split(':');
      _endTime = TimeOfDay(
        hour: int.parse(endParts[0]),
        minute: int.parse(endParts[1]),
      );
    } else {
      // Mode création
      _selectedMemberId = widget.familyMember.id;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _saveSchedule() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<ScheduleProvider>();
      
      if (widget.schedule != null) {
        // Mode édition
        await provider.updateSchedule(
          scheduleId: widget.schedule!.id,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          date: _selectedDate.toIso8601String().split('T')[0],
          startTime: '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
          endTime: '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}',
          location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        );

        if (mounted) {
          widget.onSuccess();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Horaire modifié avec succès')),
          );
        }
      } else {
        // Mode création
        await provider.createSchedule(
          familyMemberId: _selectedMemberId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          date: _selectedDate.toIso8601String().split('T')[0],
          startTime: '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
          endTime: '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}',
          location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        );

        if (mounted) {
          widget.onSuccess();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Horaire créé avec succès')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      locale: const Locale('fr', 'FR'),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _selectEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  void _showLocationPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => LocationPicker(
        initialValue: _locationController.text,
        onLocationSelected: (address, lat, lng) {
          setState(() {
            _locationController.text = address;
          });
        },
        onClose: () => Navigator.pop(modalContext),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.schedule != null ? 'Modifier l\'horaire' : 'Nouvel horaire',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (widget.isParent)
                DropdownButtonFormField<String>(
                  value: _selectedMemberId,
                  decoration: const InputDecoration(
                    labelText: 'Membre',
                    border: OutlineInputBorder(),
                  ),
                  items: widget.familyMembers.map((member) {
                    final isCurrentUser = member.userId == authProvider.user?.id;
                    return DropdownMenuItem(
                      value: member.id,
                      child: Text(isCurrentUser
                          ? 'Vous'
                          : member.name ?? member.email ?? 'Membre ${member.id.substring(0, 8)}'),
                    );
                  }).toList(),
                  onChanged: (value) => setState(() => _selectedMemberId = value),
                ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Titre *',
                  border: OutlineInputBorder(),
                  hintText: 'École, Sport, etc.',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Veuillez entrer un titre';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optionnel)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _locationController,
                      decoration: const InputDecoration(
                        labelText: 'Localisation (optionnel)',
                        border: OutlineInputBorder(),
                        hintText: 'Adresse, lieu, etc.',
                      ),
                      readOnly: true,
                      onTap: () => _showLocationPicker(context),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.map),
                    onPressed: () => _showLocationPicker(context),
                    tooltip: 'Sélectionner sur la carte',
                  ),
                  if (_locationController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _locationController.clear();
                        });
                      },
                      tooltip: 'Effacer',
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectDate,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(DateFormat('dd/MM/yyyy').format(_selectedDate)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectStartTime,
                      icon: const Icon(Icons.access_time),
                      label: Text(_startTime.format(context)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectEndTime,
                      icon: const Icon(Icons.access_time),
                      label: Text(_endTime.format(context)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveSchedule,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(widget.schedule != null ? 'Enregistrer' : 'Créer'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Annuler'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CreateScheduleForm extends StatefulWidget {
  final String familyId;
  final FamilyMember familyMember;
  final List<FamilyMember> familyMembers;
  final bool isParent;
  final VoidCallback onCancel;
  final VoidCallback onSuccess;

  const _CreateScheduleForm({
    required this.familyId,
    required this.familyMember,
    required this.familyMembers,
    required this.isParent,
    required this.onCancel,
    required this.onSuccess,
  });

  @override
  State<_CreateScheduleForm> createState() => _CreateScheduleFormState();
}

class _CreateScheduleFormState extends State<_CreateScheduleForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  String? _selectedMemberId;
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 10, minute: 0);
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedMemberId = widget.familyMember.id;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _createSchedule() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<ScheduleProvider>();
      
      await provider.createSchedule(
        familyMemberId: _selectedMemberId!,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        date: _selectedDate.toIso8601String().split('T')[0],
        startTime: '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
        endTime: '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}',
        location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
      );

      if (mounted) {
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Horaire créé avec succès')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      locale: const Locale('fr', 'FR'),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _selectEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  void _showLocationPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => LocationPicker(
        initialValue: _locationController.text,
        onLocationSelected: (address, lat, lng) {
          setState(() {
            _locationController.text = address;
          });
        },
        onClose: () => Navigator.pop(modalContext),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Nouvel horaire',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              if (widget.isParent)
                DropdownButtonFormField<String>(
                  initialValue: _selectedMemberId,
                  decoration: const InputDecoration(
                    labelText: 'Membre',
                    border: OutlineInputBorder(),
                  ),
                  items: widget.familyMembers.map((member) {
                    final isCurrentUser = member.userId == authProvider.user?.id;
                    return DropdownMenuItem(
                      value: member.id,
                      child: Text(isCurrentUser
                          ? 'Vous'
                          : member.name ?? member.email ?? 'Membre ${member.id.substring(0, 8)}'),
                    );
                  }).toList(),
                  onChanged: (value) => setState(() => _selectedMemberId = value),
                ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Titre *',
                  border: OutlineInputBorder(),
                  hintText: 'École, Sport, etc.',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Veuillez entrer un titre';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optionnel)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _locationController,
                      decoration: const InputDecoration(
                        labelText: 'Localisation (optionnel)',
                        border: OutlineInputBorder(),
                        hintText: 'Adresse, lieu, etc.',
                      ),
                      readOnly: true,
                      onTap: () => _showLocationPicker(context),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.map),
                    onPressed: () => _showLocationPicker(context),
                    tooltip: 'Sélectionner sur la carte',
                  ),
                  if (_locationController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _locationController.clear();
                        });
                      },
                      tooltip: 'Effacer',
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectDate,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(DateFormat('dd/MM/yyyy').format(_selectedDate)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectStartTime,
                      icon: const Icon(Icons.access_time),
                      label: Text(_startTime.format(context)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectEndTime,
                      icon: const Icon(Icons.access_time),
                      label: Text(_endTime.format(context)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _createSchedule,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Créer'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: widget.onCancel,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Annuler'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PersonalView extends StatelessWidget {
  final List<Schedule> schedules;
  final String? currentUserId;
  final Function(String) onDelete;
  final Function(Schedule) onEdit;
  final ScheduleProvider? provider;
  final bool showMemberName;
  final List<FamilyMember>? familyMembers;
  final Function(String)? onLocationTap;

  const _PersonalView({
    required this.schedules,
    required this.currentUserId,
    required this.onDelete,
    required this.onEdit,
    this.provider,
    this.showMemberName = false,
    this.familyMembers,
    this.onLocationTap,
  });

  @override
  Widget build(BuildContext context) {
    if (schedules.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(Icons.calendar_today, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                showMemberName 
                    ? 'Aucun horaire dans l\'agenda de la famille'
                    : 'Aucun horaire dans votre agenda',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    // Grouper par date et trier
    final grouped = <String, List<Schedule>>{};
    for (final schedule in schedules) {
      grouped.putIfAbsent(schedule.date, () => []).add(schedule);
    }

    // Trier les horaires dans chaque groupe par heure de début
    for (final entry in grouped.entries) {
      entry.value.sort((a, b) => a.startTime.compareTo(b.startTime));
    }

    // Trier les dates dans l'ordre chronologique
    final sortedEntries = grouped.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return Column(
      children: sortedEntries
          .map((entry) => _DayScheduleCard(
                date: entry.key,
                schedules: entry.value,
                onDelete: onDelete,
                onEdit: onEdit,
                provider: provider,
                showMemberName: showMemberName,
                familyMembers: familyMembers,
                onLocationTap: onLocationTap,
              ))
          .toList(),
    );
  }
}

class _DayScheduleCard extends StatelessWidget {
  final String date;
  final List<Schedule> schedules;
  final Function(String) onDelete;
  final Function(Schedule) onEdit;
  final ScheduleProvider? provider;
  final bool showMemberName;
  final List<FamilyMember>? familyMembers;
  final Function(String)? onLocationTap;

  const _DayScheduleCard({
    required this.date,
    required this.schedules,
    required this.onDelete,
    required this.onEdit,
    this.provider,
    this.showMemberName = false,
    this.familyMembers,
    this.onLocationTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateTime = DateTime.parse(date);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              DateFormat('EEEE d MMMM yyyy', 'fr').format(dateTime),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ...schedules.map((schedule) {
              // Pour détecter les conflits et transports, on ne compare que les horaires du même membre
              final sameMemberSchedules = schedules.where((s) => s.familyMemberId == schedule.familyMemberId).toList();
              final overlappingIds = provider != null
                  ? provider!.getOverlappingScheduleIds(schedule, sameMemberSchedules)
                  : <String>[];
              final hasOverlap = overlappingIds.isNotEmpty;
              final backToBackIds = provider != null
                  ? provider!.getBackToBackScheduleIds(schedule, sameMemberSchedules)
                  : <String>[];
              final hasBackToBack = backToBackIds.isNotEmpty && !hasOverlap;

              String? memberName;
              if (showMemberName && familyMembers != null && familyMembers!.isNotEmpty) {
                final member = familyMembers!.firstWhere(
                  (m) => m.id == schedule.familyMemberId,
                  orElse: () => familyMembers!.first,
                );
                if (member.name != null) {
                  memberName = member.name!;
                } else if (member.email != null) {
                  memberName = member.email!;
                } else {
                  memberName = 'Membre ${member.id.substring(0, 8)}';
                }
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _ScheduleCard(
                  schedule: schedule,
                  memberName: memberName,
                  canDelete: true,
                  onDelete: () => onDelete(schedule.id),
                  onEdit: () => onEdit(schedule),
                  hasOverlap: hasOverlap,
                  hasBackToBack: hasBackToBack,
                  onLocationTap: onLocationTap,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  final Schedule schedule;
  final String? memberName;
  final bool canDelete;
  final VoidCallback onDelete;
  final VoidCallback? onEdit;
  final bool hasOverlap;
  final bool hasBackToBack;
  final Function(String)? onLocationTap;

  const _ScheduleCard({
    required this.schedule,
    this.memberName,
    required this.canDelete,
    required this.onDelete,
    this.onEdit,
    this.hasOverlap = false,
    this.hasBackToBack = false,
    this.onLocationTap,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = hasOverlap
        ? Colors.red
        : hasBackToBack
            ? Colors.orange
            : Theme.of(context).colorScheme.primary;
    final backgroundColor = hasOverlap
        ? Colors.red.shade50
        : hasBackToBack
            ? Colors.orange.shade50
            : Colors.grey.shade50;

    return Container(
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: borderColor, width: 4),
        ),
        color: backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  schedule.title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (hasOverlap || hasBackToBack) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (hasOverlap)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red.shade200,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '⚠️ Conflit',
                            style: TextStyle(fontSize: 10, color: Colors.red),
                          ),
                        )
                      else if (hasBackToBack)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade200,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '🚗 Transport',
                            style: TextStyle(fontSize: 10, color: Colors.orange),
                          ),
                        ),
                    ],
                  ),
                ],
                if (memberName != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    memberName!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                  ),
                ],
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        '${schedule.startTime} - ${schedule.endTime}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                if (schedule.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    schedule.description!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                ],
                if (schedule.location != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Expanded(
                        child: InkWell(
                          onTap: onLocationTap != null
                              ? () => onLocationTap!(schedule.location!)
                              : null,
                          child: Text(
                            schedule.location!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.blue[700],
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (onEdit != null)
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: onEdit,
                        tooltip: 'Modifier',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 32,
                          minHeight: 32,
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                    if (canDelete)
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: onDelete,
                        tooltip: 'Supprimer',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 32,
                          minHeight: 32,
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

