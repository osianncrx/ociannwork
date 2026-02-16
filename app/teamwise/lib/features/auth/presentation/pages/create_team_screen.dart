// import 'dart:developer';

// import '../../../../config.dart';

// class CreateTeamScreen extends StatefulWidget {
//   const CreateTeamScreen({super.key});

//   @override
//   State<CreateTeamScreen> createState() => _CreateTeamScreenState();
// }

// class _CreateTeamScreenState extends State<CreateTeamScreen> {
//   final teamController = TextEditingController();
//   final teamFocus = FocusNode();

//   @override
//   Widget build(BuildContext context) {
//     return BlocListener<AuthBloc, AuthState>(
//       listener: (context, state) {
//         if (state is TeamCreatedSuccess) {
//           Navigator.pushReplacementNamed(context, routeName.reviewTerms);
//         } else if (state is AuthFailure) {
//           AppToast.showError(state.error);
//         }
//       },
//       child: Scaffold(
//         resizeToAvoidBottomInset: false,
//         body: Container(
//           /*  decoration: BoxDecoration(
//             image: DecorationImage(
//               image: AssetImage(imageAssets.teamBG),
//               alignment: Alignment.topCenter,
//             ),
//           ), */
//           height: double.infinity,
//           width: double.infinity,
//           decoration: BoxDecoration(
//             gradient: LinearGradient(
//               begin: Alignment.topCenter,
//               end: Alignment.bottomCenter,
//               colors: [
//                  appColor(context).commonBgColor,

//                  appColor(context).white, // Bottom
//               ],
//             ),
//           ),
//           child: SafeArea(
//             child: Column(
//               mainAxisAlignment: MainAxisAlignment.center,
//               children: [
//                 /* Spacer(flex: 2), */
//                 Stack(
//                   alignment: AlignmentGeometry.topCenter,
//                   children: [
//                     Container(
//                       width: Sizes.s257,
//                       height: Sizes.s335,
//                       decoration: BoxDecoration(
//                         image: DecorationImage(
//                           image: AssetImage(imageAssets.ceeateTeamBg),
//                           alignment: Alignment.topCenter,
//                         ),
//                       ),
//                     ),
//                     Column(
//                       children: [
//                         CommonCardContainer(
//                           child: Column(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               Text(
//                                 appFonts.createYourTeam,
//                                 style: appCss.dmSansExtraBold18.textColor(
//                                    appColor(context).darkText,
//                                 ),
//                               ),

//                               Text(
//                                 appFonts.teamsMakeItHappen,
//                                 style: appCss.dmSansRegular14.textColor(
//                                    appColor(context).lightText,
//                                 ),
//                               ).paddingDirectional(
//                                 top: Sizes.s3,
//                                 bottom: Sizes.s26,
//                               ),

//                               Text(
//                                 appFonts.nameYourTeam,
//                                 style: appCss.dmSansSemiBold14.textColor(
//                                    appColor(context).darkText,
//                                 ),
//                               ),
//                               TextFieldCommon(
//                                 validator: (name) => Validation()
//                                     .teamNameValidation(context, name),
//                                 controller: teamController,
//                                 hintText: language(
//                                   context,
//                                   appFonts.enterYourTeam,
//                                 ),
//                                 keyboardType: TextInputType.name,
//                                 focusNode: teamFocus,
//                               ).paddingDirectional(
//                                 top: Sizes.s8,
//                                 bottom: Sizes.s7,
//                               ),
//                               Row(
//                                 children: [
//                                   Text(
//                                     "${appFonts.wantToJoinATeam} ",
//                                     style: appCss.dmSansRegular14.textColor(
//                                        appColor(context).lightText,
//                                     ),
//                                   ),
//                                   Text(
//                                     appFonts.findYourTeam,
//                                     style: appCss.dmSansRegular14
//                                         .textColor( appColor(context).primary)
//                                         .underline,
//                                   ).inkWell(
//                                     onTap: () {
//                                       final email = context
//                                           .read<AuthBloc>()
//                                           .profileData
//                                           ?.email;
//                                       log("email::$email");
//                                       if (email == null || email.isEmpty) {
//                                         context.read<AuthBloc>().add(
//                                           FetchTeams(email: email, term: ''),
//                                         );
//                                       }

//                                       Navigator.pushReplacementNamed(
//                                         context,
//                                         routeName.discoverTerms,
//                                       );
//                                     },
//                                   ),
//                                 ],
//                               ),
//                               VSpace(Sizes.s33),
//                               BlocBuilder<AuthBloc, AuthState>(
//                                 buildWhen: (prev, curr) =>
//                                     (prev is AuthLoading) !=
//                                     (curr is AuthLoading),
//                                 builder: (context, state) {
//                                   final isLoading = state is AuthLoading;
//                                   return ButtonCommon(
//                                     title: language(context, appFonts.next),
//                                     isLoading: isLoading,
//                                     onTap: isLoading
//                                         ? null
//                                         : () {
//                                             HapticFeedback.mediumImpact();
//                                             final teamName = teamController.text
//                                                 .trim();
//                                             log("teamName::$teamName");
//                                             if (teamName.isNotEmpty) {
//                                               context
//                                                       .read<AuthBloc>()
//                                                       .isJoined =
//                                                   false;
//                                               context.read<AuthBloc>().add(
//                                                 CreateTeamPressed(teamName),
//                                               );
//                                             } else {
//                                               AppToast.showError(
//                                                 appFonts
//                                                     .pleaseEnterValidTeamName,
//                                               );
//                                             }
//                                           },
//                                   );
//                                 },
//                               ),
//                             ],
//                           ),
//                         ).paddingDirectional(bottom: Sizes.s50),
//                       ],
//                     ).padding(top: Sizes.s250),
//                   ],
//                 ),
//                 Spacer(flex: 1),
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

class CreateTeamScreen extends StatefulWidget {
  const CreateTeamScreen({super.key});

  @override
  State<CreateTeamScreen> createState() => _CreateTeamScreenState();
}

class _CreateTeamScreenState extends State<CreateTeamScreen> {
  final teamController = TextEditingController();
  final teamFocus = FocusNode();
  bool isWelcome = false;
@override
  void didChangeDependencies() {
    // TODO: implement didChangeDependencies
    super.didChangeDependencies();
    super.didChangeDependencies();
    final args =
    ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && args['isWelcome'] != null) {
      isWelcome = args['isWelcome'] ;
    }
  }
  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is TeamCreatedSuccess) {
          Navigator.pushNamed(context, routeName.reviewTerms,arguments: {"isWelcome":isWelcome});
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },
      child: WillPopScope(
        onWillPop: () async {
          if (isWelcome) {
            Navigator.pop(context);
            return false;
          }
          // Go back to login screen
          Navigator.pushNamedAndRemoveUntil(
            context,
            routeName.login,
            (route) => false,
          );
          return false; // prevent default back action
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
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.topCenter,
                      children: [
                        Container(
                          width: Sizes.s257,
                          height: Sizes.s335,
                          decoration: BoxDecoration(
                            image: DecorationImage(
                              image: AssetImage(imageAssets.ceeateTeamBg),
                              alignment: Alignment.topCenter,
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 250),
                          child: CommonCardContainer(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  appFonts.createYourTeam,
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                Text(
                                  appFonts.teamsMakeItHappen,
                                  style: appCss.dmSansRegular14.textColor(
                                    appColor(context).lightText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s3,
                                  bottom: Sizes.s26,
                                ),
                                Text(
                                  appFonts.nameYourTeam,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                TextFieldCommon(
                                  validator: (name) => Validation()
                                      .teamNameValidation(context, name),
                                  controller: teamController,
                                  hintText: language(
                                    context,
                                    appFonts.enterYourTeam,
                                  ),
                                  keyboardType: TextInputType.name,
                                  focusNode: teamFocus,
                                ).paddingDirectional(
                                  top: Sizes.s8,
                                  bottom: Sizes.s7,
                                ),
                                Row(
                                  children: [
                                    Text(
                                      "${appFonts.wantToJoinATeam} ",
                                      style: appCss.dmSansRegular14.textColor(
                                        appColor(context).lightText,
                                      ),
                                    ),
                                    Text(
                                      appFonts.findYourTeam,
                                      style: appCss.dmSansRegular14
                                          .textColor(appColor(context).primary)
                                          .underline,
                                    ).inkWell(
                                      onTap: () {
                                        final email = context
                                            .read<AuthBloc>()
                                            .profileData
                                            ?.email;
                                        log("email::$email");

                                        context.read<AuthBloc>().add(
                                          FetchTeams(
                                            email: email ?? '',
                                            term: '',
                                          ),
                                        );

                                        Navigator.pushNamed(
                                          context,
                                          routeName.discoverTerms,
                                          arguments: {"isWelcome": isWelcome},
                                        );
                                      },
                                    ),
                                  ],
                                ),
                                VSpace(Sizes.s33),
                                BlocBuilder<AuthBloc, AuthState>(
                                  buildWhen: (prev, curr) =>
                                      (prev is AuthLoading) !=
                                      (curr is AuthLoading),
                                  builder: (context, state) {
                                    final isLoading = state is AuthLoading;
                                    return ButtonCommon(
                                      title: language(context, appFonts.next),
                                      isLoading: isLoading,
                                      onTap: isLoading
                                          ? null
                                          : () {
                                              HapticFeedback.mediumImpact();
                                              final teamName = teamController.text
                                                  .trim();
                                              if (teamName.isNotEmpty) {
                                                context
                                                        .read<AuthBloc>()
                                                        .isJoined =
                                                    false;
                                                context.read<AuthBloc>().add(
                                                  CreateTeamPressed(teamName),
                                                );
                                              } else {
                                                AppToast.showError(
                                                  appFonts
                                                      .pleaseEnterValidTeamName,
                                                );
                                              }
                                            },
                                    );
                                  },
                                ),
                              ],
                            ),
                          ).paddingDirectional(bottom: Sizes.s50),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
