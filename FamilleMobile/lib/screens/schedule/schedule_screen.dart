import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/schedule_provider.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/schedule.dart';
import '../../models/family.dart';

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
  bool _showForm = false;

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

    if (view == 'week') {
      // Calculer le lundi de la semaine
      final monday = selectedDate.subtract(Duration(days: selectedDate.weekday - 1));
      weekStart = DateTime(monday.year, monday.month, monday.day);
    } else if (view == 'family') {
      date = selectedDate;
    }

    provider.loadSchedules(
      familyId: widget.familyId,
      familyMemberId: view == 'personal' ? widget.familyMember.id : null,
      date: date,
      weekStart: weekStart,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Horaires'),
        actions: [
          IconButton(
            icon: Icon(_showForm ? Icons.close : Icons.add),
            onPressed: () => setState(() => _showForm = !_showForm),
          ),
        ],
      ),
      body: Consumer<ScheduleProvider>(
        builder: (context, provider, _) {
          return RefreshIndicator(
            onRefresh: () async => _loadSchedules(),
            child: SingleChildScrollView(
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
                            label: 'Vue famille',
                            isSelected: provider.view == 'family',
                            onTap: () {
                              provider.setView('family');
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

                  // Sélecteur de date (pour les vues famille et semaine)
                  if (provider.view == 'family' || provider.view == 'week') ...[
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

                  // Formulaire de création
                  if (_showForm) ...[
                    _CreateScheduleForm(
                      familyId: widget.familyId,
                      familyMember: widget.familyMember,
                      familyMembers: widget.familyMembers,
                      isParent: widget.isParent,
                      onCancel: () => setState(() => _showForm = false),
                      onSuccess: () {
                        setState(() => _showForm = false);
                        _loadSchedules();
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Contenu selon la vue
                  if (provider.isLoading && provider.schedules.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (provider.view == 'personal')
                    _PersonalView(
                      schedules: provider.schedules,
                      currentUserId: context.read<AuthProvider>().user?.id,
                      onDelete: (id) => _deleteSchedule(context, provider, id),
                    )
                  else if (provider.view == 'family')
                    _FamilyView(
                      schedules: provider.schedules,
                      selectedDate: provider.selectedDate,
                      familyMembers: widget.familyMembers,
                      currentUserId: context.read<AuthProvider>().user?.id,
                      isParent: widget.isParent,
                      onDelete: (id) => _deleteSchedule(context, provider, id),
                    )
                  else if (provider.view == 'week')
                    _WeekView(
                      schedules: provider.schedules,
                      selectedDate: provider.selectedDate,
                      familyMembers: widget.familyMembers,
                      currentUserId: context.read<AuthProvider>().user?.id,
                      isParent: widget.isParent,
                      onDelete: (id) => _deleteSchedule(context, provider, id),
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

  const _PersonalView({
    required this.schedules,
    required this.currentUserId,
    required this.onDelete,
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
                'Aucun horaire dans votre agenda',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    // Grouper par date
    final grouped = <String, List<Schedule>>{};
    for (final schedule in schedules) {
      grouped.putIfAbsent(schedule.date, () => []).add(schedule);
    }

    return Column(
      children: grouped.entries
          .map((entry) => _DayScheduleCard(
                date: entry.key,
                schedules: entry.value,
                onDelete: onDelete,
              ))
          .toList(),
    );
  }
}

class _FamilyView extends StatelessWidget {
  final List<Schedule> schedules;
  final DateTime selectedDate;
  final List<FamilyMember> familyMembers;
  final String? currentUserId;
  final bool isParent;
  final Function(String) onDelete;

  const _FamilyView({
    required this.schedules,
    required this.selectedDate,
    required this.familyMembers,
    required this.currentUserId,
    required this.isParent,
    required this.onDelete,
  });

  String _getMemberName(String memberId) {
    final memberList = familyMembers.where((m) => m.id == memberId).toList();
    final member = memberList.isNotEmpty ? memberList.first : null;
    if (member == null) return 'Membre inconnu';
    if (member.userId == currentUserId) return 'Vous';
    if (member.name != null) return member.name!;
    if (member.email != null) return member.email!;
    return 'Membre ${member.id.substring(0, 8)}';
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = selectedDate.toIso8601String().split('T')[0];
    final daySchedules = schedules.where((s) => s.date == dateStr).toList();

    if (daySchedules.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                'Aucun horaire pour cette date',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: daySchedules.map((schedule) => _ScheduleCard(
            schedule: schedule,
            memberName: _getMemberName(schedule.familyMemberId),
            canDelete: isParent || schedule.familyMemberId == currentUserId,
            onDelete: () => onDelete(schedule.id),
          )).toList(),
    );
  }
}

class _WeekView extends StatelessWidget {
  final List<Schedule> schedules;
  final DateTime selectedDate;
  final List<FamilyMember> familyMembers;
  final String? currentUserId;
  final bool isParent;
  final Function(String) onDelete;

  const _WeekView({
    required this.schedules,
    required this.selectedDate,
    required this.familyMembers,
    required this.currentUserId,
    required this.isParent,
    required this.onDelete,
  });

  List<String> _getWeekDays() {
    final monday = selectedDate.subtract(Duration(days: selectedDate.weekday - 1));
    return List.generate(7, (i) {
      final day = monday.add(Duration(days: i));
      return day.toIso8601String().split('T')[0];
    });
  }

  String _getMemberName(String memberId) {
    final memberList = familyMembers.where((m) => m.id == memberId).toList();
    final member = memberList.isNotEmpty ? memberList.first : null;
    if (member == null) return 'Inconnu';
    if (member.userId == currentUserId) return 'Vous';
    if (member.name != null) return member.name!;
    if (member.email != null) return member.email!;
    return 'Membre ${member.id.substring(0, 4)}';
  }

  @override
  Widget build(BuildContext context) {
    final weekDays = _getWeekDays();
    
    // Organiser les horaires par membre et par jour
    final schedulesByMemberAndDay = <String, Map<String, List<Schedule>>>{};
    for (final member in familyMembers) {
      schedulesByMemberAndDay[member.id] = {};
      for (final day in weekDays) {
        schedulesByMemberAndDay[member.id]![day] = [];
      }
    }

    for (final schedule in schedules) {
      if (schedulesByMemberAndDay.containsKey(schedule.familyMemberId)) {
        schedulesByMemberAndDay[schedule.familyMemberId]!
            .putIfAbsent(schedule.date, () => [])
            .add(schedule);
      }
    }

    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: Table(
            border: TableBorder.all(color: Colors.grey.shade300),
            columnWidths: const {
              0: FixedColumnWidth(120),
              1: FixedColumnWidth(150),
              2: FixedColumnWidth(150),
              3: FixedColumnWidth(150),
              4: FixedColumnWidth(150),
              5: FixedColumnWidth(150),
              6: FixedColumnWidth(150),
              7: FixedColumnWidth(150),
            },
            children: [
              // En-tête
              TableRow(
                children: [
                  const TableCell(child: SizedBox.shrink()),
                  ...weekDays.map((day) {
                    final date = DateTime.parse(day);
                    return TableCell(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        color: Colors.grey.shade100,
                        child: Column(
                          children: [
                            Text(
                              DateFormat('EEE', 'fr').format(date),
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              DateFormat('dd/MM').format(date),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
              // Lignes pour chaque membre
              ...familyMembers.map((member) {
                return TableRow(
                  children: [
                    TableCell(
                      verticalAlignment: TableCellVerticalAlignment.top,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        color: Colors.grey.shade50,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getMemberName(member.id),
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            if (member.role == 'parent')
                              Text(
                                '(Parent)',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[600],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    ...weekDays.map((day) {
                      final daySchedules =
                          schedulesByMemberAndDay[member.id]?[day] ?? [];
                      return TableCell(
                        verticalAlignment: TableCellVerticalAlignment.top,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          constraints: const BoxConstraints(minHeight: 100),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: daySchedules.map((schedule) {
                              final canDelete = isParent ||
                                  schedule.familyMemberId == currentUserId;
                              return _ScheduleChip(
                                schedule: schedule,
                                canDelete: canDelete,
                                onDelete: () => onDelete(schedule.id),
                              );
                            }).toList(),
                          ),
                        ),
                      );
                    }),
                  ],
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _DayScheduleCard extends StatelessWidget {
  final String date;
  final List<Schedule> schedules;
  final Function(String) onDelete;

  const _DayScheduleCard({
    required this.date,
    required this.schedules,
    required this.onDelete,
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
            ...schedules.map((schedule) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _ScheduleCard(
                    schedule: schedule,
                    memberName: null,
                    canDelete: true,
                    onDelete: () => onDelete(schedule.id),
                  ),
                )),
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

  const _ScheduleCard({
    required this.schedule,
    this.memberName,
    required this.canDelete,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: Theme.of(context).colorScheme.primary, width: 4),
        ),
        color: Colors.grey.shade50,
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
                    Text(
                      '${schedule.startTime} - ${schedule.endTime}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                    ),
                  ],
                ),
                if (schedule.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    schedule.description!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ],
            ),
          ),
          if (canDelete)
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: onDelete,
              tooltip: 'Supprimer',
            ),
        ],
      ),
    );
  }
}

class _ScheduleChip extends StatelessWidget {
  final Schedule schedule;
  final bool canDelete;
  final VoidCallback onDelete;

  const _ScheduleChip({
    required this.schedule,
    required this.canDelete,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: canDelete ? onDelete : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              schedule.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '${schedule.startTime} - ${schedule.endTime}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.9),
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
