import '../../../config.dart';

class LanguageBloc extends HydratedBloc<LanguageEvent, LanguageState> {
  final LanguageHelper helper;

  LanguageBloc({required this.helper})
    : super(
        LanguageState(
          locale: const Locale('en'),
          textDirection: TextDirection.ltr,
          languageName: 'English',
          availableLanguages: const [],
        ),
      ) {
    on<LoadLanguageEvent>(_onLoadLanguage);
    on<SetAvailableLanguagesEvent>(_onSetLanguages);
    on<ChangeLanguageEvent>(_onChangeLanguage);
  }

  Future<void> _onLoadLanguage(
    LoadLanguageEvent event,
    Emitter<LanguageState> emit,
  ) async {
    try {
      // Uncomment and connect to real API if needed

      // For now, simulate skipping API call and falling back to static
      throw Exception("Skip API, use static");
    } catch (_) {
      final fallbackLanguages = appArray.getDefaultLanguages();

      // Use the persisted state (from HydratedBloc) or fallback to default
      final selectedCode = state.locale.languageCode;
      final selected = fallbackLanguages.firstWhere(
        (lang) => lang.code == selectedCode,
        orElse: () => fallbackLanguages.first,
      );

      emit(
        state.copyWith(
          locale: selected.toLocale,
          languageName: selected.name,
          textDirection: selected.isRtl ? TextDirection.rtl : TextDirection.ltr,
          availableLanguages: fallbackLanguages,
        ),
      );
    }
  }

  Future<void> _onSetLanguages(
    SetAvailableLanguagesEvent event,
    Emitter<LanguageState> emit,
  ) async {
    final selectedCode = state.locale.languageCode;
    final selected = event.languages.firstWhere(
      (lang) => lang.code == selectedCode,
      orElse: () => event.languages.first,
    );

    emit(
      state.copyWith(
        availableLanguages: event.languages,
        locale: selected.toLocale,
        languageName: selected.name,
        textDirection: selected.isRtl ? TextDirection.rtl : TextDirection.ltr,
      ),
    );
  }

  Future<void> _onChangeLanguage(
    ChangeLanguageEvent event,
    Emitter<LanguageState> emit,
  ) async {
    emit(
      state.copyWith(
        locale: event.selectedLanguage.toLocale,
        languageName: event.selectedLanguage.name,
        textDirection: event.selectedLanguage.isRtl
            ? TextDirection.rtl
            : TextDirection.ltr,
      ),
    );
  }

  @override
  LanguageState? fromJson(Map<String, dynamic> json) {
    try {
      final language = LanguageModel.fromJson(json['selectedLanguage']);
      return LanguageState(
        locale: language.toLocale,
        languageName: language.name,
        textDirection: language.isRtl ? TextDirection.rtl : TextDirection.ltr,
        availableLanguages: (json['availableLanguages'] as List<dynamic>)
            .map((e) => LanguageModel.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
    } catch (e) {
      return null;
    }
  }

  @override
  Map<String, dynamic>? toJson(LanguageState state) {
    return {
      'selectedLanguage': LanguageModel(
        name: state.languageName,
        code: state.locale.languageCode,
        isRtl: state.textDirection == TextDirection.rtl,
      ).toJson(),
      'availableLanguages': state.availableLanguages
          .map((lang) => lang.toJson())
          .toList(),
    };
  }
}
