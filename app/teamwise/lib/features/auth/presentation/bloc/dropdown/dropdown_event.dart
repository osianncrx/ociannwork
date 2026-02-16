import 'package:equatable/equatable.dart';

abstract class DropdownEvent extends Equatable {
  const DropdownEvent();

  @override
  List<Object> get props => [];
}

class LoadDropdownItems extends DropdownEvent {
  final String dropdownId;
  final List<String> items;

  const LoadDropdownItems(this.dropdownId, this.items);

  @override
  List<Object> get props => [dropdownId, items];
}

class SelectValue extends DropdownEvent {
  final String dropdownId;
  final String value;

  const SelectValue(this.dropdownId, this.value);

  @override
  List<Object> get props => [dropdownId, value];
}
