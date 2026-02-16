import '../../../config.dart';

part 'currency_event.dart';
part 'currency_state.dart';

class CurrencyBloc extends HydratedBloc<CurrencyEvent, CurrencyState> {
  CurrencyBloc()
    : super(CurrencyState(availableCurrencies: [], selectedCurrency: null)) {
    on<LoadCurrencyEvent>(_onLoadCurrency);
    on<ChangeCurrencyEvent>(_onChangeCurrency);
  }

  void _onLoadCurrency(LoadCurrencyEvent event, Emitter<CurrencyState> emit) {
    final currencies = _getLocalCurrencyList();
    emit(
      state.copyWith(
        availableCurrencies: currencies,
        selectedCurrency:
            state.selectedCurrency != null &&
                currencies.any((c) => c == state.selectedCurrency)
            ? state.selectedCurrency
            : currencies.first,
      ),
    );
  }

  void _onChangeCurrency(
    ChangeCurrencyEvent event,
    Emitter<CurrencyState> emit,
  ) {
    emit(state.copyWith(selectedCurrency: event.currency));
  }

  List<CurrencyModel> _getLocalCurrencyList() {
    return [
      CurrencyModel(
        id: 1,
        code: "USD",
        symbol: "\$",
        title: "US Dollar",
        exchangeRate: 1.0,
      ),
      CurrencyModel(
        id: 2,
        code: "INR",
        symbol: "₹",
        title: "INR",
        exchangeRate: 83.24,
      ),
      CurrencyModel(
        id: 3,
        code: "GBP",
        symbol: "£",
        title: "Pound",
        exchangeRate: 100.0,
      ),
      CurrencyModel(
        id: 4,
        code: "EUR",
        symbol: "€",
        title: "Euro",
        exchangeRate: 0.01,
      ),
    ];
  }

  @override
  CurrencyState? fromJson(Map<String, dynamic> json) {
    try {
      final selected = CurrencyModel.fromJson(json['selected']);
      return state.copyWith(selectedCurrency: selected);
    } catch (_) {
      return null;
    }
  }

  @override
  Map<String, dynamic>? toJson(CurrencyState state) {
    if (state.selectedCurrency == null) return null;
    return {'selected': state.selectedCurrency!.toJson()};
  }
}
