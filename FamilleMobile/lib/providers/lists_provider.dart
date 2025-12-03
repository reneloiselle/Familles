import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/shared_list.dart';
import '../services/supabase_service.dart';

/// Provider pour la gestion des listes partagées
class ListsProvider with ChangeNotifier {
  List<SharedList> _lists = [];
  SharedList? _selectedList;
  List<SharedListItem> _items = [];
  bool _isLoading = false;
  String? _error;

  // Realtime subscriptions
  RealtimeChannel? _listsChannel;
  RealtimeChannel? _itemsChannel;
  String? _currentFamilyId;

  List<SharedList> get lists => _lists;
  SharedList? get selectedList => _selectedList;
  List<SharedListItem> get items => _items;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final _service = SupabaseService();

  Future<void> loadLists(String familyId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _lists = await _service.getSharedLists(familyId);
      
      // Initialiser les subscriptions Realtime si nécessaire
      if (_currentFamilyId != familyId) {
        _setupRealtimeSubscriptions(familyId);
        _currentFamilyId = familyId;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _setupRealtimeSubscriptions(String familyId) {
    // Nettoyer les anciennes subscriptions
    _listsChannel?.unsubscribe();
    _itemsChannel?.unsubscribe();

    // Subscription pour les listes
    _listsChannel = SupabaseService.client
        .channel('shared_lists_$familyId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shared_lists',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'family_id',
            value: familyId,
          ),
          callback: (payload) {
            _handleListChange(payload);
          },
        )
        .subscribe();
  }

  void _handleListChange(PostgresChangePayload payload) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newList = SharedList.fromJson(payload.newRecord);
        _lists = [newList, ..._lists];
        _lists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedList = SharedList.fromJson(payload.newRecord);
        _lists = _lists.map((list) => list.id == updatedList.id ? updatedList : list).toList();
        _lists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        
        // Mettre à jour la liste sélectionnée si nécessaire
        if (_selectedList?.id == updatedList.id) {
          _selectedList = updatedList;
        }
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String;
        _lists = _lists.where((list) => list.id != deletedId).toList();
        
        // Vider la sélection si la liste supprimée était sélectionnée
        if (_selectedList?.id == deletedId) {
          _selectedList = null;
          _items = [];
          _itemsChannel?.unsubscribe();
          _itemsChannel = null;
        }
        notifyListeners();
        break;
      default:
        break;
    }
  }

  Future<void> selectList(SharedList list) async {
    _selectedList = list;
    _items = [];
    
    // Nettoyer l'ancienne subscription d'éléments
    _itemsChannel?.unsubscribe();
    _itemsChannel = null;
    
    notifyListeners();
    await loadItems(list.id);
    
    // Setup Realtime pour les éléments de cette liste
    _setupItemsRealtimeSubscription(list.id);
  }

  void _setupItemsRealtimeSubscription(String listId) {
    // Nettoyer l'ancienne subscription
    _itemsChannel?.unsubscribe();

    // Subscription pour les éléments de la liste
    _itemsChannel = SupabaseService.client
        .channel('shared_list_items_$listId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shared_list_items',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'list_id',
            value: listId,
          ),
          callback: (payload) {
            _handleItemChange(payload);
          },
        )
        .subscribe();
  }

  void _handleItemChange(PostgresChangePayload payload) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newItem = SharedListItem.fromJson(payload.newRecord);
        _items = [..._items, newItem];
        _items.sort((a, b) {
          // Trier par statut (non cochés en premier), puis par date
          if (a.checked != b.checked) {
            return a.checked ? 1 : -1;
          }
          return a.createdAt.compareTo(b.createdAt);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedItem = SharedListItem.fromJson(payload.newRecord);
        _items = _items.map((item) => item.id == updatedItem.id ? updatedItem : item).toList();
        _items.sort((a, b) {
          if (a.checked != b.checked) {
            return a.checked ? 1 : -1;
          }
          return a.createdAt.compareTo(b.createdAt);
        });
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String;
        _items = _items.where((item) => item.id != deletedId).toList();
        notifyListeners();
        break;
      default:
        break;
    }
  }

  Future<void> loadItems(String listId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _items = await _service.getSharedListItems(listId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createList({
    required String familyId,
    required String name,
    String? description,
    required String color,
    required String createdBy,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.createSharedList(
        familyId: familyId,
        name: name,
        description: description,
        color: color,
        createdBy: createdBy,
      );
      // Realtime mettra à jour automatiquement _lists
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateList({
    required String listId,
    String? name,
    String? description,
    String? color,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.updateSharedList(listId, name: name, description: description, color: color);
      // Realtime mettra à jour automatiquement _lists
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteList(String listId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.deleteSharedList(listId);
      // Realtime mettra à jour automatiquement _lists
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addItems(List<String> texts) async {
    if (_selectedList == null || texts.isEmpty) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final user = _service.currentUser;
      if (user == null) {
        throw Exception('Vous devez être connecté');
      }

      await _service.addSharedListItems(
        listId: _selectedList!.id,
        texts: texts,
        createdBy: user.id,
      );
      // Realtime mettra à jour automatiquement _items
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateItem({
    required String itemId,
    String? text,
    bool? checked,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.updateSharedListItem(itemId, text: text, checked: checked);
      // Realtime mettra à jour automatiquement _items
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteItem(String itemId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.deleteSharedListItem(itemId);
      // Realtime mettra à jour automatiquement _items
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
    _listsChannel?.unsubscribe();
    _itemsChannel?.unsubscribe();
    super.dispose();
  }
}

