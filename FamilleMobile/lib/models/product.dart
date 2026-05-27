/// Produit du catalogue familial
class Product {
  final String id;
  final String familyId;
  final String name;
  final String? brand;
  final String? format;
  final double? price;
  final String? upc;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Product({
    required this.id,
    required this.familyId,
    required this.name,
    this.brand,
    this.format,
    this.price,
    this.upc,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      name: json['name'] as String,
      brand: json['brand'] as String?,
      format: json['format'] as String?,
      price: json['price'] != null
          ? (json['price'] is num
              ? (json['price'] as num).toDouble()
              : double.tryParse(json['price'].toString()))
          : null,
      upc: json['upc'] as String?,
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
      'brand': brand,
      'format': format,
      'price': price,
      'upc': upc,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

/// Magasin
class Store {
  final String id;
  final String familyId;
  final String name;
  final String? notes;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Store({
    required this.id,
    required this.familyId,
    required this.name,
    this.notes,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Store.fromJson(Map<String, dynamic> json) {
    return Store(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      name: json['name'] as String,
      notes: json['notes'] as String?,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

/// Emplacement produit dans un magasin
class ProductStorePlacement {
  final String id;
  final String productId;
  final String storeId;
  final String? aisle;
  final String? comment;
  final String? storeName;

  ProductStorePlacement({
    required this.id,
    required this.productId,
    required this.storeId,
    this.aisle,
    this.comment,
    this.storeName,
  });

  factory ProductStorePlacement.fromJson(Map<String, dynamic> json) {
    final stores = json['stores'];
    return ProductStorePlacement(
      id: json['id'] as String,
      productId: json['product_id'] as String,
      storeId: json['store_id'] as String,
      aisle: json['aisle'] as String?,
      comment: json['comment'] as String?,
      storeName: stores is Map ? stores['name'] as String? : null,
    );
  }
}

String formatProductLabel({
  required String name,
  String? brand,
  String? format,
}) {
  var label = name.trim();
  if (brand != null && brand.trim().isNotEmpty) {
    label += ' — ${brand.trim()}';
  }
  if (format != null && format.trim().isNotEmpty) {
    label += ' (${format.trim()})';
  }
  return label;
}

String? normalizeUpc(String? upc) {
  if (upc == null || upc.trim().isEmpty) return null;
  final digits = upc.replaceAll(RegExp(r'\D'), '');
  return digits.isEmpty ? null : digits;
}

double? parsePriceInput(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return double.tryParse(trimmed.replaceAll(',', '.'));
}
