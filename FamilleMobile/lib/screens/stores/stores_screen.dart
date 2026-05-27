import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/product.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/supabase_service.dart';
import 'store_detail_screen.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});

  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  final _service = SupabaseService();
  List<Store> _stores = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final familyId = context.read<FamilyProvider>().family?.id;
    if (familyId == null) return;
    setState(() => _loading = true);
    try {
      _stores = await _service.getStores(familyId);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showForm([Store? store]) async {
    final nameCtrl = TextEditingController(text: store?.name ?? '');
    final notesCtrl = TextEditingController(text: store?.notes ?? '');
    final family = context.read<FamilyProvider>().family!;
    final user = context.read<AuthProvider>().user!;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(store == null ? 'Nouveau magasin' : 'Modifier'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Nom *'),
            ),
            TextField(
              controller: notesCtrl,
              decoration: const InputDecoration(labelText: 'Notes'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          if (store != null)
            TextButton(
              onPressed: () async {
                await _service.deleteStore(store.id);
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
            ),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );

    if (ok == true && nameCtrl.text.trim().isNotEmpty) {
      if (store == null) {
        await _service.createStore(
          familyId: family.id,
          name: nameCtrl.text.trim(),
          notes: notesCtrl.text,
          createdBy: user.id,
        );
      } else {
        await _service.updateStore(
          store.id,
          name: nameCtrl.text.trim(),
          notes: notesCtrl.text,
        );
      }
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Magasins'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _stores.isEmpty
              ? const Center(child: Text('Aucun magasin'))
              : ListView.builder(
                  itemCount: _stores.length,
                  itemBuilder: (ctx, i) {
                    final s = _stores[i];
                    return ListTile(
                      title: Text(s.name),
                      subtitle: s.notes != null ? Text(s.notes!) : null,
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => StoreDetailScreen(storeId: s.id),
                          ),
                        );
                      },
                      onLongPress: () => _showForm(s),
                    );
                  },
                ),
    );
  }
}
