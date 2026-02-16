import 'package:teamwise/config.dart';

class DropdownBloc extends Bloc<DropdownEvent, DropdownState> {
  final customDetails = appArray.customDetails;

  DropdownBloc(Object object) : super(DropdownInitial()) {
    on<LoadDropdownItems>(_onLoadDropdownItems);
    on<SelectValue>(_onSelectValue);

    // Initialize with customDetails data
    if (customDetails.isNotEmpty) {
      final details = customDetails.first;
      details.forEach((key, value) {
        add(
          LoadDropdownItems(key, ['Select a Value', ...value.cast<String>()]),
        );
      });
    }
  }

  void _onLoadDropdownItems(
    LoadDropdownItems event,
    Emitter<DropdownState> emit,
  ) {
    emit(DropdownLoading());
    try {
      final currentState = state;

      final newSelectedValues = currentState is DropdownLoaded
          ? Map<String, String>.from(currentState.selectedValues as Map)
          : <String, String>{};

      final newItems = currentState is DropdownLoaded
          ? Map<String, List<String>>.from(currentState.items as Map)
          : <String, List<String>>{};

      newItems[event.dropdownId] = event.items;

      // Default value setup
      newSelectedValues[event.dropdownId] ??= 'Select a Value';

      emit(DropdownLoaded(newSelectedValues, newItems));
    } catch (e) {
      emit(DropdownError('Failed to load items: $e'));
    }
  }

  void _onSelectValue(SelectValue event, Emitter<DropdownState> emit) {
    final currentState = state;
    if (currentState is DropdownLoaded) {
      final newSelectedValues = Map<String, String>.from(
        currentState.selectedValues,
      );
      newSelectedValues[event.dropdownId] = event.value;
      emit(DropdownLoaded(newSelectedValues, currentState.items));
    }
  }
}
