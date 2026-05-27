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
  String? _currentListId;

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

    // Pas de filtre serveur : les événements DELETE ne sont pas émis avec un filtre
    _listsChannel = SupabaseService.client
        .channel('shared_lists_$familyId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shared_lists',
          callback: (payload) {
            _handleListChange(payload, familyId);
          },
        )
        .subscribe();
  }

  void _handleListChange(PostgresChangePayload payload, String familyId) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newList = SharedList.fromJson(payload.newRecord);
        if (newList.familyId != familyId) return;
        if (_lists.any((list) => list.id == newList.id)) return;
        _lists = [newList, ..._lists];
        _lists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedList = SharedList.fromJson(payload.newRecord);
        if (updatedList.familyId != familyId) return;
        _lists = _lists.map((list) => list.id == updatedList.id ? updatedList : list).toList();
        _lists.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        
        // Mettre à jour la liste sélectionnée si nécessaire
        if (_selectedList?.id == updatedList.id) {
          _selectedList = updatedList;
        }
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String?;
        if (deletedId == null) return;
        if (!_lists.any((list) => list.id == deletedId)) return;
        _lists = _lists.where((list) => list.id != deletedId).toList();
        
        // Vider la sélection si la liste supprimée était sélectionnée
        if (_selectedList?.id == deletedId) {
          _selectedList = null;
          _items = [];
          _currentListId = null;
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
    _currentListId = list.id;
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
    _currentListId = listId;
    // Nettoyer l'ancienne subscription
    _itemsChannel?.unsubscribe();

    // Pas de filtre list_id côté serveur : les DELETE ne sont pas émis avec filtre
    _itemsChannel = SupabaseService.client
        .channel('shared_list_items_$listId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shared_list_items',
          callback: (payload) {
            _handleItemChange(payload, listId);
          },
        )
        .subscribe();
  }

  void _sortItems() {
    _items.sort((a, b) {
      if (a.checked != b.checked) {
        return a.checked ? 1 : -1;
      }
      return a.createdAt.compareTo(b.createdAt);
    });
  }

  void _handleItemChange(PostgresChangePayload payload, String listId) {
    switch (payload.eventType) {
      case PostgresChangeEvent.insert:
        final newItem = SharedListItem.fromJson(payload.newRecord);
        if (newItem.listId != listId) return;
        if (_items.any((item) => item.id == newItem.id)) return;
        _items = [..._items, newItem];
        _sortItems();
        notifyListeners();
        break;
      case PostgresChangeEvent.update:
        final updatedItem = SharedListItem.fromJson(payload.newRecord);
        if (updatedItem.listId != listId) return;
        _items = _items.map((item) => item.id == updatedItem.id ? updatedItem : item).toList();
        _sortItems();
        notifyListeners();
        break;
      case PostgresChangeEvent.delete:
        final deletedId = payload.oldRecord['id'] as String?;
        if (deletedId == null) return;
        if (!_items.any((item) => item.id == deletedId)) return;
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
      _lists = _lists.where((list) => list.id != listId).toList();
      if (_selectedList?.id == listId) {
        _selectedList = null;
        _items = [];
        _currentListId = null;
        _itemsChannel?.unsubscribe();
        _itemsChannel = null;
      }
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
      _items = _items.where((item) => item.id != itemId).toList();
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

