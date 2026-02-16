import 'dart:async';
import 'dart:developer';

import '../../../../config.dart';
import '../../data/models/team_model.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final otpController = TextEditingController();
  final otpFocus = FocusNode();

  String? argEmail;
  bool fromForgotPassword = false;
  int _remainingTime = 0;
  Timer? _resendTimer;
  bool _canResend = true; // true = show "Resend", false = show timer

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map) {
        argEmail = args['email'] as String?;
        fromForgotPassword = args['fromForgot'] == true;
        setState(() {});
      }
    });
  }
  void _startResendTimer() {
    setState(() {
      _canResend = false;
      _remainingTime = 60;
    });
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      setState(() {
        _remainingTime--;
        if (_remainingTime <= 0) {
          timer.cancel();
          _canResend = true; // now show "Resend" again
        }
      });
    });
  }

// Don't forget to dispose timer:
  @override
  void dispose() {
    _resendTimer?.cancel();
    // otpController.dispose();
    otpFocus.dispose();
    super.dispose();
  }

  void _submitOtp() {
    if (argEmail != null && otpController.text.isNotEmpty) {
      context.read<AuthBloc>().add(
        SendOtpPressed(argEmail!, otpController.text),
      );
    } else {
      AppToast.showError("Please enter OTP");
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is OtpVerifiedSuccess) {
          if (fromForgotPassword) {
            Navigator.pushReplacementNamed(
              context,
              routeName.createPasswordScreen,
              arguments: {
                'email': argEmail,
                'otp': otpController.text,
                'isFromForgotPassword': true,
              },
            );
          } else {
            // Check if profile setup is needed
            if (state.showProfileScreen) {
              log("🔵 Profile setup needed -> navigating to profile screen");
              Navigator.pushReplacementNamed(
                context,
                routeName.profileSetupScreen,
                arguments: {'isJoined': context.read<AuthBloc>().isJoined},
              );
            } else {
              log("🔵 Profile already setup -> fetching teams");
              context.read<AuthBloc>().add(
                FetchTeams(email: argEmail ?? '', term: ''),
              );
            }
          }
        } else if (state is TeamListLoaded) {
          log("🔵 TeamListLoaded -> checking for joined teams");

          final joinedTeam = state.teams.firstWhere(
                (team) => team.status.toLowerCase() == 'joined',
            orElse: () =>
                TeamModel(id: 0, name: '', memberCount: 0, status: ''),
          );

          if (joinedTeam.id != 0) {
            log(
              "✅ Found joined team: ${joinedTeam.name} -> navigating to profile with team info",
            );
            Navigator.pushReplacementNamed(
              context,
              routeName.profileSetupScreen,
              arguments: {'isJoined': true, 'joinedTeamName': joinedTeam.name},
            );
          } else {
            log("⚠️ No joined team found -> navigating to create team screen");
            Navigator.pushReplacementNamed(context, routeName.createTeamScreen);
          }
        } else if (state is TeamListFailure) {
          log("🔴 TeamListFailure: ${state.error}");
          Navigator.pushReplacementNamed(context, routeName.createTeamScreen);
        } else if (state is EmailCheckSuccess) {
          log(
            "🟡 EmailCheckSuccess -> emailVerified: ${state.emailVerified}, userExists: ${state.userExists}, profileUpdated: ${state.isProfileUpdated}",
          );

          if (!state.emailVerified &&
              !state.isProfileUpdated &&
              !state.userExists) {
            Navigator.pushReplacementNamed(context, routeName.createTeamScreen);
          } else if (state.emailVerified && !state.isProfileUpdated) {
            context.read<AuthBloc>().isJoined = true;
            Navigator.pushReplacementNamed(context, routeName.createTeamScreen);
          } else {
            AppToast.showError("Incomplete profile or verification pending.");
          }
        } else if (state is AuthFailure) {
          log("🔴 AuthFailure: ${state.error}");
          AppToast.showError(state.error);
        }
      },

      child: Scaffold(
        resizeToAvoidBottomInset: false,
        body: Container(
          height: double.infinity,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                appColor(context).commonBgColor,
                // Top purple shade
                appColor(context).white, // Bottom
                appColor(context).white, // Bottom
              ],
            ),
          ),
          /*    decoration: BoxDecoration(
            image: DecorationImage(
              image: AssetImage(imageAssets.otpScreenBG),
              alignment: Alignment.topCenter,
            ),
          ), */
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                /*   Spacer(flex: 3), */
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: Sizes.s257,
                      height: Sizes.s335,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.otpBg),
                          alignment: Alignment.topCenter,
                        ),
                      ),
                    ),
                    Column(
                      children: [
                        CommonCardContainer(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                appFonts.enterTheOTP,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s3),
                              Row(
                                children: [
                                  Text(
                                    appFonts.codeDeliveredTo,
                                    style: appCss.dmSansRegular14.textColor(
                                      appColor(context).lightText,
                                    ),
                                  ),
                                  // if (argEmail != null && argEmail!.length<=25)
                                  //   Text(
                                  //     "$argEmail",
                                  //     style: appCss.dmSansRegular14.textColor(
                                  //       appColor(context).darkText,
                                  //     ),
                                  //   ),
                                  // if(argEmail != null && argEmail!.length>=25 &&argEmail!.length<=25)
                                  Expanded(
                                    child: Text(
                                      "$argEmail",
                                      style: appCss.dmSansRegular12.textColor(
                                        appColor(context).darkText,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              VSpace(Sizes.s15),
                              otpInputWidget(context, otpController, (p0) {
                                _submitOtp();
                              }),
                              Row(
                                children: [
                                  Text(
                                    "${language(context, appFonts.didNotReceiveThePin)} ",
                                    style: appCss.dmSansRegular14.textColor(
                                      appColor(context).lightText,
                                    ),
                                  ),

                                  _canResend
                                      ? GestureDetector(
                                    onTap: () {
                                      // 1: Call your resend API here
                                      final email = argEmail!;
                                      context.read<AuthBloc>().add(
                                        ResendOtpPressed(email: email),
                                      );
                                      // 2: Start timer
                                      _startResendTimer();
                                    },
                                    child: Text(
                                      appFonts.resendPIN,
                                      style: appCss.dmSansMedium15.textColor(appColor(context).primary).underline,
                                    ),
                                  )
                                      : Text(
                                    "${_remainingTime}s",
                                    style: appCss.dmSansMedium15.textColor(appColor(context).lightText),
                                  )


                                ],
                              ),

                              VSpace(Sizes.s26),
                              BlocBuilder<AuthBloc, AuthState>(
                                buildWhen: (prev, curr) =>
                                (prev is AuthLoading) !=
                                    (curr is AuthLoading) ||
                                    (prev is TeamListLoading) !=
                                        (curr is TeamListLoading),
                                builder: (context, state) {
                                  final isLoading =
                                      state is AuthLoading ||
                                          state is TeamListLoading;
                                  return ButtonCommon(
                                    title: language(context, appFonts.submit),
                                    isLoading: isLoading,
                                    onTap: isLoading ? null : _submitOtp,
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s250),
                  ],
                ),
                const Spacer(flex: 1),
                buildFooter(context),
                VSpace(Sizes.s20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
