import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/family_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/family.dart';
import '../../models/invitation.dart';
import 'package:share_plus/share_plus.dart';

class FamilyScreen extends StatelessWidget {
  const FamilyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ma famille'),
      ),
      body: Consumer<FamilyProvider>(
        builder: (context, familyProvider, _) {
          if (familyProvider.isLoading && !familyProvider.hasFamily) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!familyProvider.hasFamily) {
            return _CreateFamilyForm();
          }

          return RefreshIndicator(
            onRefresh: () => familyProvider.loadFamily(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Nom de la famille
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.family_restroom, size: 32, color: Color(0xFF3b82f6)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  familyProvider.family!.name,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${familyProvider.familyMembers.length} membre${familyProvider.familyMembers.length > 1 ? 's' : ''}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Gestion des invitations (parents uniquement)
                  if (familyProvider.isParent) ...[
                    _InvitationManager(),
                    const SizedBox(height: 16),
                  ],

                  // Liste des membres
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Membres de la famille',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (familyProvider.familyMembers.isEmpty)
                            const Padding(
                              padding: EdgeInsets.all(16),
                              child: Center(
                                child: Text(
                                  'Aucun membre pour le moment',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                            )
                          else
                            ...familyProvider.familyMembers.map((member) => _MemberCard(
                                  member: member,
                                  canRemove: familyProvider.isParent &&
                                      member.userId != context.read<AuthProvider>().user?.id,
                                  onRemove: () => _removeMember(context, familyProvider, member.id),
                                )),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _removeMember(BuildContext context, FamilyProvider provider, String memberId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Retirer le membre'),
        content: const Text('Êtes-vous sûr de vouloir retirer ce membre de la famille ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Retirer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await provider.removeMember(memberId);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Membre retiré avec succès')),
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

class _CreateFamilyForm extends StatefulWidget {
  @override
  State<_CreateFamilyForm> createState() => _CreateFamilyFormState();
}

class _CreateFamilyFormState extends State<_CreateFamilyForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _createFamily() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<FamilyProvider>();
      await provider.createFamily(_nameController.text.trim());
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Famille créée avec succès !')),
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

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.family_restroom,
                    size: 64,
                    color: Color(0xFF3b82f6),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Créer une nouvelle famille',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Donnez un nom à votre famille pour commencer',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nom de la famille',
                      prefixIcon: Icon(Icons.home),
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Veuillez entrer un nom';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _createFamily,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Créer la famille'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InvitationManager extends StatefulWidget {
  @override
  State<_InvitationManager> createState() => _InvitationManagerState();
}

class _InvitationManagerState extends State<_InvitationManager> {
  bool _showForm = false;
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  String _role = 'child';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FamilyProvider>().loadInvitations();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _sendInvitation() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<FamilyProvider>();
      await provider.sendInvitation(
        email: _emailController.text.trim(),
        role: _role,
        name: _nameController.text.trim().isEmpty ? null : _nameController.text.trim(),
      );

      if (mounted) {
        setState(() {
          _showForm = false;
          _emailController.clear();
          _nameController.clear();
          _role = 'child';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invitation envoyée avec succès')),
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

  Future<void> _cancelInvitation(String invitationId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler l\'invitation'),
        content: const Text('Êtes-vous sûr de vouloir annuler cette invitation ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Non'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Oui'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await context.read<FamilyProvider>().cancelInvitation(invitationId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invitation annulée')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur: ${e.toString()}')),
          );
        }
      }
    }
  }

  String _getInvitationLink(String token) {
    // TODO: Remplacer par l'URL de votre application
    return 'https://votre-app.com/invitation/accept?token=$token';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<FamilyProvider>(
      builder: (context, provider, _) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Invitations',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: Icon(_showForm ? Icons.close : Icons.add),
                      onPressed: () => setState(() => _showForm = !_showForm),
                    ),
                  ],
                ),
                if (_showForm) ...[
                  const SizedBox(height: 16),
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.email),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Veuillez entrer un email';
                            }
                            if (!value.contains('@')) {
                              return 'Email invalide';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nom (optionnel)',
                            prefixIcon: Icon(Icons.person),
                            border: OutlineInputBorder(),
                            hintText: 'Pour les enfants sans compte',
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _role,
                          decoration: const InputDecoration(
                            labelText: 'Rôle',
                            prefixIcon: Icon(Icons.group),
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'child', child: Text('Enfant')),
                            DropdownMenuItem(value: 'parent', child: Text('Parent')),
                          ],
                          onChanged: (value) => setState(() => _role = value!),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _sendInvitation,
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Envoyer l\'invitation'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                if (provider.invitations.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        'Aucune invitation',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else
                  ...provider.invitations.map((invitation) => _InvitationCard(
                        invitation: invitation,
                        onCancel: () => _cancelInvitation(invitation.id),
                        onShare: () => Share.share(_getInvitationLink(invitation.token)),
                      )),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InvitationCard extends StatelessWidget {
  final Invitation invitation;
  final VoidCallback onCancel;
  final VoidCallback onShare;

  const _InvitationCard({
    required this.invitation,
    required this.onCancel,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusText;
    switch (invitation.status) {
      case 'pending':
        statusColor = Colors.orange;
        statusText = 'En attente';
        break;
      case 'accepted':
        statusColor = Colors.green;
        statusText = 'Acceptée';
        break;
      case 'declined':
        statusColor = Colors.red;
        statusText = 'Refusée';
        break;
      default:
        statusColor = Colors.grey;
        statusText = 'Expirée';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(invitation.email),
        subtitle: Text('Rôle: ${invitation.role == 'parent' ? 'Parent' : 'Enfant'}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Chip(
              label: Text(statusText),
              backgroundColor: statusColor.withOpacity(0.2),
              labelStyle: TextStyle(color: statusColor),
              padding: EdgeInsets.zero,
            ),
            if (invitation.isPending) ...[
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: onShare,
                tooltip: 'Partager le lien',
              ),
              IconButton(
                icon: const Icon(Icons.cancel),
                color: Colors.red,
                onPressed: onCancel,
                tooltip: 'Annuler',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final FamilyMember member;
  final bool canRemove;
  final VoidCallback onRemove;

  const _MemberCard({
    required this.member,
    required this.canRemove,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final isCurrentUser = member.userId == authProvider.user?.id;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: member.isParent
              ? const Color(0xFF3b82f6).withOpacity(0.2)
              : Colors.grey.withOpacity(0.2),
          child: Icon(
            member.isParent ? Icons.person : Icons.child_care,
            color: member.isParent ? const Color(0xFF3b82f6) : Colors.grey,
          ),
        ),
        title: Text(
          isCurrentUser
              ? 'Vous'
              : member.name ?? member.email ?? 'Membre ${member.id.substring(0, 8)}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(member.isParent ? 'Parent' : 'Enfant'),
            if (member.email != null && member.name != null)
              Text(member.email!, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            if (!member.hasAccount)
              const Chip(
                label: Text('Sans compte', style: TextStyle(fontSize: 10)),
                backgroundColor: Colors.orange,
                padding: EdgeInsets.zero,
              ),
            if (member.invitationStatus == 'pending')
              const Chip(
                label: Text('Invitation en attente', style: TextStyle(fontSize: 10)),
                backgroundColor: Colors.blue,
                padding: EdgeInsets.zero,
              ),
          ],
        ),
        trailing: canRemove
            ? IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                onPressed: onRemove,
                tooltip: 'Retirer ce membre',
              )
            : null,
      ),
    );
  }
}
