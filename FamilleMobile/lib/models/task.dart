import 'package:flutter/material.dart';

/// Modèle Task
class Task {
  final String id;
  final String familyId;
  final String? assignedTo;
  final String title;
  final String? description;
  final TaskStatus status;
  final TaskPriority priority;
  final DateTime? dueDate;
  final String createdBy;
  final DateTime createdAt;

  Task({
    required this.id,
    required this.familyId,
    this.assignedTo,
    required this.title,
    this.description,
    required this.status,
    this.priority = TaskPriority.medium,
    this.dueDate,
    required this.createdBy,
    required this.createdAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      assignedTo: json['assigned_to'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: TaskStatus.fromString(json['status'] as String),
      priority: json['priority'] != null
          ? TaskPriority.fromString(json['priority'] as String)
          : TaskPriority.medium,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'assigned_to': assignedTo,
      'title': title,
      'description': description,
      'status': status.toString(),
      'priority': priority.toString(),
      'due_date': dueDate?.toIso8601String(),
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

enum TaskStatus {
  todo,
  completed;

  static TaskStatus fromString(String value) {
    switch (value) {
      case 'todo':
        return TaskStatus.todo;
      case 'completed':
        return TaskStatus.completed;
      // Migration: convertir les anciens statuts
      case 'pending':
      case 'in_progress':
        return TaskStatus.todo;
      default:
        return TaskStatus.todo;
    }
  }

  @override
  String toString() {
    switch (this) {
      case TaskStatus.todo:
        return 'todo';
      case TaskStatus.completed:
        return 'completed';
    }
  }

  String get displayName {
    switch (this) {
      case TaskStatus.todo:
        return 'À faire';
      case TaskStatus.completed:
        return 'Complété';
    }
  }
}

enum TaskPriority {
  low,
  medium,
  high;

  static TaskPriority fromString(String value) {
    switch (value) {
      case 'low':
        return TaskPriority.low;
      case 'medium':
        return TaskPriority.medium;
      case 'high':
        return TaskPriority.high;
      default:
        return TaskPriority.medium;
    }
  }

  @override
  String toString() {
    switch (this) {
      case TaskPriority.low:
        return 'low';
      case TaskPriority.medium:
        return 'medium';
      case TaskPriority.high:
        return 'high';
    }
  }

  String get displayName {
    switch (this) {
      case TaskPriority.low:
        return 'Basse';
      case TaskPriority.medium:
        return 'Moyenne';
      case TaskPriority.high:
        return 'Haute';
    }
  }

  Color get color {
    switch (this) {
      case TaskPriority.low:
        return Colors.green;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.high:
        return Colors.red;
    }
  }
}


