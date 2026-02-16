import 'package:flutter/material.dart';

class LanguageModel {
  final String name;
  final String code;
  final bool isRtl;

  LanguageModel({required this.name, required this.code, this.isRtl = false});

  Locale get toLocale => Locale(code);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LanguageModel &&
          runtimeType == other.runtimeType &&
          code == other.code &&
          name == other.name &&
          isRtl == other.isRtl;

  @override
  int get hashCode => code.hashCode ^ name.hashCode ^ isRtl.hashCode;

  Map<String, dynamic> toJson() => {'name': name, 'code': code, 'isRtl': isRtl};

  factory LanguageModel.fromJson(Map<String, dynamic> json) => LanguageModel(
    name: json['name'] as String,
    code: json['code'] as String,
    isRtl: json['isRtl'] as bool,
  );
}
