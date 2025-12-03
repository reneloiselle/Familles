/// Modèle Family
class Family {
  final String id;
  final String name;
  final String createdBy;
  final DateTime createdAt;

  Family({
    required this.id,
    required this.name,
    required this.createdBy,
    required this.createdAt,
  });

  factory Family.fromJson(Map<String, dynamic> json) {
    return Family(
      id: json['id'] as String,
      name: json['name'] as String,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

/// Modèle FamilyMember
class FamilyMember {
  final String id;
  final String familyId;
  final String? userId;
  final String role; // 'parent' ou 'child'
  final String? name;
  final String? email;
  final String? invitationStatus;
  final DateTime createdAt;

  FamilyMember({
    required this.id,
    required this.familyId,
    this.userId,
    required this.role,
    this.name,
    this.email,
    this.invitationStatus,
    required this.createdAt,
  });

  factory FamilyMember.fromJson(Map<String, dynamic> json) {
    return FamilyMember(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      userId: json['user_id'] as String?,
      role: json['role'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      invitationStatus: json['invitation_status'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'user_id': userId,
      'role': role,
      'name': name,
      'email': email,
      'invitation_status': invitationStatus,
      'created_at': createdAt.toIso8601String(),
    };
  }

  bool get hasAccount => userId != null;
  bool get isParent => role == 'parent';
}


