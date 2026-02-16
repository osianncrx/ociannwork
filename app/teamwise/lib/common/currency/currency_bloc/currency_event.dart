part of 'currency_bloc.dart';

abstract class CurrencyEvent {}

class LoadCurrencyEvent extends CurrencyEvent {}

class ChangeCurrencyEvent extends CurrencyEvent {
  final CurrencyModel currency;

  ChangeCurrencyEvent(this.currency);
}
