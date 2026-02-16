// import 'dart:developer';

// import '../../../../config.dart';

// class LoginScreen extends StatefulWidget {
//   const LoginScreen({super.key});
//   @override
//   State<LoginScreen> createState() => _LoginScreenState();
// }

// class _LoginScreenState extends State<LoginScreen> {
//   final emailController = TextEditingController();
//   final emailFocus = FocusNode();

//   @override
//   void initState() {
//     super.initState();
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       final args = ModalRoute.of(context)?.settings.arguments;
//       final email = args is String ? args : '';
//       if (email.isNotEmpty) emailController.text = email;
//     });
//   }

//   @override
//   void dispose() {
//     emailController.dispose();
//     emailFocus.dispose();
//     super.dispose();
//   }

//   @override
//   Widget build(BuildContext context) {
//     return BlocConsumer<AuthBloc, AuthState>(
//       listener: (context, state) {
//         if (state is EmailCheckSuccess) {
//           context.read<AuthBloc>().add(
//             StoreEmailEvent(emailController.text.trim()),
//           );

//           log(
//             "state.emailVerified::${state.emailVerified}//// state.isProfileUpdated::${state.isProfileUpdated}",
//           );
//           if (!state.emailVerified && !state.isProfileUpdated) {
//             context.read<AuthBloc>().add(
//               StoreEmailEvent(emailController.text.trim()),
//             );

//             Navigator.pushNamed(
//               context,
//               routeName.otpScreen,
//               arguments: {
//                 'email': emailController.text.trim(),
//                 'fromForgot': false,
//               },
//             );
//           } else if (state.emailVerified && !state.isProfileUpdated) {
//             Navigator.pushReplacementNamed(
//               context,
//               routeName.otpScreen,
//               arguments: {
//                 'email': emailController.text.trim(),
//                 'fromForgot': false,
//               },
//             );
//           } else if (state.userExists &&
//               state.emailVerified &&
//               state.isProfileUpdated) {
//             Navigator.pushReplacementNamed(
//               context,
//               routeName.passwordScreen,
//               arguments: emailController.text.trim(),
//             );
//           } else {
//             AppToast.showError("Incomplete profile or verification pending.");
//           }
//         } else if (state is AuthFailure) {
//           AppToast.showError(state.error);
//         }
//       },
//       builder: (context, state) {
//         // We'll build the static UI here except the button below
//         return Scaffold(
//           resizeToAvoidBottomInset: false,
//           body: Container(
//             height: double.infinity,
//             width: double.infinity,
//             decoration: BoxDecoration(
//               gradient: LinearGradient(
//                 begin: Alignment.topCenter,
//                 end: Alignment.bottomCenter,
//                 colors: [
//                    appColor(context).commonBgColor,
//                   /*   Color(0XFFD8E0FF /* 172146  */ /* D8E0FF */) /* overlayColor72 */, */
//                   // Top purple shade
//                    appColor(context).white, // Bottom
//                 ],
//               ),
//             ),
//             child: SafeArea(
//               child: Column(
//                 // mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                 children: [
//                   Stack(
//                     alignment: AlignmentGeometry.topCenter,
//                     children: [
//                       Container(
//                         width: Sizes.s300,
//                         height: Sizes.s470,
//                         decoration: BoxDecoration(
//                           image: DecorationImage(
//                             image: AssetImage(imageAssets.loginBg),
//                             alignment: Alignment.topCenter,
//                           ),
//                         ),
//                       ),
//                       Column(
//                         children: [
//                           CommonCardContainer(
//                             child: Column(
//                               crossAxisAlignment: CrossAxisAlignment.start,
//                               children: [
//                                 Text(
//                                   appFonts.getStartWith,
//                                   style: appCss.dmSansExtraBold18.textColor(
//                                      appColor(context).darkText,
//                                   ),
//                                 ),
//                                 VSpace(Sizes.s3),
//                                 Text(
//                                   appFonts.useYourPersonal,
//                                   style: appCss.dmSansRegular14.textColor(
//                                      appColor(context).darkText,
//                                   ),
//                                 ),
//                                 SizedBox(height: Sizes.s10),
//                                 Text(
//                                   appFonts.emailAddress,
//                                   style: appCss.dmSansSemiBold14.textColor(
//                                      appColor(context).darkText,
//                                   ),
//                                 ).paddingDirectional(
//                                   top: Sizes.s20,
//                                   bottom: Sizes.s8,
//                                 ),
//                                 TextFieldCommon(
//                                   validator: (email) => Validation()
//                                       .emailValidation(context, email),
//                                   controller: emailController,
//                                   hintText: language(
//                                     context,
//                                     appFonts.enterEmail,
//                                   ),
//                                   keyboardType: TextInputType.emailAddress,
//                                   focusNode: emailFocus,
//                                   prefixIcon: svgAssets.email,
//                                 ),
//                                 VSpace(Sizes.s16),

//                                 // Here only the button listens and rebuilds on loading changes
//                                 BlocBuilder<AuthBloc, AuthState>(
//                                   buildWhen: (previous, current) {
//                                     return (previous is! AuthLoading &&
//                                             current is AuthLoading) ||
//                                         (previous is AuthLoading &&
//                                             current is! AuthLoading);
//                                   },
//                                   builder: (context, state) {
//                                     final isLoading = state is AuthLoading;
//                                     return ButtonCommon(
//                                       title: appFonts.login,
//                                       isLoading: isLoading,
//                                       onTap: isLoading
//                                           ? null
//                                           : () {
//                                               HapticFeedback.mediumImpact();
//                                               final email =
//                                                   emailController.text;
//                                               if (email.isEmpty) {
//                                                 AppToast.showError(
//                                                   language(
//                                                     context,
//                                                     appFonts.enterEmail,
//                                                   ),
//                                                 );
//                                               } else {
//                                                 context.read<AuthBloc>().add(
//                                                   CheckEmailEvent(email),
//                                                 );
//                                               }
//                                             },
//                                     );
//                                   },
//                                 ),

//                                 VSpace(Sizes.s25),
//                                 AuthButtonCommon(
//                                   title: appFonts.google,
//                                   logo: imageAssets.google,
//                                   onTap: () {
//                                     HapticFeedback.mediumImpact();
//                                     context.read<AuthBloc>().add(
//                                       GoogleSignInPressed(),
//                                     );
//                                   },
//                                 ),
//                                 VSpace(Sizes.s14),
//                                 AuthButtonCommon(
//                                   title: appFonts.apple,
//                                   logo: imageAssets.apple,
//                                   onTap: () {
//                                     HapticFeedback.mediumImpact();
//                                     context.read<AuthBloc>().add(
//                                       AppleSignInPressed(),
//                                     );
//                                   },
//                                 ),
//                               ],
//                             ),
//                           ),
//                           VSpace(Sizes.s60),
//                           buildFooter(),
//                         ],
//                       ).padding(top: Sizes.s250),
//                     ],
//                   ),

//                   /*  SizedBox(height: Sizes.s140), */
//                   /*   buildFooter(), */
//                 ],
//               ),
//             ),
//           ),
//         );
//       },
//     );
//   }
// }

import 'dart:developer';
import 'dart:ui';
import 'package:teamwise/features/auth/data/datasources/auth_api.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController();
  final emailFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      final email = args is String ? args : '';
      if (email.isNotEmpty) emailController.text = email;
    });
    AuthApi(serviceLocator<ApiManager>()).settingsApi();
  }

  // Future<void> copyCredentials() async {
  //   if (_selectedMessage == null) return;
  //   log(
  //     '🔄 Opening forward screen for message: ${_selectedMessage!.plainTextContent}',
  //   );
  //   Clipboard.setData(ClipboardData(text: _selectedMessage!.plainTextContent));
  //   setState(() {
  //     _selectedMessage = null;
  //     isLongPress = false;
  //   });
  // }

  @override
  void dispose() {
    emailController.dispose();
    emailFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is EmailCheckSuccess) {
          context.read<AuthBloc>().add(
            StoreEmailEvent(emailController.text.trim()),
          );
          if (!state.emailVerified && !state.isProfileUpdated) {
            Navigator.pushNamed(
              context,
              routeName.otpScreen,
              arguments: {
                'email': emailController.text.trim(),
                'fromForgot': false,
              },
            );
          } else if (state.emailVerified && !state.isProfileUpdated) {
            Navigator.pushReplacementNamed(
              context,
              routeName.otpScreen,
              arguments: {
                'email': emailController.text.trim(),
                'fromForgot': false,
              },
            );
          } else if (state.userExists &&
              state.emailVerified &&
              state.isProfileUpdated) {
            Navigator.pushReplacementNamed(
              context,
              routeName.passwordScreen,
              arguments: emailController.text.trim(),
            );
          } else {
            AppToast.showError(
              "Incomplete profile or verification pending.",
              /*  context: context, */
            );
          }
        } else if (state is AuthFailure) {
          AppToast.showError(state.error /* context: context */);
        }
      },
      builder: (context, state) {
        return Scaffold(
          resizeToAvoidBottomInset: true,
          body: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  appColor(context).commonBgColor,
                  appColor(context).white,
                ],
              ),
            ),
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  /*   horizontal: 16, */
                  vertical: 24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.topCenter,
                      children: [
                        Container(
                          width: Sizes.s300,
                          height: Sizes.s470,
                          decoration: BoxDecoration(
                            image: DecorationImage(
                              image: AssetImage(imageAssets.loginBg),
                              alignment: Alignment.topCenter,
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 250),
                          child: Column(
                            children: [
                              CommonCardContainer(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      appFonts.getStartWith,
                                      style: appCss.dmSansExtraBold18.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ),
                                    VSpace(Sizes.s3),
                                    Text(
                                      appFonts.useYourPersonal,
                                      style: appCss.dmSansRegular14.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ),
                                    SizedBox(height: Sizes.s10),
                                    Text(
                                      appFonts.emailAddress,
                                      style: appCss.dmSansSemiBold14.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ).paddingDirectional(
                                      top: Sizes.s20,
                                      bottom: Sizes.s8,
                                    ),
                                    Theme.of(context).brightness ==
                                            Brightness.dark
                                        ? GlassTextFieldCommon(
                                            validator: (email) =>
                                                Validation().emailValidation(
                                                  context,
                                                  email,
                                                ),
                                            controller: emailController,
                                            hintText: language(
                                              context,
                                              appFonts.enterEmail,
                                            ),
                                            keyboardType:
                                                TextInputType.emailAddress,
                                            focusNode: emailFocus,
                                            prefixIcon: svgAssets.email,
                                            maxLines: 1,
                                          )
                                        : TextFieldCommon(
                                            validator: (email) =>
                                                Validation().emailValidation(
                                                  context,
                                                  email,
                                                ),
                                            controller: emailController,
                                            hintText: language(
                                              context,
                                              appFonts.enterEmail,
                                            ),
                                            keyboardType:
                                                TextInputType.emailAddress,
                                            focusNode: emailFocus,
                                            prefixIcon: svgAssets.email,
                                            maxLines: 1,
                                          ),

                                    VSpace(Sizes.s16),
                                    BlocBuilder<AuthBloc, AuthState>(
                                      buildWhen: (previous, current) =>
                                          (previous is! AuthLoading &&
                                              current is AuthLoading) ||
                                          (previous is AuthLoading &&
                                              current is! AuthLoading),
                                      builder: (context, state) {
                                        final isLoading = state is AuthLoading;
                                        return ButtonCommon(
                                          title: appFonts.login,
                                          isLoading: isLoading,
                                          onTap: isLoading
                                              ? null
                                              : () {
                                                  HapticFeedback.mediumImpact();
                                                  final email =
                                                      emailController.text;
                                                  if (email.isEmpty) {
                                                    AppToast.showError(
                                                      language(
                                                        context,
                                                        appFonts.enterEmail,
                                                      ),
                                                    );
                                                  } else {
                                                    context
                                                        .read<AuthBloc>()
                                                        .add(
                                                          CheckEmailEvent(
                                                            email,
                                                          ),
                                                        );
                                                  }
                                                },
                                        );
                                      },
                                    ),
                                    VSpace(Sizes.s20),

                                    // AuthButtonCommon(
                                    //   title: appFonts.google,
                                    //   logo: imageAssets.google,
                                    //   onTap: () {
                                    //     HapticFeedback.mediumImpact();
                                    //     context.read<AuthBloc>().add(
                                    //       GoogleSignInPressed(),
                                    //     );
                                    //   },
                                    // ),
                                    // VSpace(Sizes.s14),
                                    // AuthButtonCommon(
                                    //   title: appFonts.apple,
                                    //   logo: imageAssets.apple,
                                    //   onTap: () {
                                    //     HapticFeedback.mediumImpact();
                                    //     context.read<AuthBloc>().add(
                                    //       AppleSignInPressed(),
                                    //     );
                                    //   },
                                    // ),
                                    Center(
                                      child: Text(
                                        appFonts.demoCredential,
                                        style: appCss.dmSansMedium12.textColor(
                                          appColor(context).lightText,
                                        ),
                                      ),
                                    ),
                                    Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.start,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        InkWell(
                                          onTap: () {
                                            HapticFeedback.lightImpact();
                                            emailController.text =
                                                appFonts.demoCred1; // set email
                                          },
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            crossAxisAlignment: .center,
                                            children: [
                                              Text(
                                                appFonts.demoCred1,
                                                style: appCss.dmSansMedium12
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).darkText,
                                                    ),
                                              ).padding(bottom: Sizes.s5),
                                              SvgPicture.asset(
                                                svgAssets.copyIcon,
                                                width: 18,
                                                colorFilter: ColorFilter.mode(
                                                  appColor(
                                                    context,
                                                  ).primary, // your desired color
                                                  BlendMode.srcIn,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Divider(
                                          color: appColor(context).dividerColor,
                                        ),
                                        InkWell(
                                          onTap: () {
                                            HapticFeedback.lightImpact();
                                            emailController.text =
                                                appFonts.demoCred2; // set email
                                          },
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            crossAxisAlignment: .center,
                                            children: [
                                              Text(
                                                appFonts.demoCred2,
                                                style: appCss.dmSansMedium12
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).darkText,
                                                    ),
                                              ).padding(bottom: Sizes.s5),
                                              SvgPicture.asset(
                                                svgAssets.copyIcon,
                                                width: 18,
                                                colorFilter: ColorFilter.mode(
                                                  appColor(
                                                    context,
                                                  ).primary, // your desired color
                                                  BlendMode.srcIn,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ).padding(vertical: Sizes.s10),
                                  ],
                                ),
                              ),
                              VSpace(Sizes.s40),
                              buildFooter(context),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
