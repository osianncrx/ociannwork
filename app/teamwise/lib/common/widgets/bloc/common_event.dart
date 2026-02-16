part of 'common_bloc.dart';

@immutable
sealed class CommonEvent {}

// Event: text has changed
final class CommonTextChanged extends CommonEvent {
  final String text;
  CommonTextChanged(this.text);
}

// Event: focus state changed
final class CommonFocusChanged extends CommonEvent {
  final bool isFocused;
  CommonFocusChanged(this.isFocused);
}
