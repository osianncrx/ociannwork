import '../../../../config.dart';

class CommonCardContainer extends StatelessWidget {
  final Widget child;

  const CommonCardContainer({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: Sizes.s10),
      decoration: BoxDecoration(
        /*   color:  appColor(context).white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            blurRadius: 10,
            spreadRadius: .5,
            color: const Color(0x26000000),
          ),
        ], */
      ),
      alignment: Alignment.center,
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: Sizes.s15,
          vertical: Sizes.s20,
        ),
        child: child,
      ),
    );
  }
}
