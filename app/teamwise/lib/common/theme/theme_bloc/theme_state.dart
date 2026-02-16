// // import '../../../config.dart';

// // abstract class ThemeState {}

// // class ThemeInitial extends ThemeState {}

// // class ThemeLoaded extends ThemeState {
// //   final bool isDarkMode;
// //   final ThemeMode themeMode;
// //   final AppTheme appTheme;

// //   ThemeLoaded({
// //     required this.isDarkMode,
// //     required this.themeMode,
// //     required this.appTheme,
// //   });
// // }

import 'package:equatable/equatable.dart';
import 'package:teamwise/common/theme/app_theme.dart';
import 'package:teamwise/config.dart';

// class ThemeServiceState extends Equatable {
//   final bool isDarkMode;
//   final ThemeMode themeMode;
//   final AppTheme appTheme;

//   const ThemeServiceState({
//     required this.isDarkMode,
//     required this.themeMode,
//     required this.appTheme,
//   });

//   factory ThemeServiceState.initial(SharedPreferences sharedPreferences) {
//     final isDarkMode = sharedPreferences.getBool(session.isDarkMode) ?? false;
//     return ThemeServiceState(
//       isDarkMode: isDarkMode,
//       themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
//       appTheme: isDarkMode
//           ? AppTheme.fromType(ThemeType.dark)
//           : AppTheme.fromType(ThemeType.light),
//     );
//   }

//   // Define which properties determine state equality
//   @override
//   List<Object> get props => [isDarkMode, themeMode, appTheme];

//   // Optional: Add a copyWith method for convenience
//   ThemeServiceState copyWith({
//     bool? isDarkMode,
//     ThemeMode? themeMode,
//     AppTheme? appTheme,
//   }) {
//     return ThemeServiceState(
//       isDarkMode: isDarkMode ?? this.isDarkMode,
//       themeMode: themeMode ?? this.themeMode,
//       appTheme: appTheme ?? this.appTheme,
//     );
//   }
// }

class ThemeServiceState extends Equatable {
  final bool isDarkMode;
  final ThemeMode themeMode;
  final AppTheme appTheme;

  const ThemeServiceState({
    required this.isDarkMode,
    required this.themeMode,
    required this.appTheme,
  });

  factory ThemeServiceState.initial(SharedPreferences sharedPreferences) {
    final isDarkMode = sharedPreferences.getBool(session.isDarkMode) ?? false;
    return ThemeServiceState(
      isDarkMode: isDarkMode,
      themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
      appTheme: isDarkMode
          ? AppTheme.fromType(ThemeType.dark)
          : AppTheme.fromType(ThemeType.light),
    );
  }

  // Define which properties determine state equality
  @override
  List<Object> get props => [isDarkMode, themeMode, appTheme];

  // Optional: Add a copyWith method for convenience
  ThemeServiceState copyWith({
    bool? isDarkMode,
    ThemeMode? themeMode,
    AppTheme? appTheme,
  }) {
    return ThemeServiceState(
      isDarkMode: isDarkMode ?? this.isDarkMode,
      themeMode: themeMode ?? this.themeMode,
      appTheme: appTheme ?? this.appTheme,
    );
  }
}
