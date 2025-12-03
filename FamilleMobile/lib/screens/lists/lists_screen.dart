import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/lists_provider.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/shared_list.dart';

class ListsScreen extends StatelessWidget {
  const ListsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<FamilyProvider>(
      builder: (context, familyProvider, _) {
        if (!familyProvider.hasFamily) {
          return Scaffold(
            appBar: AppBar(title: const Text('Listes partagées')),
            body: const Center(
              child: Text('Vous devez d\'abord créer une famille'),
            ),
          );
        }

        return ChangeNotifierProvider(
          create: (_) => ListsProvider()..loadLists(familyProvider.family!.id),
          child: const _ListsScreenContent(),
        );
      },
    );
  }
}

class _ListsScreenContent extends StatelessWidget {
  const _ListsScreenContent();

  @override
  Widget build(BuildContext context) {
    final familyProvider = context.watch<FamilyProvider>();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Listes partagées'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateListDialog(context, familyProvider.family!.id),
          ),
        ],
      ),
      body: Consumer<ListsProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.lists.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.lists.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.list, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Aucune liste pour le moment',
                    style: TextStyle(color: Colors.grey[600], fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Créez votre première liste',
                    style: TextStyle(color: Colors.grey[500], fontSize: 14),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadLists(familyProvider.family!.id),
            child: ListView.builder(
              itemCount: provider.lists.length,
              itemBuilder: (context, index) {
                final list = provider.lists[index];
                
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _parseColor(list.color),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          list.name[0].toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    title: Text(
                      list.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: list.description != null
                        ? Text(
                            list.description!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showEditListDialog(context, list, provider),
                        ),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                    onTap: () {
                      // Naviguer vers la page de détail de la liste
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChangeNotifierProvider.value(
                            value: provider,
                            child: _ListDetailScreen(list: list),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Color _parseColor(String colorString) {
    try {
      return Color(int.parse(colorString.replaceFirst('#', '0xFF')));
    } catch (e) {
      return const Color(0xFF3b82f6);
    }
  }

  Future<void> _showCreateListDialog(BuildContext context, String familyId) async {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    String selectedColor = '#3b82f6';
    final colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    ];

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Créer une liste'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nom de la liste',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optionnel)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              const Text('Couleur:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: colors.map((color) {
                  final isSelected = selectedColor == color;
                  return GestureDetector(
                    onTap: () {
                      selectedColor = color;
                      Navigator.pop(context);
                      _showCreateListDialog(context, familyId);
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _parseColor(color),
                        shape: BoxShape.circle,
                        border: isSelected
                            ? Border.all(color: Colors.black, width: 3)
                            : null,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isNotEmpty) {
                Navigator.pop(context, true);
              }
            },
            child: const Text('Créer'),
          ),
        ],
      ),
    );

    if (result == true && nameController.text.trim().isNotEmpty) {
      final provider = context.read<ListsProvider>();
      final authProvider = context.read<AuthProvider>();
      
      try {
        await provider.createList(
          familyId: familyId,
          name: nameController.text.trim(),
          description: descriptionController.text.trim().isEmpty
              ? null
              : descriptionController.text.trim(),
          color: selectedColor,
          createdBy: authProvider.user!.id,
        );
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Liste créée avec succès')),
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

  Future<void> _showEditListDialog(
    BuildContext context,
    SharedList list,
    ListsProvider provider,
  ) async {
    final nameController = TextEditingController(text: list.name);
    final descriptionController = TextEditingController(text: list.description ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Modifier la liste'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nom de la liste',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () async {
              await provider.deleteList(list.id);
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Liste supprimée')),
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isNotEmpty) {
                Navigator.pop(context, true);
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );

    if (result == true) {
      try {
        await provider.updateList(
          listId: list.id,
          name: nameController.text.trim(),
          description: descriptionController.text.trim().isEmpty
              ? null
              : descriptionController.text.trim(),
        );
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Liste mise à jour')),
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

class _ListDetailScreen extends StatefulWidget {
  final SharedList list;

  const _ListDetailScreen({required this.list});

  @override
  State<_ListDetailScreen> createState() => _ListDetailScreenState();
}

class _ListDetailScreenState extends State<_ListDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Charger les éléments de la liste au démarrage
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ListsProvider>().selectList(widget.list);
    });
  }

  @override
  Widget build(BuildContext context) {
    return _ListItemsView(list: widget.list);
  }
}

class _ListItemsView extends StatefulWidget {
  final SharedList list;

  const _ListItemsView({required this.list});

  @override
  State<_ListItemsView> createState() => _ListItemsViewState();
}

class _ListItemsViewState extends State<_ListItemsView> {
  bool _showAddForm = false;
  final _textController = TextEditingController();
  String? _editingItemId;
  final _editingController = TextEditingController();

  @override
  void dispose() {
    _textController.dispose();
    _editingController.dispose();
    super.dispose();
  }

  Color _parseColor(String colorString) {
    try {
      return Color(int.parse(colorString.replaceFirst('#', '0xFF')));
    } catch (e) {
      return const Color(0xFF3b82f6);
    }
  }

  Future<void> _addItems() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    final lines = text.split('\n').where((line) => line.trim().isNotEmpty).toList();
    if (lines.isEmpty) return;

    final provider = context.read<ListsProvider>();
    
    try {
      await provider.addItems(lines);
      setState(() {
        _textController.clear();
        _showAddForm = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _startEdit(SharedListItem item) async {
    if (item.checked) return;
    
    setState(() {
      _editingItemId = item.id;
      _editingController.text = item.text;
    });
  }

  Future<void> _saveEdit(String itemId) async {
    final text = _editingController.text.trim();
    final provider = context.read<ListsProvider>();

    try {
      if (text.isEmpty) {
        // Supprimer l'élément si vide
        await provider.deleteItem(itemId);
      } else {
        await provider.updateItem(itemId: itemId, text: text);
      }
      
      setState(() {
        _editingItemId = null;
        _editingController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    }
  }

  void _cancelEdit() {
    setState(() {
      _editingItemId = null;
      _editingController.clear();
    });
  }

  Future<void> _toggleItem(SharedListItem item) async {
    final provider = context.read<ListsProvider>();
    try {
      await provider.updateItem(itemId: item.id, checked: !item.checked);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _deleteItem(String itemId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cet élément ?'),
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
      final provider = context.read<ListsProvider>();
      try {
        await provider.deleteItem(itemId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur: ${e.toString()}')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ListsProvider>(
      builder: (context, provider, _) {
        // Filtrer les éléments pour cette liste uniquement
        final items = provider.items.where((item) => item.listId == widget.list.id).toList();
        final checkedCount = items.where((item) => item.checked).length;
        final totalCount = items.length;

        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: _parseColor(widget.list.color),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.list.name,
                        style: const TextStyle(fontSize: 16),
                      ),
                      if (totalCount > 0)
                        Text(
                          '$checkedCount / $totalCount',
                          style: const TextStyle(fontSize: 12),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: Icon(_showAddForm ? Icons.close : Icons.add),
                onPressed: () {
                  setState(() {
                    _showAddForm = !_showAddForm;
                    if (_showAddForm) {
                      Future.delayed(
                        const Duration(milliseconds: 100),
                        () => FocusScope.of(context).requestFocus(FocusNode()),
                      );
                    }
                  });
                },
              ),
            ],
          ),
          body: Column(
            children: [
              if (widget.list.description != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: _parseColor(widget.list.color).withOpacity(0.1),
                  child: Text(
                    widget.list.description!,
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                ),
              
              // Formulaire d'ajout
            if (_showAddForm)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ajouter des éléments (une ligne = un élément)',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _textController,
                      decoration: const InputDecoration(
                        hintText: 'Lait\nPain\nOeufs',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 6,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 14),
                      autofocus: true,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: provider.isLoading ? null : _addItems,
                            child: provider.isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Ajouter'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _textController.clear();
                              _showAddForm = false;
                            });
                          },
                          child: const Text('Annuler'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Liste des éléments
              Expanded(
              child: provider.isLoading && items.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : items.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.list, size: 64, color: Colors.grey[400]),
                              const SizedBox(height: 16),
                              Text(
                                'Cette liste est vide',
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                              if (!_showAddForm)
                                Text(
                                  'Cliquez sur + pour ajouter des éléments',
                                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                                ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(8),
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final item = items[index];
                            final isEditing = _editingItemId == item.id;

                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              color: item.checked ? Colors.grey[100] : null,
                              child: ListTile(
                                leading: IconButton(
                                  icon: Icon(
                                    item.checked
                                        ? Icons.check_circle
                                        : Icons.radio_button_unchecked,
                                    color: item.checked ? Colors.green : Colors.grey,
                                  ),
                                  onPressed: () => _toggleItem(item),
                                ),
                                title: isEditing
                                    ? TextField(
                                        controller: _editingController,
                                        autofocus: true,
                                        decoration: const InputDecoration(
                                          border: OutlineInputBorder(),
                                          isDense: true,
                                        ),
                                        onSubmitted: (_) => _saveEdit(item.id),
                                      )
                                    : GestureDetector(
                                        onDoubleTap: () => _startEdit(item),
                                        child: Text(
                                          item.text,
                                          style: TextStyle(
                                            decoration: item.checked
                                                ? TextDecoration.lineThrough
                                                : null,
                                            color: item.checked
                                                ? Colors.grey
                                                : null,
                                          ),
                                        ),
                                      ),
                                trailing: isEditing
                                    ? Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.check, color: Colors.green),
                                            onPressed: () => _saveEdit(item.id),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.close, color: Colors.red),
                                            onPressed: _cancelEdit,
                                          ),
                                        ],
                                      )
                                    : IconButton(
                                        icon: const Icon(Icons.delete, color: Colors.red),
                                        onPressed: () => _deleteItem(item.id),
                                      ),
                              ),
                            );
                          },
                        ),
              ),
            ],
          ),
        );
      },
    );
  }
}
