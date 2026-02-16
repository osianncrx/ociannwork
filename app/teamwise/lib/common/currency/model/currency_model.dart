class CurrencyModel {
  final int id;
  final String code;
  final String symbol;
  final String title;
  final double exchangeRate;

  CurrencyModel({
    required this.id,
    required this.code,
    required this.symbol,
    required this.title,
    required this.exchangeRate,
  });

  factory CurrencyModel.fromJson(Map<String, dynamic> json) {
    return CurrencyModel(
      id: json['id'],
      code: json['code'],
      symbol: json['symbol'],
      title: json['title'],
      exchangeRate: (json['exchange_rate'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'code': code,
    'symbol': symbol,
    'title': title,
    'exchange_rate': exchangeRate,
  };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CurrencyModel &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
