// import 'dart:developer';

// import '../../../config.dart';

// class ThemeBloc extends HydratedBloc<ThemeEvent, ThemeState> {
//   ThemeBloc() : super(ThemeInitial()) {
//     /*  on<LoadThemeEvent>(_onLoadTheme); */
//     on<ToggleThemeEvent>(_onToggleTheme);
//   }

//   /* Future<void> _onLoadTheme(
//     LoadThemeEvent event,
//     Emitter<ThemeState> emit,
//   ) async {
//     final currentState = state;

//     log("message-=-=-=-=-=-=-=-=$currentState");
//     if (currentState is ThemeLoaded) {
//       emit(currentState);
//     } else {
//       emit(
//         ThemeLoaded(
//           isDarkMode: false,
//           themeMode: ThemeMode.light,
//           appTheme: AppTheme.fromType(ThemeType.light),
//         ),
//       );
//     }
//   } */

//   /* Future<void> _onToggleTheme(
//     ToggleThemeEvent event,
//     Emitter<ThemeState> emit,
//   ) async {
//     final currentState = state;
//     final currentIsDark =
//         currentState is ThemeLoaded && currentState.isDarkMode;

//     final newIsDark = !currentIsDark;

//     log("message-=-=-=-=-=-=-=-=$newIsDark");
//     emit(
//       ThemeLoaded(
//         isDarkMode: newIsDark,
//         themeMode: newIsDark ? ThemeMode.dark : ThemeMode.light,
//         appTheme: newIsDark
//             ? AppTheme.fromType(ThemeType.dark)
//             : AppTheme.fromType(ThemeType.light),
//       ),
//     );
//   } */

//   AppTheme get appTheme {
//     final currentState = state;
//     if (currentState is ThemeLoaded) {
//       log("message-=-=-=-=-=-=-=-=${currentState.appTheme}");
//       return currentState.appTheme;
//     } else {
//       return AppTheme.fromType(ThemeType.light);
//     }
//   }

//   @override
//   ThemeState? fromJson(Map<String, dynamic> json) {
//     try {
//       final isDarkMode = json['isDarkMode'] as bool;
//       return ThemeLoaded(
//         isDarkMode: isDarkMode,
//         themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
//         appTheme: isDarkMode
//             ? AppTheme.fromType(ThemeType.dark)
//             : AppTheme.fromType(ThemeType.light),
//       );
//     } catch (e) {
//       return null;
//     }
//   }

//   /// Exposes whether current theme is dark
//   bool get isDarkMode {
//     final currentState = state;
//     if (currentState is ThemeLoaded) {
//       return currentState.isDarkMode;
//     }
//     return false; // default fallback
//   }

//   @override
//   Map<String, dynamic>? toJson(ThemeState state) {
//     if (state is ThemeLoaded) {
//       return {'isDarkMode': state.isDarkMode};
//     }
//     return null;
//   }
// }

import 'package:teamwise/common/theme/theme_bloc/theme_event.dart';
import 'package:teamwise/common/theme/theme_bloc/theme_state.dart';
import 'package:teamwise/config.dart';

class ThemeServiceBloc extends Bloc<ThemeServiceEvent, ThemeServiceState> {
  final SharedPreferences sharedPreferences;

  ThemeServiceBloc(this.sharedPreferences)
    : super(ThemeServiceState.initial(sharedPreferences)) {
    on<ToggleThemeEvent>(_onToggleTheme);
    /*on<SetThemeModeEvent>((event, emit) {
      emit(state.copyWith(
        themeMode: event.themeMode,
        isDarkMode: event.themeMode == ThemeMode.dark
            ? true
            : event.themeMode == ThemeMode.light
                ? false
                : WidgetsBinding
                        .instance.platformDispatcher.platformBrightness ==
                    Brightness.dark,
      ));
    });*/
    on<SetThemeModeEvent>((event, emit) {
      final platformBrightness =
          WidgetsBinding.instance.platformDispatcher.platformBrightness;

      final isDarkMode = event.themeMode == ThemeMode.dark
          ? true
          : event.themeMode == ThemeMode.light
          ? false
          : platformBrightness == Brightness.dark;

      final themeType = isDarkMode ? ThemeType.dark : ThemeType.light;

      sharedPreferences.setBool(session.isDarkMode, isDarkMode);

      emit(
        state.copyWith(
          themeMode: event.themeMode,
          isDarkMode: isDarkMode,
          appTheme: AppTheme.fromType(themeType),
        ),
      );
    });
  }

  void _onToggleTheme(ToggleThemeEvent event, Emitter<ThemeServiceState> emit) {
    final newDarkMode = !state.isDarkMode;
    sharedPreferences.setBool(session.isDarkMode, newDarkMode);

    emit(
      state.copyWith(
        isDarkMode: newDarkMode,
        themeMode: newDarkMode ? ThemeMode.dark : ThemeMode.light,
        appTheme: newDarkMode
            ? AppTheme.fromType(ThemeType.dark)
            : AppTheme.fromType(ThemeType.light),
      ),
    );
  }
}
