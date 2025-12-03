/// Modèle Schedule
class Schedule {
  final String id;
  final String familyMemberId;
  final String title;
  final String? description;
  final String date; // Format: YYYY-MM-DD
  final String startTime; // Format: HH:mm
  final String endTime; // Format: HH:mm
  final DateTime createdAt;

  Schedule({
    required this.id,
    required this.familyMemberId,
    required this.title,
    this.description,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.createdAt,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    return Schedule(
      id: json['id'] as String,
      familyMemberId: json['family_member_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      date: json['date'] as String,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_member_id': familyMemberId,
      'title': title,
      'description': description,
      'date': date,
      'start_time': startTime,
      'end_time': endTime,
      'created_at': createdAt.toIso8601String(),
    };
  }

  DateTime get dateTime => DateTime.parse(date);
  
  DateTime get startDateTime {
    final dateParts = date.split('-');
    final timeParts = startTime.split(':');
    return DateTime(
      int.parse(dateParts[0]),
      int.parse(dateParts[1]),
      int.parse(dateParts[2]),
      int.parse(timeParts[0]),
      int.parse(timeParts[1]),
    );
  }

  DateTime get endDateTime {
    final dateParts = date.split('-');
    final timeParts = endTime.split(':');
    return DateTime(
      int.parse(dateParts[0]),
      int.parse(dateParts[1]),
      int.parse(dateParts[2]),
      int.parse(timeParts[0]),
      int.parse(timeParts[1]),
    );
  }
}


