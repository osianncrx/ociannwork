import '../../../../config.dart';

extension Extensions on Widget {
  Widget boxDecoration(context) {
    return Container(child: this).decorated(
      borderRadius: BorderRadius.circular(Sizes.s8),
      color: appColor(context).primary,
      border: Border.all(color: appColor(context).primary),
      boxShadow: [
        BoxShadow(
          color: Color(0xff00000017).withValues(alpha: 0.9),
          blurRadius: 0.4,
          offset: Offset(0, 0.2),
          spreadRadius: -0.2,
        ),
      ],
    );
  }
}
