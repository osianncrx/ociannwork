import '../../../../config.dart';

class AuthButtonCommon extends StatelessWidget {
  final String? logo, title;
  final GestureTapCallback? onTap;
  const AuthButtonCommon({super.key, this.onTap, this.title, this.logo});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
          width: MediaQuery.of(context).size.width,
          child: IntrinsicHeight(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(logo!, height: Sizes.s26, width: Sizes.s26),
                HSpace(Sizes.s10),
                Text(
                  language(context, title!),
                  overflow: TextOverflow.ellipsis,
                  style: appCss.dmSansMedium14.textColor(
                    appColor(context).darkText,
                  ),
                ),
              ],
            ).paddingAll(Insets.i10),
          ),
        )
        .decorated(
          color: appColor(context).fieldCardBg,
          borderRadius: BorderRadius.circular(AppRadius.r30),
          border: Border.all(color: appColor(context).textFiledBorder),
        )
        .inkWell(onTap: onTap);
  }
}
