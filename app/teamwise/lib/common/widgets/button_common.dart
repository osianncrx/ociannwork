import 'package:figma_squircle/figma_squircle.dart';

import '../../config.dart';

class ButtonCommon extends StatelessWidget {
  final String? title;
  final double? hpadding, margin, radius, height, width, vpadding;
  final GestureTapCallback? onTap;
  final TextStyle? style;
  final Color? color, fontColor, borderColor;
  final Widget? icon;
  final Widget? widget;
  final FontWeight? fontWeight;
  final bool isLoading;

  const ButtonCommon({
    super.key,
    required this.title,
    this.hpadding,
    this.margin = 0,
    this.radius,
    this.height = 50,
    this.onTap,
    this.style,
    this.color,
    this.fontColor,
    this.icon,
    this.borderColor,
    this.width,
    this.fontWeight = FontWeight.w700,
    this.widget,
    this.isLoading = false,
    this.vpadding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width ?? MediaQuery.of(context).size.width,
      height: height,
      alignment: Alignment.center,
      padding: EdgeInsets.symmetric(horizontal: hpadding ?? Insets.i16),
      margin: EdgeInsets.symmetric(vertical: margin!),
      decoration: ShapeDecoration(
        color: color ?? appColor(context).primary,
        shape: SmoothRectangleBorder(
          side: BorderSide(color: borderColor ?? appColor(context).trans),
          borderRadius: SmoothBorderRadius(
            cornerRadius: radius ?? AppRadius.r30,
            cornerSmoothing: 1,
          ),
        ),
      ),
      child: isLoading
          ? Center(
              child: SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    fontColor ?? Colors.white,
                  ),
                ),
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: Text(
                    language(context, title ?? ''),
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style:
                        style ??
                        appCss.dmSansRegular16.textColor(
                          fontColor ?? appColor(context).commonButtonText,
                        ),
                  ),
                ),
                if (icon != null)
                  Row(
                    children: [icon ?? const HSpace(0), HSpace(Sizes.s10)],
                  ).paddingOnly(left: Insets.i8),
                if (widget != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [widget ?? const HSpace(0), HSpace(Sizes.s10)],
                  ).paddingOnly(left: Insets.i8),
              ],
            ),
    ).inkWell(onTap: onTap);
  }
}
