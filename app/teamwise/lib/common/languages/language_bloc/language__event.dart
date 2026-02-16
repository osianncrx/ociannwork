import '../../../config.dart';

abstract class LanguageEvent {}

class LoadLanguageEvent extends LanguageEvent {}

class SetAvailableLanguagesEvent extends LanguageEvent {
  final List<LanguageModel> languages;
  SetAvailableLanguagesEvent(this.languages);
}

class ChangeLanguageEvent extends LanguageEvent {
  final LanguageModel selectedLanguage;
  ChangeLanguageEvent(this.selectedLanguage);
}
