import '../../config.dart';

class AppToast {
  static void showError(
    String message, {

    Color? backgroundColor,
    Color? textColor,
  }) {
    Fluttertoast.showToast(
      msg: message,
      gravity: ToastGravity.SNACKBAR,
      backgroundColor:
          backgroundColor ?? Colors.red /*  appColor(context).red */,
      textColor: textColor ?? Colors.white,
      fontSize: Sizes.s15,
      toastLength: Toast.LENGTH_SHORT,
    );
  }

  static void showMessage(
    String message, {
    ToastGravity gravity = ToastGravity.BOTTOM,
    Color? backgroundColor,
    Color? textColor,
    double? fontSize,
  }) {
    Fluttertoast.showToast(
      msg: message,
      gravity: ToastGravity.SNACKBAR,
      backgroundColor: backgroundColor ?? Color(0xff5579F8),
      textColor: textColor ?? Colors.white,
      fontSize: Sizes.s15,
      toastLength: Toast.LENGTH_SHORT,
    );
  }

  static void showSuccess(
    String message, {
    Color? backgroundColor,
    Color? textColor,
  }) {
    Fluttertoast.showToast(
      msg: message,
      gravity: ToastGravity.SNACKBAR,
      backgroundColor: backgroundColor ?? Colors.green,
      textColor: textColor ?? Colors.white,
      fontSize: Sizes.s15,
      toastLength: Toast.LENGTH_SHORT,
    );
  }
}
