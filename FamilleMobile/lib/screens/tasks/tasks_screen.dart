import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/tasks_provider.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/task.dart';
import '../../models/family.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<FamilyProvider>(
      builder: (context, familyProvider, _) {
        if (!familyProvider.hasFamily) {
          return Scaffold(
            appBar: AppBar(title: const Text('Tâches')),
            body: const Center(
              child: Text('Vous devez d\'abord créer une famille'),
            ),
          );
        }

        return ChangeNotifierProvider(
          create: (_) => TasksProvider()
            ..loadTasks(familyProvider.family!.id),
          child: _TasksScreenContent(
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

class _TasksScreenContent extends StatefulWidget {
  final String familyId;
  final FamilyMember familyMember;
  final List<FamilyMember> familyMembers;
  final bool isParent;

  const _TasksScreenContent({
    required this.familyId,
    required this.familyMember,
    required this.familyMembers,
    required this.isParent,
  });

  @override
  State<_TasksScreenContent> createState() => _TasksScreenContentState();
}

class _TasksScreenContentState extends State<_TasksScreenContent> {
  bool _showForm = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tâches'),
        actions: [
          IconButton(
            icon: Icon(_showForm ? Icons.close : Icons.add),
            onPressed: () => setState(() => _showForm = !_showForm),
          ),
        ],
      ),
      body: Consumer<TasksProvider>(
        builder: (context, provider, _) {
          return RefreshIndicator(
            onRefresh: () => provider.loadTasks(widget.familyId, status: provider.statusFilter == 'all' ? null : provider.statusFilter),
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

                  // Filtres de statut
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'Toutes',
                          isSelected: provider.statusFilter == 'all',
                          onTap: () {
                            provider.setStatusFilter('all');
                            provider.loadTasks(widget.familyId);
                          },
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'En attente',
                          isSelected: provider.statusFilter == 'pending',
                          onTap: () {
                            provider.setStatusFilter('pending');
                            provider.loadTasks(widget.familyId, status: 'pending');
                          },
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'En cours',
                          isSelected: provider.statusFilter == 'in_progress',
                          onTap: () {
                            provider.setStatusFilter('in_progress');
                            provider.loadTasks(widget.familyId, status: 'in_progress');
                          },
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Terminées',
                          isSelected: provider.statusFilter == 'completed',
                          onTap: () {
                            provider.setStatusFilter('completed');
                            provider.loadTasks(widget.familyId, status: 'completed');
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Formulaire de création
                  if (_showForm) ...[
                    _CreateTaskForm(
                      familyId: widget.familyId,
                      familyMembers: widget.familyMembers,
                      onCancel: () => setState(() => _showForm = false),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Liste des tâches
                  if (provider.isLoading && provider.tasks.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (provider.filteredTasks.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              provider.statusFilter == 'all'
                                  ? 'Aucune tâche pour le moment'
                                  : 'Aucune tâche ${_getStatusLabel(provider.statusFilter)}',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...provider.filteredTasks.map((task) => _TaskCard(
                          task: task,
                          familyMembers: widget.familyMembers,
                          isParent: widget.isParent,
                          onStatusUpdate: (status) => provider.updateTaskStatus(task.id, status),
                          onDelete: () => _deleteTask(context, provider, task.id),
                        )),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'en attente';
      case 'in_progress':
        return 'en cours';
      case 'completed':
        return 'terminée';
      default:
        return '';
    }
  }

  Future<void> _deleteTask(BuildContext context, TasksProvider provider, String taskId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la tâche'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cette tâche ?'),
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
        await provider.deleteTask(taskId);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tâche supprimée')),
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
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

class _CreateTaskForm extends StatefulWidget {
  final String familyId;
  final List<FamilyMember> familyMembers;
  final VoidCallback onCancel;

  const _CreateTaskForm({
    required this.familyId,
    required this.familyMembers,
    required this.onCancel,
  });

  @override
  State<_CreateTaskForm> createState() => _CreateTaskFormState();
}

class _CreateTaskFormState extends State<_CreateTaskForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _assignedTo;
  DateTime? _dueDate;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _createTask() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<TasksProvider>();
      final authProvider = context.read<AuthProvider>();

      await provider.createTask(
        familyId: widget.familyId,
        assignedTo: _assignedTo?.isEmpty == true ? null : _assignedTo,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        dueDate: _dueDate,
        createdBy: authProvider.user!.id,
      );

      if (mounted) {
        setState(() {
          _titleController.clear();
          _descriptionController.clear();
          _assignedTo = null;
          _dueDate = null;
        });
        widget.onCancel();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tâche créée avec succès')),
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

  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('fr', 'FR'),
    );

    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Nouvelle tâche',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Titre *',
                  border: OutlineInputBorder(),
                  hintText: 'Faire les courses, Rendre devoir, etc.',
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
                    child: DropdownButtonFormField<String>(
                      value: _assignedTo,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Assigner à',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: null,
                          child: Text('Non assigné'),
                        ),
                        ...widget.familyMembers.map((member) {
                          final authProvider = context.read<AuthProvider>();
                          final isCurrentUser = member.userId == authProvider.user?.id;
                          return DropdownMenuItem(
                            value: member.id,
                            child: Text(
                              isCurrentUser
                                  ? 'Vous'
                                  : member.name ?? member.email ?? 'Membre ${member.id.substring(0, 8)}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }),
                      ],
                      onChanged: (value) => setState(() => _assignedTo = value),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectDueDate,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(
                        _dueDate == null
                            ? 'Date d\'échéance'
                            : '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}',
                      ),
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
                      onPressed: _isLoading ? null : _createTask,
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

class _TaskCard extends StatelessWidget {
  final Task task;
  final List<FamilyMember> familyMembers;
  final bool isParent;
  final Function(TaskStatus) onStatusUpdate;
  final VoidCallback onDelete;

  const _TaskCard({
    required this.task,
    required this.familyMembers,
    required this.isParent,
    required this.onStatusUpdate,
    required this.onDelete,
  });

  String _getMemberName(String? memberId, String? currentUserId) {
    if (memberId == null) return 'Non assigné';
    final member = familyMembers.where((m) => m.id == memberId).isNotEmpty
        ? familyMembers.firstWhere((m) => m.id == memberId)
        : null;
    if (member == null) return 'Membre inconnu';
    
    if (currentUserId != null && member.userId == currentUserId) {
      return 'Vous';
    }
    
    if (member.name != null) return member.name!;
    if (member.email != null) return member.email!;
    return 'Membre ${member.id.substring(0, 8)}';
  }

  Color _getStatusColor() {
    switch (task.status) {
      case TaskStatus.completed:
        return Colors.green;
      case TaskStatus.inProgress:
        return Colors.blue;
      case TaskStatus.pending:
        return Colors.orange;
    }
  }

  IconData _getStatusIcon() {
    switch (task.status) {
      case TaskStatus.completed:
        return Icons.check_circle;
      case TaskStatus.inProgress:
        return Icons.access_time;
      case TaskStatus.pending:
        return Icons.radio_button_unchecked;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final canDelete = isParent || task.createdBy == authProvider.user?.id;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: _getStatusColor(), width: 4),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    _getStatusIcon(),
                    color: _getStatusColor(),
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                task.title,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Chip(
                              label: Text(task.status.displayName),
                              backgroundColor: _getStatusColor().withOpacity(0.2),
                              labelStyle: TextStyle(
                                color: _getStatusColor(),
                                fontSize: 12,
                              ),
                              padding: EdgeInsets.zero,
                            ),
                          ],
                        ),
                        if (task.description != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            task.description!,
                            style: TextStyle(color: Colors.grey[700]),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.person, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Consumer<AuthProvider>(
                        builder: (context, authProvider, _) => Text(
                          _getMemberName(task.assignedTo, authProvider.user?.id),
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (task.dueDate != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          '${task.dueDate!.day}/${task.dueDate!.month}/${task.dueDate!.year}',
                          style: TextStyle(
                            fontSize: 14,
                            color: task.dueDate!.isBefore(DateTime.now()) && task.status != TaskStatus.completed
                                ? Colors.red
                                : Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (task.status != TaskStatus.completed) ...[
                    if (task.status == TaskStatus.pending)
                      TextButton.icon(
                        onPressed: () => onStatusUpdate(TaskStatus.inProgress),
                        icon: const Icon(Icons.play_arrow, size: 18),
                        label: const Text('Démarrer'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.blue,
                        ),
                      ),
                    if (task.status == TaskStatus.inProgress)
                      TextButton.icon(
                        onPressed: () => onStatusUpdate(TaskStatus.completed),
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('Terminer'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.green,
                        ),
                      ),
                  ] else
                    TextButton.icon(
                      onPressed: () => onStatusUpdate(TaskStatus.pending),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Rouvrir'),
                    ),
                  if (canDelete) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: onDelete,
                      tooltip: 'Supprimer',
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
