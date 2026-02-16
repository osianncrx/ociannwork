import '../../config.dart';

scaffoldMessage(context, title, {isRed = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      duration: Duration(milliseconds: 500),
      content: Text(
        title,
        style: appCss.dmSansMedium14.textColor(appColor(context).white),
      ),
      backgroundColor: isRed
          ? appColor(context).red
          : appColor(context).primary,
      behavior: SnackBarBehavior.floating,
    ),
  );
}
