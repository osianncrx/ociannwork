part of 'common_bloc.dart';

@immutable
class CommonState {
  final String text;
  final bool isFocused;
  final String? error;

  const CommonState({required this.text, required this.isFocused, this.error});

  factory CommonState.initial() =>
      const CommonState(text: '', isFocused: false);

  CommonState copyWith({String? text, bool? isFocused, String? error}) =>
      CommonState(
        text: text ?? this.text,
        isFocused: isFocused ?? this.isFocused,
        error: error,
      );
}
