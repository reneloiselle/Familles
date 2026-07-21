import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/product.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/supabase_service.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _service = SupabaseService();
  List<Product> _products = [];
  List<Store> _stores = [];
  List<ProductStorePlacement> _placements = [];
  Product? _selected;
  bool _showForm = false;
  bool _loading = true;
  String _search = '';
  final _nameCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _formatCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _upcCtrl = TextEditingController();
  String? _placementStoreId;
  final _aisleCtrl = TextEditingController();
  final _commentCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _brandCtrl.dispose();
    _formatCtrl.dispose();
    _priceCtrl.dispose();
    _upcCtrl.dispose();
    _aisleCtrl.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final family = context.read<FamilyProvider>().family;
    if (family == null) return;

    setState(() => _loading = true);
    try {
      final products = await _service.getProducts(family.id);
      final stores = await _service.getStores(family.id);
      if (mounted) {
        setState(() {
          _products = products;
          _stores = stores;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  void _selectProduct(Product? p) {
    setState(() {
      _showForm = true;
      _selected = p;
      _nameCtrl.text = p?.name ?? '';
      _brandCtrl.text = p?.brand ?? '';
      _formatCtrl.text = p?.format ?? '';
      _priceCtrl.text = p?.price != null ? p!.price.toString() : '';
      _upcCtrl.text = p?.upc ?? '';
      _placements = [];
      _placementStoreId = null;
      _aisleCtrl.clear();
      _commentCtrl.clear();
    });
    if (p != null) _loadPlacements(p.id);
  }

  Future<void> _loadPlacements(String productId) async {
    final list = await _service.getProductPlacements(productId);
    if (mounted) setState(() => _placements = list);
  }

  Future<void> _save() async {
    final family = context.read<FamilyProvider>().family!;
    final user = context.read<AuthProvider>().user;
    if (user == null || _nameCtrl.text.trim().isEmpty) return;

    try {
      if (_selected == null) {
        await _service.createProduct(
          familyId: family.id,
          name: _nameCtrl.text.trim(),
          brand: _brandCtrl.text,
          format: _formatCtrl.text,
          price: parsePriceInput(_priceCtrl.text),
          upc: _upcCtrl.text,
          createdBy: user.id,
        );
      } else {
        await _service.updateProduct(
          _selected!.id,
          name: _nameCtrl.text.trim(),
          brand: _brandCtrl.text,
          format: _formatCtrl.text,
          price: parsePriceInput(_priceCtrl.text),
          upc: _upcCtrl.text,
        );
      }
      await _load();
      setState(() => _showForm = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Produit enregistré')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  Future<void> _delete(Product p) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer'),
        content: Text('Supprimer « ${p.name} » ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Oui')),
        ],
      ),
    );
    if (ok != true) return;
    await _service.deleteProduct(p.id);
    _selectProduct(null);
    await _load();
  }

  Future<void> _addPlacement() async {
    if (_selected == null || _placementStoreId == null) return;
    final user = context.read<AuthProvider>().user!;
    await _service.addProductPlacement(
      productId: _selected!.id,
      storeId: _placementStoreId!,
      aisle: _aisleCtrl.text,
      comment: _commentCtrl.text,
      createdBy: user.id,
    );
    _aisleCtrl.clear();
    _commentCtrl.clear();
    await _loadPlacements(_selected!.id);
  }

  List<Product> get _filtered {
    final q = _search.toLowerCase();
    if (q.isEmpty) return _products;
    return _products.where((p) {
      return p.name.toLowerCase().contains(q) ||
          (p.brand?.toLowerCase().contains(q) ?? false) ||
          (p.upc?.contains(q) ?? false);
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Catalogue produits')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _selectProduct(null),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Rechercher…',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                if (_showForm)
                  Expanded(
                    flex: 3,
                    child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _selected == null ? 'Nouveau produit' : 'Modifier',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _nameCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Nom *',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _brandCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Marque',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _formatCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Format',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _priceCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Prix',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _upcCtrl,
                          decoration: const InputDecoration(
                            labelText: 'UPC',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            ElevatedButton(
                              onPressed: _save,
                              child: const Text('Enregistrer'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: () => setState(() => _showForm = false),
                              child: const Text('Fermer'),
                            ),
                          ],
                        ),
                        if (_selected != null) ...[
                          const Divider(height: 32),
                          const Text('Où le trouver', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            initialValue: _placementStoreId,
                            decoration: const InputDecoration(border: OutlineInputBorder()),
                            hint: const Text('Magasin'),
                            items: _stores
                                .map((s) => DropdownMenuItem(value: s.id, child: Text(s.name)))
                                .toList(),
                            onChanged: (v) => setState(() => _placementStoreId = v),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _aisleCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Rangée',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _commentCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Commentaire',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _addPlacement,
                            child: const Text('Ajouter emplacement'),
                          ),
                          ..._placements.map(
                            (pl) => ListTile(
                              title: Text(pl.storeName ?? 'Magasin'),
                              subtitle: Text(
                                '${pl.aisle ?? ''} ${pl.comment ?? ''}'.trim(),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete, color: Colors.red),
                                onPressed: () async {
                                  await _service.deleteProductPlacement(pl.id);
                                  await _loadPlacements(_selected!.id);
                                },
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  )
                else
                  Expanded(
                    child: ListView.builder(
                      itemCount: _filtered.length,
                      itemBuilder: (ctx, i) {
                        final p = _filtered[i];
                        return ListTile(
                          title: Text(formatProductLabel(
                            name: p.name,
                            brand: p.brand,
                            format: p.format,
                          )),
                          subtitle: p.price != null
                              ? Text('${p.price!.toStringAsFixed(2)} \$')
                              : null,
                          onTap: () => _selectProduct(p),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () => _delete(p),
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
