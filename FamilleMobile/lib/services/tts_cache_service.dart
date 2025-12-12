import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:crypto/crypto.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TTSCacheService {
  static const String _cachePrefKey = 'tts_cache_files';
  static const int _maxCacheSize = 50; // Nombre maximum de fichiers en cache
  static const int _maxCacheAgeDays = 7; // Age maximum des fichiers en cache (jours)

  /// Génère un hash pour le texte, la voix et la vitesse
  static String _generateHash(String text, String voice, double speed, String model) {
    final key = '$text|$voice|$speed|$model';
    final bytes = utf8.encode(key);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Récupère le chemin du fichier en cache s'il existe
  static Future<String?> getCachedFile(
    String text,
    String voice,
    double speed,
    String model,
  ) async {
    try {
      final hash = _generateHash(text, voice, speed, model);
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/tts_cache');
      
      if (!await cacheDir.exists()) {
        return null;
      }

      final cachedFile = File('${cacheDir.path}/$hash.mp3');
      if (await cachedFile.exists()) {
        // Vérifier l'âge du fichier
        final stat = await cachedFile.stat();
        final age = DateTime.now().difference(stat.modified);
        if (age.inDays > _maxCacheAgeDays) {
          // Fichier trop vieux, le supprimer
          await cachedFile.delete();
          await _removeFromCacheList(hash);
          return null;
        }
        return cachedFile.path;
      }
    } catch (e) {
      debugPrint('Erreur lors de la récupération du cache: $e');
    }
    return null;
  }

  /// Sauvegarde un fichier dans le cache
  static Future<void> saveToCache(
    String text,
    String voice,
    double speed,
    String model,
    String filePath,
  ) async {
    try {
      final hash = _generateHash(text, voice, speed, model);
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/tts_cache');
      
      if (!await cacheDir.exists()) {
        await cacheDir.create(recursive: true);
      }

      final sourceFile = File(filePath);
      if (!await sourceFile.exists()) {
        return;
      }

      final cachedFile = File('${cacheDir.path}/$hash.mp3');
      await sourceFile.copy(cachedFile.path);
      
      await _addToCacheList(hash);
      await _cleanupOldCache();
    } catch (e) {
      debugPrint('Erreur lors de la sauvegarde du cache: $e');
    }
  }

  /// Ajoute un hash à la liste des fichiers en cache
  static Future<void> _addToCacheList(String hash) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheList = prefs.getStringList(_cachePrefKey) ?? [];
      if (!cacheList.contains(hash)) {
        cacheList.add(hash);
        await prefs.setStringList(_cachePrefKey, cacheList);
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'ajout à la liste de cache: $e');
    }
  }

  /// Retire un hash de la liste des fichiers en cache
  static Future<void> _removeFromCacheList(String hash) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheList = prefs.getStringList(_cachePrefKey) ?? [];
      cacheList.remove(hash);
      await prefs.setStringList(_cachePrefKey, cacheList);
    } catch (e) {
      debugPrint('Erreur lors de la suppression de la liste de cache: $e');
    }
  }

  /// Nettoie les anciens fichiers du cache
  static Future<void> _cleanupOldCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheList = prefs.getStringList(_cachePrefKey) ?? [];
      
      if (cacheList.length <= _maxCacheSize) {
        return;
      }

      // Supprimer les fichiers les plus anciens
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/tts_cache');
      
      if (!await cacheDir.exists()) {
        return;
      }

      // Trier les fichiers par date de modification
      final filesWithDates = <MapEntry<File, DateTime>>[];
      for (final hash in cacheList) {
        final file = File('${cacheDir.path}/$hash.mp3');
        if (await file.exists()) {
          final stat = await file.stat();
          filesWithDates.add(MapEntry(file, stat.modified));
        }
      }

      filesWithDates.sort((a, b) => a.value.compareTo(b.value));
      final files = filesWithDates.map((e) => e.key).toList();

      // Supprimer les fichiers les plus anciens
      final toRemove = files.length - _maxCacheSize;
      for (int i = 0; i < toRemove; i++) {
        final file = files[i];
        final hash = file.path.split('/').last.replaceAll('.mp3', '');
        await file.delete();
        await _removeFromCacheList(hash);
      }
    } catch (e) {
      debugPrint('Erreur lors du nettoyage du cache: $e');
    }
  }

  /// Nettoie tout le cache
  static Future<void> clearCache() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/tts_cache');
      
      if (await cacheDir.exists()) {
        await cacheDir.delete(recursive: true);
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cachePrefKey);
    } catch (e) {
      debugPrint('Erreur lors du nettoyage complet du cache: $e');
    }
  }

  /// Récupère la taille du cache
  static Future<int> getCacheSize() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/tts_cache');
      
      if (!await cacheDir.exists()) {
        return 0;
      }

      int totalSize = 0;
      await for (final entity in cacheDir.list()) {
        if (entity is File) {
          final stat = await entity.stat();
          totalSize += stat.size;
        }
      }
      return totalSize;
    } catch (e) {
      debugPrint('Erreur lors du calcul de la taille du cache: $e');
      return 0;
    }
  }
}

