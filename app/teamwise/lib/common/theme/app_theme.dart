import 'package:flutter/material.dart';

enum ThemeType { light, dark }

class AppTheme {
  static ThemeType defaultTheme = ThemeType.light;

  //Theme Colors

  bool isDark;
  Color primary;
  Color secPrimary;
  Color darkText;
  Color lightText;
  Color screenBg;
  Color bgColor;
  Color textFiledBorder;
  Color fieldCardBg;
  Color trans;
  Color gradient;
  Color white;
  Color gray;
  Color red;
  Color green;
  Color yellow;
  Color overlyColor;
  Color menuButtonColor;
  Color drawerHeaderColor;
  Color black;
  Color profileBorder;
  Color dividerColor;
  Color radioGrayColor;
  Color lightBGColor;
  Color chartGreen;
  Color barChartLight;
  Color cameraBgColor;
  Color textFieldFillColor;
  Color commonBgColor;
  Color commonButtonText;

  /// Default constructor
  AppTheme({
    required this.isDark,
    required this.primary,
    required this.secPrimary,
    required this.darkText,
    required this.lightText,
    required this.textFieldFillColor,
    required this.screenBg,
    required this.bgColor,
    required this.textFiledBorder,
    required this.fieldCardBg,
    required this.trans,
    required this.gradient,
    required this.white,
    required this.gray,
    required this.red,
    required this.green,
    required this.yellow,
    required this.overlyColor,
    required this.menuButtonColor,
    required this.drawerHeaderColor,
    required this.black,
    required this.profileBorder,
    required this.dividerColor,
    required this.radioGrayColor,
    required this.lightBGColor,
    required this.chartGreen,
    required this.barChartLight,
    required this.cameraBgColor,
    required this.commonBgColor,
    required this.commonButtonText,
  });

  /// fromType factory constructor
  factory AppTheme.fromType(ThemeType t) {
    switch (t) {
      case ThemeType.light:
        return AppTheme(
          isDark: false,
          gradient: const Color(0xFF913AFF),
          primary: const Color(0xff5579F8 /* 004567 */),
          secPrimary: const Color(0xFF003955),
          darkText: const Color(0xff17161B),
          lightText: const Color(0xffA3A3A3),
          textFieldFillColor: const Color(0xffFAFAFA),
          screenBg: const Color(0xffFFFFFF),
          textFiledBorder: const Color(0xffEEEEEE),
          fieldCardBg: const Color(0xffFAFAFA /* F5F6F7 */),
          trans: Colors.transparent,
          white: const Color(0xFFFFFFFF),
          gray: Colors.grey,
          red: Colors.red,
          green: Colors.green,
          overlyColor: const Color(0xFFD9D9D9),
          bgColor: const Color(0xFFFFFFFF),
          menuButtonColor: Colors.white,
          drawerHeaderColor: const Color(0xFF000000),
          black: const Color(0xff17161B),
          profileBorder: const Color(0xFFE6E7EC),
          dividerColor: const Color(0xFFE3E3E3),
          radioGrayColor: const Color.fromRGBO(159, 168, 190, 0.2),
          yellow: const Color(0xffFFC700),
          chartGreen: const Color.fromRGBO(17, 166, 121, 1),
          lightBGColor: const Color(0XFF000000),
          barChartLight: const Color(0xFFE2E5EB),
          cameraBgColor: const Color.fromRGBO(245, 246, 248, 1),
          commonBgColor: const Color(0XFFD8E0FF),
          commonButtonText: const Color(0XFFFFFFFF),
        );

      case ThemeType.dark:
        return AppTheme(
          isDark: true,
          gradient: const Color(0xFF913AFF),
          primary: const Color(0xff5579F8 /* 0xff004567 */),
          secPrimary: const Color(0xFF003955),
          darkText: const Color(0xffFFFFFF),
          lightText: const Color(0xffA3A3A3),
          screenBg: const Color(0xFF17161B),
          fieldCardBg: const Color(0xff262935),
          trans: Colors.transparent,
          white: const Color(0xFF191B1F /* FFFFFF */),
          gray: Colors.grey,
          red: Colors.red,
          textFiledBorder: const Color(0xffEEEEEE),
          green: Colors.green,
          overlyColor: const Color(0xFFD9D9D9),
          bgColor: const Color(0xff17161B),
          menuButtonColor: const Color(0xFF26252D),
          textFieldFillColor: const Color(0xffFAFAFA),
          drawerHeaderColor: const Color(0xFFFFFFFF),
          black: const Color(0xffFFFFFF),
          profileBorder: const Color(0xFFE6E7EC),
          dividerColor: const Color(0xFFE3E3E3),
          radioGrayColor: const Color.fromRGBO(159, 168, 190, 0.2),
          yellow: const Color(0xffFFC700),
          chartGreen: const Color.fromRGBO(17, 166, 121, 1),
          lightBGColor: const Color(0XFF000000),
          barChartLight: const Color(0xFFE2E5EB),
          cameraBgColor: const Color(0xFF26252D),
          commonBgColor: const Color(0XFF172146),
          commonButtonText: const Color(0XFFFFFFFF),
        );
    }
  }

  ThemeData get themeData {
    var t = ThemeData.from(
      textTheme: (isDark ? ThemeData.dark() : ThemeData.light()).textTheme,
      useMaterial3: true,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: primary,
        secondary: primary,
        surface: screenBg,
        onSurface: screenBg,
        onError: Colors.red,
        onPrimary: primary,
        tertiary: screenBg,
        onInverseSurface: screenBg,
        tertiaryContainer: screenBg,
        surfaceTint: screenBg,
        surfaceContainerHighest: screenBg,
        onSecondary: primary,
        error: Colors.red,
      ),
    );
    return t.copyWith(
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      textSelectionTheme: TextSelectionThemeData(
        selectionHandleColor: Colors.transparent,
        cursorColor: primary,
      ),
      buttonTheme: ButtonThemeData(buttonColor: primary),
      highlightColor: primary,
    );
  }
}
