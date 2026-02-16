import 'package:flutter/material.dart';

import '../utils/connectivity_check.dart';

extension Alerts on BuildContext {
  Future<void> showAlertDialog({
    required String message,
    String? title,
    TextButton? positiveButton,
    TextButton? negativeButton,
  }) async {
    await showDialog(
      context: this,
      builder: (_) => AlertDialog(
        title: title != null ? Text(title) : null,
        content: Text(message),
        actions: negativeButton != null || positiveButton != null
            ? <Widget>[
                negativeButton ?? Container(),
                positiveButton ?? Container(),
              ]
            : null,
      ),
    );
  }
}
extension StringCasingExtension on String {
  String capitalizeFirst() {
    if (isEmpty) return this;
    return this[0].toUpperCase() + substring(1);
  }
}
extension StringTitleCase on String {
  String toTitleCase() {
    if (trim().isEmpty) return this;
    return split(" ")
        .map((word) => word.isEmpty
        ? word
        : word[0].toUpperCase() + word.substring(1).toLowerCase())
        .join(" ");
  }
}



extension SnackbarMessage on BuildContext {
  void showSnackBar({required String message, Color? color}) {
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color),
    );
  }
}
