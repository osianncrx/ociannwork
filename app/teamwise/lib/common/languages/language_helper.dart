import 'package:flutter/material.dart';

class LanguageHelper {
  Locale convertLangNameToLocale(String langNameToConvert) {
    switch (langNameToConvert.toLowerCase()) {
      case "english":
        return const Locale('en');
      case "french":
        return const Locale('fr');
      case 'spanish':
        return const Locale('es');
      case 'hindi':
        return const Locale('hi');
      case 'arabic':
        return const Locale('ar');
      default:
        return const Locale('en');
    }
  }

  String convertLocaleToLangName(String localeToConvert) {
    switch (localeToConvert.toLowerCase()) {
      case 'en':
        return "english";
      case 'fr':
        return "french";
      case 'es':
        return "spanish";
      case 'hi':
        return "hindi";
      case 'ar':
        return "arabic";
      default:
        return "english";
    }
  }

  TextDirection getTextDirectionForLocale(Locale locale) {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.contains(locale.languageCode)
        ? TextDirection.rtl
        : TextDirection.ltr;
  }
}
