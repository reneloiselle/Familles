/// Modèle SharedList
class SharedList {
  final String id;
  final String familyId;
  final String name;
  final String? description;
  final String color;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  SharedList({
    required this.id,
    required this.familyId,
    required this.name,
    this.description,
    required this.color,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SharedList.fromJson(Map<String, dynamic> json) {
    return SharedList(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      color: json['color'] as String,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'name': name,
      'description': description,
      'color': color,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

/// Modèle SharedListItem
class SharedListItem {
  final String id;
  final String listId;
  final String text;
  final bool checked;
  final String? quantity;
  final String? notes;
  final String createdBy;
  final DateTime? checkedAt;
  final String? checkedBy;
  final DateTime createdAt;

  SharedListItem({
    required this.id,
    required this.listId,
    required this.text,
    required this.checked,
    this.quantity,
    this.notes,
    required this.createdBy,
    this.checkedAt,
    this.checkedBy,
    required this.createdAt,
  });

  factory SharedListItem.fromJson(Map<String, dynamic> json) {
    return SharedListItem(
      id: json['id'] as String,
      listId: json['list_id'] as String,
      text: json['text'] as String,
      checked: json['checked'] as bool,
      quantity: json['quantity'] as String?,
      notes: json['notes'] as String?,
      createdBy: json['created_by'] as String,
      checkedAt: json['checked_at'] != null
          ? DateTime.parse(json['checked_at'] as String)
          : null,
      checkedBy: json['checked_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'list_id': listId,
      'text': text,
      'checked': checked,
      'quantity': quantity,
      'notes': notes,
      'created_by': createdBy,
      'checked_at': checkedAt?.toIso8601String(),
      'checked_by': checkedBy,
      'created_at': createdAt.toIso8601String(),
    };
  }
}


