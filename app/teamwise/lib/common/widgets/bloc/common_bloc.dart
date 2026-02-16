import '../../../config.dart';

part 'common_event.dart';
part 'common_state.dart';

class CommonBloc extends Bloc<CommonEvent, CommonState> {
  final FormFieldValidator<String>? validator;

  CommonBloc({this.validator}) : super(CommonState.initial()) {
    on<CommonTextChanged>(_onTextChanged);
    on<CommonFocusChanged>(_onFocusChanged);
  }

  void _onTextChanged(CommonTextChanged event, Emitter<CommonState> emit) {
    final error = validator?.call(event.text);
    emit(state.copyWith(text: event.text, error: error));
  }

  void _onFocusChanged(CommonFocusChanged event, Emitter<CommonState> emit) {
    emit(state.copyWith(isFocused: event.isFocused));
  }
}
