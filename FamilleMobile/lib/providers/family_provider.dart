import 'package:flutter/foundation.dart';
import '../models/family.dart';
import '../models/invitation.dart';
import '../services/supabase_service.dart';

/// Provider pour la gestion de la famille
class FamilyProvider with ChangeNotifier {
  Family? _family;
  FamilyMember? _familyMember;
  List<FamilyMember> _familyMembers = [];
  List<Invitation> _invitations = [];
  bool _isLoading = false;
  String? _error;

  Family? get family => _family;
  FamilyMember? get familyMember => _familyMember;
  List<FamilyMember> get familyMembers => _familyMembers;
  List<Invitation> get invitations => _invitations;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isParent => _familyMember?.isParent ?? false;
  bool get hasFamily => _family != null;

  final _service = SupabaseService();

  Future<void> loadFamily() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final user = _service.currentUser;
      if (user == null) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Charger le membre de famille
      _familyMember = await _service.getFamilyMemberByUserId(user.id);
      
      if (_familyMember == null) {
        _family = null;
        _familyMembers = [];
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Charger la famille
      _family = await _service.getFamilyByUserId(user.id);
      
      if (_family != null) {
        // Charger les membres de la famille
        _familyMembers = await _service.getFamilyMembers(_family!.id);
        // Charger les invitations
        await loadInvitations();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createFamily(String name) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final user = _service.currentUser;
      if (user == null) {
        throw Exception('Vous devez être connecté');
      }

      _family = await _service.createFamily(name: name, userId: user.id);
      
      // Recharger les données
      await loadFamily();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> removeMember(String memberId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.removeFamilyMember(memberId);
      await loadFamily();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadInvitations() async {
    if (_family == null) return;

    try {
      _invitations = await _service.getInvitations(_family!.id);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
    }
  }

  Future<void> sendInvitation({
    required String email,
    required String role,
    String? name,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_family == null) {
        throw Exception('Vous devez avoir une famille');
      }

      await _service.createInvitation(
        familyId: _family!.id,
        email: email,
        role: role,
        name: name,
      );

      await loadInvitations();
      await loadFamily();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> cancelInvitation(String invitationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _service.cancelInvitation(invitationId);
      await loadInvitations();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

