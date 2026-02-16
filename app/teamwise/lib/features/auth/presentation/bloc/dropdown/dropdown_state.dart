import 'package:equatable/equatable.dart';

abstract class DropdownState extends Equatable {
  const DropdownState();

  @override
  List<Object> get props => [];
}

class DropdownInitial extends DropdownState {}

class DropdownLoading extends DropdownState {}

class DropdownLoaded extends DropdownState {
  final Map<String, String> selectedValues;
  final Map<String, List<String>> items;

  const DropdownLoaded(this.selectedValues, this.items);

  @override
  List<Object> get props => [selectedValues, items];
}

class DropdownError extends DropdownState {
  final String message;

  const DropdownError(this.message);

  @override
  List<Object> get props => [message];
}
