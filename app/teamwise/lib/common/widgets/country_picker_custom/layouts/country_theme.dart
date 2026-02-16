import '../../../../config.dart';

class CountryTheme {
  final String? searchText;
  final String? searchHintText;
  final String? lastPickText;
  final Color? alphabetSelectedBackgroundColor;
  final Color? alphabetSelectedTextColor;
  final Color? alphabetTextColor;
  final Color? labelColor;
  final bool isShowFlag;
  final bool isShowTitle;
  final bool isShowCode;
  final bool isDownIcon;
  final Insets? padding;

  CountryTheme({
    this.searchText,
    this.searchHintText,
    this.lastPickText,
    this.alphabetSelectedBackgroundColor,
    this.alphabetSelectedTextColor,
    this.alphabetTextColor,
    this.labelColor,
    this.isShowFlag = true,
    this.isShowTitle = true,
    this.isShowCode = true,
    this.isDownIcon = true,
    this.padding,
  });
}
