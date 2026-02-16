import '../../config.dart';

void showToast({bool isError = false, required String message, context}) {
  Fluttertoast.showToast(
    msg: message,
    toastLength: Toast.LENGTH_SHORT,
    gravity: ToastGravity.BOTTOM,
    timeInSecForIosWeb: 1,
    backgroundColor: isError
        ? appColor(context).red
        : appColor(context).primary,
    textColor: Colors.white,
    fontSize: 16.0,
  );
}
