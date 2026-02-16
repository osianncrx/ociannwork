// import 'dart:developer';

// import '../../../../config.dart';

// class PasswordScreen extends StatefulWidget {
//   const PasswordScreen({super.key});
//   @override
//   State<PasswordScreen> createState() => _PasswordScreenState();
// }

// class _PasswordScreenState extends State<PasswordScreen> {
//   final passController = TextEditingController();
//   final passFocus = FocusNode();
//   String? email;

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

//   @override
//   void dispose() {
//     passController.dispose();
//     passFocus.dispose();
//     super.dispose();
//   }

//   @override
//   Widget build(BuildContext context) {
//     return BlocListener<AuthBloc, AuthState>(
//       listener: (context, state) {
//         final authBloc = context.read<AuthBloc>();

//         if (state is AuthSuccess) {
//           if (state.token != null && email != null) {
//             authBloc.add(FetchTeams(email: email!, term: ''));
//           }
//         } else if (state is TeamListLoaded) {
//           final joinedTeams = state.teams
//               .where((team) => team.status.toLowerCase() == 'joined')
//               .toList();

//           if (joinedTeams.isNotEmpty) {
//             Navigator.pushNamedAndRemoveUntil(
//               context,
//               routeName.welcomeTeamwiseScreen,
//                   (route) => false,
//               arguments: joinedTeams, // pass teams to welcome page
//             );
//           } else {
//             Navigator.pushNamedAndRemoveUntil(
//               context,
//               routeName.inviteTeamScreen,
//                   (route) => false,
//             );
//           }
//         } else if (state is TeamListFailure) {
//           Navigator.pushNamedAndRemoveUntil(
//             context,
//             routeName.inviteTeamScreen,
//                 (route) => false,
//           );
//         } else if (state is AuthFailure) {
//           AppToast.showError(state.error);
//         }
//       },

//       child: Scaffold(
//         resizeToAvoidBottomInset: false,
//         body: Container(
//           height: double.infinity,
//           width: double.infinity,
//           decoration: BoxDecoration(
//             gradient: LinearGradient(
//               begin: Alignment.topCenter,
//               end: Alignment.bottomCenter,
//               colors: [
//                  appColor(context).commonBgColor,
//                 // Top purple shade
//                  appColor(context).white, // Bottom
//               ],
//             ),
//           ),
//           /*  decoration: BoxDecoration(
//             image: DecorationImage(
//               image: AssetImage(imageAssets.loginBG),
//               alignment: Alignment.topCenter,
//             ),
//           ), */
//           child: SafeArea(
//             child: Column(
//               mainAxisAlignment: MainAxisAlignment.spaceBetween,
//               children: [
//                 /*   Spacer(flex: 3), */
//                 Stack(
//                   alignment: AlignmentGeometry.topCenter,
//                   children: [
//                     Container(
//                       width: Sizes.s300,
//                       height: Sizes.s470,
//                       decoration: BoxDecoration(
//                         image: DecorationImage(
//                           image: AssetImage(imageAssets.loginBg),
//                           alignment: Alignment.topCenter,
//                         ),
//                       ),
//                     ),
//                     /* Spacer(flex: 3), */
//                     Column(
//                       children: [
//                         CommonCardContainer(
//                           child: Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               Text(
//                                 appFonts.enterPass,
//                                 style: appCss.dmSansExtraBold18.textColor(
//                                    appColor(context).darkText,
//                                 ),
//                               ),
//                               VSpace(Sizes.s8),
//                               if (email != null)
//                                 Row(
//                                   children: [
//                                     Text(
//                                       email!,
//                                       style: appCss.dmSansRegular14.textColor(
//                                          appColor(context).darkText,
//                                       ),
//                                     ),
//                                     HSpace(Sizes.s3),
//                                     Text(
//                                       language(context, appFonts.edit),
//                                       style: appCss.dmSansSemiBold14.textColor(
//                                          appColor(context).primary,
//                                       ),
//                                     ).inkWell(
//                                       onTap: () {
//                                         passFocus.unfocus();
//                                         Navigator.pushReplacementNamed(
//                                           context,
//                                           routeName.login,
//                                           arguments: email,
//                                         ).then((value) {
//                                           if (value is String) {
//                                             email = value;
//                                             setState(() {});
//                                           }
//                                         });
//                                       },
//                                     ),
//                                   ],
//                                 ),
//                               VSpace(Sizes.s16),
//                               Text(
//                                 appFonts.password,
//                                 style: appCss.dmSansSemiBold14.textColor(
//                                    appColor(context).darkText,
//                                 ),
//                               ),
//                               VSpace(Sizes.s8),
//                               buildPasswordField(
//                                 controller: passController,
//                                 focusNode: passFocus,
//                                 fieldKey: "password",
//                               ),
//                               VSpace(Sizes.s10),
//                               buildRememberAndForgot(context, email),
//                               VSpace(Sizes.s33),
//                               buildLoginButton(
//                                 passController: passController,
//                                 email: email,
//                               ),
//                             ],
//                           ),
//                         ),
//                       ],
//                     ).padding(top: Sizes.s250),
//                   ],
//                 ),
//                 const Spacer(flex: 1),
//                 buildFooter(),
//                 VSpace(Sizes.s20),
//               ],
//             ),
//           ),
//         ),
//       ),
//     );
//   }
// }

import 'dart:developer';
import '../../../../config.dart';

class PasswordScreen extends StatefulWidget {
  const PasswordScreen({super.key});
  @override
  State<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends State<PasswordScreen> {
  final passController = TextEditingController();
  final passFocus = FocusNode();
  String? email;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is String) {
        email = args;
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    passController.dispose();
    passFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        final authBloc = context.read<AuthBloc>();
        if (state is AuthSuccess) {
          if (state.token != null && email != null) {
            authBloc.add(FetchTeams(email: email!, term: ''));
          }
        } else if (state is TeamListLoaded) {
          final joinedTeams = state.teams
              .where((team) => team.status.toLowerCase() == 'joined')
              .toList();

          if (joinedTeams.isNotEmpty) {
            Navigator.pushNamedAndRemoveUntil(
              context,
              routeName.welcomeTeamwiseScreen,
              (route) => false,
              arguments: joinedTeams,
            );
          } else {
            Navigator.pushNamedAndRemoveUntil(
              context,
              routeName.inviteTeamScreen,
              (route) => false,
            );
          }
        } else if (state is TeamListFailure) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            routeName.inviteTeamScreen,
            (route) => false,
          );
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },
      child: Scaffold(
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
              padding: EdgeInsets.only(
                /*   left: Sizes.s16,
                right: Sizes.s16, */
                top: Sizes.s24,
                bottom: /*  MediaQuery.of(context).viewInsets.bottom + */
                    Sizes.s24,
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
                        padding: EdgeInsets.only(top: Sizes.s250),
                        child: CommonCardContainer(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                appFonts.enterPass,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s8),
                              if (email != null)
                                Row(
                                  children: [
                                    Text(
                                      email!,
                                      style: appCss.dmSansRegular14.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ),
                                    HSpace(Sizes.s3),
                                    Text(
                                      language(context, appFonts.edit),
                                      style: appCss.dmSansSemiBold14.textColor(
                                        appColor(context).primary,
                                      ),
                                    ).inkWell(
                                      onTap: () {
                                        passFocus.unfocus();
                                        Navigator.pushReplacementNamed(
                                          context,
                                          routeName.login,
                                          arguments: email,
                                        ).then((value) {
                                          if (value is String) {
                                            email = value;
                                            setState(() {});
                                          }
                                        });
                                      },
                                    ),
                                  ],
                                ),
                              VSpace(Sizes.s16),
                              Text(
                                appFonts.password,
                                style: appCss.dmSansSemiBold14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s8),
                              buildPasswordField(
                                controller: passController,
                                focusNode: passFocus,
                                fieldKey: "password",
                              ),
                              VSpace(Sizes.s10),
                              buildRememberAndForgot(context, email),
                              VSpace(Sizes.s33),
                              buildLoginButton(
                                passController: passController,
                                email: email,
                              ),
                              Center(
                                child: Text(
                                  appFonts.demoCredential,
                                  style: appCss.dmSansMedium12.textColor(
                                    appColor(context).lightText,
                                  ),
                                ),
                              ).padding(top: Sizes.s5),
                              Column(
                                mainAxisAlignment: MainAxisAlignment.start,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  InkWell(
                                    onTap: () {
                                      HapticFeedback.lightImpact();
                                      passController.text =
                                          appFonts.demoPassword; // set email
                                    },
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      crossAxisAlignment: .center,
                                      children: [
                                        Text(
                                          appFonts.demoPassword,
                                          style: appCss.dmSansMedium12
                                              .textColor(
                                                appColor(context).darkText,
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
                              ).padding(top: Sizes.s5),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  VSpace(Sizes.s20),
                  buildFooter(context),
                  VSpace(Sizes.s20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
