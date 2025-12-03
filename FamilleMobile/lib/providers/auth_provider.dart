import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';

/// Provider pour la gestion de l'authentification
class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = true;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    try {
      // Attendre que Supabase soit initialisé
      if (!SupabaseService.isInitialized) {
        await SupabaseService.initialize();
      }
      
      _user = SupabaseService.client.auth.currentUser;
      _isLoading = false;
      notifyListeners();

      // Écouter les changements d'authentification
      SupabaseService.client.auth.onAuthStateChange.listen((data) {
        _user = data.session?.user;
        notifyListeners();
      });
    } catch (e) {
      debugPrint('Erreur lors de l\'initialisation de l\'auth: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> signIn(String email, String password) async {
    try {
      _isLoading = true;
      notifyListeners();

      final response = await SupabaseService().signIn(
        email: email,
        password: password,
      );

      if (response.user != null) {
        _user = response.user;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<bool> signUp(String email, String password) async {
    try {
      _isLoading = true;
      notifyListeners();

      final response = await SupabaseService().signUp(
        email: email,
        password: password,
      );

      if (response.user != null) {
        _user = response.user;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await SupabaseService().signOut();
      _user = null;
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}


