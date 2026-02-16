// abstract class ThemeEvent {}

// class LoadThemeEvent extends ThemeEvent {}

// class ToggleThemeEvent extends ThemeEvent {}
import 'package:equatable/equatable.dart';
import 'package:teamwise/config.dart';

abstract class ThemeServiceEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class ToggleThemeEvent extends ThemeServiceEvent {}

class SetThemeModeEvent extends ThemeServiceEvent {
  late final ThemeMode themeMode;
  SetThemeModeEvent(this.themeMode);
  @override
  List<Object?> get props => [themeMode];
}
