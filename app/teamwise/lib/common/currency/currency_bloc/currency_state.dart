part of 'currency_bloc.dart';

class CurrencyState {
  final List<CurrencyModel> availableCurrencies;
  final CurrencyModel? selectedCurrency;

  const CurrencyState({
    required this.availableCurrencies,
    this.selectedCurrency,
  });

  CurrencyState copyWith({
    List<CurrencyModel>? availableCurrencies,
    CurrencyModel? selectedCurrency,
  }) {
    return CurrencyState(
      availableCurrencies: availableCurrencies ?? this.availableCurrencies,
      selectedCurrency: selectedCurrency ?? this.selectedCurrency,
    );
  }
}
