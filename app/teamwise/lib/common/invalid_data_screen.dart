import '../config.dart';

class InvalidDataScreen extends StatefulWidget {
  const InvalidDataScreen({super.key});

  @override
  State<InvalidDataScreen> createState() => _InvalidDataScreenState();
}

class _InvalidDataScreenState extends State<InvalidDataScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: appColor(context).commonBgColor,
      body: Column(
        crossAxisAlignment: .center,
        mainAxisAlignment: .spaceBetween,
        children: [
          Container(),
          Image.asset('assets/image/teamwiselogo.png').center(),
          Column(
            children: [
              Text(
                "Unable to connect to server.",
                style: appCss.dmSansSemiBold15.textColor(
                  appColor(context).darkText,
                ),
              ),
              VSpace(Sizes.s4),
              Text("Something seems to be wrong please login again." ,textAlign: TextAlign.center , style: appCss.dmSansMedium14.textColor(
              appColor(context).darkText,
    ),).width(Sizes.s280)
            ],
          ).paddingDirectional(bottom: Sizes.s40),
        ],
      ),
    );
  }
}
