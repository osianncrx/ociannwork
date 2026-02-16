// import 'dart:developer';
//
// import '../../../../config.dart';
//
// class NewPassScreen extends StatefulWidget {
//   const NewPassScreen({super.key});
//
//   @override
//   State<NewPassScreen> createState() => _NewPassScreenState();
// }
//
// class _NewPassScreenState extends Stat<NewPassScreen> {
//   final passController = TextEditingController();
//   final passFocus = FocusNode();
//
//   final confirmPassController = TextEditingController();
//   final confirmPassFocus = FocusNode();
//   String? email;
//
//   @override
//   void initState() {
//     super.initState();
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       final args = ModalRoute.of(context)?.settings.arguments;
//       if (args is String) {
//         email = args;
//         setState(() {});
//       }
//     });
//   }
//
//   @override
//   void dispose() {
//     passController.dispose();
//     passFocus.dispose();
//     super.dispose();
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     return BlocListener<AuthBloc, AuthState>(
//       listener: (context, state) {
//         if (state is AuthSuccess) {
//           Navigator.pushNamed(context, routeName.createTeamScreen);
//         } else if (state is AuthFailure) {
//           AppToast.showError(state.error);
//         }
//       },
//       child: Scaffold(
//         resizeToAvoidBottomInset: false,
//         body: Container(
//           decoration: BoxDecoration(
//             image: DecorationImage(
//               image: AssetImage(imageAssets.newPasswordBG),
//               alignment: Alignment.topCenter,
//             ),
//           ),
//           child: Column(
//             mainAxisAlignment: MainAxisAlignment.spaceBetween,
//             children: [
//               Spacer(flex: 4),
//               CommonCardContainer(
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Text(
//                       appFonts.setYourNewPassword,
//                       style: appCss.dmSansExtraBold18.textColor(
//                          appColor(context).darkText,
//                       ),
//                     ),
//
//                     Text(
//                       appFonts.enterAndConfirmYour,
//                       style: appCss.dmSansRegular14.textColor(
//                          appColor(context).lightText,
//                       ),
//                     ).paddingDirectional(top: Sizes.s3, bottom: Sizes.s20),
//
//                     Text(
//                       appFonts.newPassword,
//                       style: appCss.dmSansSemiBold14.textColor(
//                          appColor(context).darkText,
//                       ),
//                     ),
//
//                     buildPasswordField(
//                       controller: passController,
//                       focusNode: passFocus,
//                       title: appFonts.newPassword,
//                       fieldKey: "newPasswordFieldKey",
//                     ).paddingDirectional(top: Sizes.s8, bottom: Sizes.s18),
//
//                     Text(
//                       appFonts.confirmPassword,
//                       style: appCss.dmSansSemiBold14.textColor(
//                          appColor(context).darkText,
//                       ),
//                     ),
//                     VSpace(Sizes.s8),
//                     buildPasswordField(
//                       controller: confirmPassController,
//                       focusNode: confirmPassFocus,
//                       title: appFonts.confirmPassword,
//                       fieldKey: 'confirmPasswordFieldKey',
//                     ),
//                     VSpace(Sizes.s33),
//                     BlocBuilder<AuthBloc, AuthState>(
//                       buildWhen: (prev, curr) =>
//                           (prev is AuthLoading) != (curr is AuthLoading),
//                       builder: (context, state) {
//                         final isLoading = state is AuthLoading;
//                         return ButtonCommon(
//                           title: language(context, appFonts.submit),
//                           isLoading: isLoading,
//                           onTap: isLoading
//                               ? null
//                               : () {
//                                   HapticFeedback.mediumImpact();
//                                   log("email::${confirmPassController.text}");
//                                   if (confirmPassController.text.isNotEmpty &&
//                                       passController.text.isNotEmpty &&
//                                       confirmPassController.text ==
//                                           passController.text) {
//                                     context.read<AuthBloc>().add(
//                                       SubmitPressed(
//                                         confirmPassController.text,
//                                         passController.text,
//                                       ),
//                                     );
//                                   } else {
//                                     AppToast.showError(appFonts.pleaseEnterOtp);
//                                   }
//                                 },
//                         );
//                       },
//                     ),
//                   ],
//                 ),
//               ),
//               const Spacer(flex: 1),
//               buildFooter(),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }
