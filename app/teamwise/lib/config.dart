export 'dart:io';

import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:teamwise/common/theme/theme_bloc/theme_state.dart';
import 'package:teamwise/config.dart';
import 'common/app_array.dart';
import 'common/app_fonts.dart';
import 'common/helper/navigation_class.dart';
import 'common/languages/app_language.dart';
import 'common/session.dart';
import 'common/theme/app_css.dart';
import 'common/theme/app_theme.dart';
import 'common/theme/theme_bloc/theme_bloc.dart';

export 'package:teamwise/routes/screen_list.dart';
export 'package:teamwise/routes/index.dart';
export 'common/helper/navigation_class.dart';
export 'package:teamwise/features/dashboard/presentation/bloc/create_reminder_bloc/create_reminder_bloc.dart';
export 'package:teamwise/features/dashboard/presentation/bloc/create_reminder_bloc/create_reminder_event.dart';
export 'package:teamwise/features/dashboard/presentation/bloc/create_reminder_bloc/create_reminder_state.dart';

export '../../../../common/index.dart';
export '../../../../di/locator.dart';
export 'package:flutter/material.dart';
export '../../packages_list.dart';

Session session = Session();
AppFonts appFonts = AppFonts();
NavigationClass route = NavigationClass();
AppArray appArray = AppArray();
AppCss appCss = AppCss();
// AppTheme get appTheme => _appTheme;
// AppTheme _appTheme = AppTheme.fromType(ThemeType.light);

String language(context, text) {
  return AppLocalizations.of(context)!.translate(text);
}

// final themeBloc = ThemeServiceBloc(); // Obtain your ThemeBloc instance
// final appColor = themeBloc.appTheme; // Access the current AppTheme
// final isDark = themeBloc.isDarkMode; // Access the current AppTheme

AppTheme get appTheme => _appTheme;
AppTheme _appTheme = AppTheme.fromType(ThemeType.light);

ThemeServiceState themeState(BuildContext context) {
  return context.read<ThemeServiceBloc>().state;
}

AppTheme appColor(BuildContext context) {
  return themeState(context).appTheme;
}

bool isDark(BuildContext context) {
  return themeState(context).isDarkMode;
}

Color darkModeColor(
  BuildContext context, {
  Color? lightColor,
  Color? darkColor,
}) {
  if (isDark(context) == false) {
    return lightColor ?? appTheme.darkText;
  } else {
    return darkColor ?? appTheme.white;
  }
}

Future<bool> isNetworkConnection() async {
  var connectivityResult = await Connectivity()
      .checkConnectivity(); //Check For Wifi or Mobile data is ON/OFF
  // ignore: unrelated_type_equality_checks
  if (connectivityResult == ConnectivityResult.none) {
    return false;
  } else {
    final result = await InternetAddress.lookup(
      'google.com',
    ); //Check For Internet Connection
    if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
      return true;
    } else {
      return false;
    }
  }
}

extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this; // Return empty string if input is empty
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }

  String get safeTeamName => isEmpty ? 'Team' : capitalize();
}
