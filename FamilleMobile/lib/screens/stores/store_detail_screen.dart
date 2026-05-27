import 'package:flutter/material.dart';
import '../../models/product.dart';
import '../../services/supabase_service.dart';

class StoreDetailScreen extends StatefulWidget {
  final String storeId;

  const StoreDetailScreen({super.key, required this.storeId});

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen> {
  final _service = SupabaseService();
  Store? _store;
  List<Map<String, dynamic>> _rows = [];
  String _search = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    _store = await _service.getStore(widget.storeId);
    _rows = await _service.getStorePlacementsWithProducts(widget.storeId);
    _rows.sort((a, b) {
      final aisleA = (a['aisle'] as String? ?? 'zzz').toLowerCase();
      final aisleB = (b['aisle'] as String? ?? 'zzz').toLowerCase();
      if (aisleA != aisleB) return aisleA.compareTo(aisleB);
      final pA = a['products'] as Map<String, dynamic>?;
      final pB = b['products'] as Map<String, dynamic>?;
      final nameA = pA != null
          ? formatProductLabel(
              name: pA['name'] as String,
              brand: pA['brand'] as String?,
              format: pA['format'] as String?,
            )
          : '';
      final nameB = pB != null
          ? formatProductLabel(
              name: pB['name'] as String,
              brand: pB['brand'] as String?,
              format: pB['format'] as String?,
            )
          : '';
      return nameA.compareTo(nameB);
    });
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _search.toLowerCase();
    if (q.isEmpty) return _rows;
    return _rows.where((row) {
      final aisle = (row['aisle'] as String? ?? '').toLowerCase();
      final p = row['products'] as Map<String, dynamic>?;
      final label = p != null
          ? formatProductLabel(
              name: p['name'] as String,
              brand: p['brand'] as String?,
              format: p['format'] as String?,
            ).toLowerCase()
          : '';
      return aisle.contains(q) || label.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_store?.name ?? 'Magasin'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_store?.notes != null)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(_store!.notes!),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Filtrer…',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                Expanded(
                  child: _filtered.isEmpty
                      ? const Center(child: Text('Aucun produit dans ce magasin'))
                      : ListView.builder(
                          itemCount: _filtered.length,
                          itemBuilder: (ctx, i) {
                            final row = _filtered[i];
                            final p = row['products'] as Map<String, dynamic>?;
                            final label = p != null
                                ? formatProductLabel(
                                    name: p['name'] as String,
                                    brand: p['brand'] as String?,
                                    format: p['format'] as String?,
                                  )
                                : '—';
                            return ListTile(
                              title: Text(label),
                              subtitle: Text(
                                'Rangée: ${row['aisle'] ?? '—'}'
                                '${row['comment'] != null ? '\n${row['comment']}' : ''}',
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
