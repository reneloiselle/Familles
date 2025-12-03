/// Modèle Invitation
class Invitation {
  final String id;
  final String familyId;
  final String familyMemberId;
  final String email;
  final String role; // 'parent' ou 'child'
  final String invitedBy;
  final String status; // 'pending', 'accepted', 'declined', 'expired'
  final String token;
  final DateTime createdAt;
  final DateTime expiresAt;

  Invitation({
    required this.id,
    required this.familyId,
    required this.familyMemberId,
    required this.email,
    required this.role,
    required this.invitedBy,
    required this.status,
    required this.token,
    required this.createdAt,
    required this.expiresAt,
  });

  factory Invitation.fromJson(Map<String, dynamic> json) {
    return Invitation(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      familyMemberId: json['family_member_id'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      invitedBy: json['invited_by'] as String,
      status: json['status'] as String,
      token: json['token'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      expiresAt: DateTime.parse(json['expires_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'family_member_id': familyMemberId,
      'email': email,
      'role': role,
      'invited_by': invitedBy,
      'status': status,
      'token': token,
      'created_at': createdAt.toIso8601String(),
      'expires_at': expiresAt.toIso8601String(),
    };
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isPending => status == 'pending' && !isExpired;
}

