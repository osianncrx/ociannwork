import 'package:flutter/material.dart';

import '../model/language_model.dart';

class LanguageState {
  final Locale locale;
  final TextDirection textDirection;
  final String languageName;
  final List<LanguageModel> availableLanguages;

  LanguageState({
    required this.locale,
    required this.textDirection,
    required this.languageName,
    required this.availableLanguages,
  });

  LanguageState copyWith({
    Locale? locale,
    TextDirection? textDirection,
    String? languageName,
    List<LanguageModel>? availableLanguages,
  }) {
    return LanguageState(
      locale: locale ?? this.locale,
      textDirection: textDirection ?? this.textDirection,
      languageName: languageName ?? this.languageName,
      availableLanguages: availableLanguages ?? this.availableLanguages,
    );
  }
}
