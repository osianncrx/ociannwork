import 'dart:developer';

import '../../../../config.dart';

class CreatePasswordScreen extends StatefulWidget {
  const CreatePasswordScreen({super.key});

  @override
  State<CreatePasswordScreen> createState() => _CreatePasswordScreenState();
}

class _CreatePasswordScreenState extends State<CreatePasswordScreen> {
  final passController = TextEditingController();
  final passFocus = FocusNode();
  final confirmPassController = TextEditingController();
  final confirmPassFocus = FocusNode();

  String? email;
  bool isFromForgotPassword = false;
  String? otp;

  bool isJoined = false;
  String? joinedTeamName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map) {
        email = args['email'] as String?;
        otp = args['otp'] as String?;
        isFromForgotPassword = args['isFromForgotPassword'] as bool? ?? false;
        isJoined = args['isJoined'] as bool? ?? false;
        joinedTeamName = args['joinedTeamName'] as String?;
        setState(() {});
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          if (isFromForgotPassword) {
            Navigator.pushNamedAndRemoveUntil(
              context,
              routeName.login,
              (r) => false,
            );
          } else {
            final authBloc = context.read<AuthBloc>();
            if (authBloc.joinedTeam != null) {
              // 🚀 Directly go to dashboard
              Navigator.pushNamedAndRemoveUntil(
                context,
                routeName.dashboard,
                (r) => false,
              );
            } else if (authBloc.teamName != null) {
              Navigator.pushNamedAndRemoveUntil(
                context,
                routeName.inviteTeamScreen,
                (r) => false,
              );
            } else {
              // 🧩 Check if `fields` exists and is not empty
              final fields = state.fields;
              final hasCustomFields = fields != null && fields.isNotEmpty;
              log('fields::$fields///$hasCustomFields');

              if (hasCustomFields) {
                // 👉 Navigate to custom fields screen
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  routeName.customFieldsScreen,
                  (r) => false,
                  arguments: {'fields': fields},
                );
              } else {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  routeName.dashboard,
                  (r) => false,
                );
              }
            }
          }
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
              padding: EdgeInsets.only(top: Sizes.s24, bottom: Sizes.s24),
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
                            image: AssetImage(imageAssets.newPasswordBg),
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
                                appFonts.setUpYourPassword,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              Text(
                                appFonts.letKeepYourInfoSafe,
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).lightText,
                                ),
                              ).paddingDirectional(
                                top: Sizes.s3,
                                bottom: Sizes.s20,
                              ),
                              Text(
                                appFonts.password,
                                style: appCss.dmSansSemiBold14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              buildPasswordField(
                                controller: passController,
                                focusNode: passFocus,
                                title: appFonts.password,
                                fieldKey: 'passwordFieldKey',
                              ).paddingDirectional(
                                top: Sizes.s8,
                                bottom: Sizes.s18,
                              ),
                              Text(
                                appFonts.confirmPassword,
                                style: appCss.dmSansSemiBold14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s8),
                              buildPasswordField(

                                controller: confirmPassController,
                                focusNode: confirmPassFocus,
                                title: appFonts.confirmPassword,
                                fieldKey: 'confirmPasswordFieldKey',
                              ),
                              VSpace(Sizes.s33),
                              BlocBuilder<AuthBloc, AuthState>(
                                buildWhen: (prev, curr) =>
                                    (prev is AuthLoading) !=
                                    (curr is AuthLoading),
                                builder: (context, state) {
                                  final isLoading = state is AuthLoading;
                                  return ButtonCommon(
                                    title: language(context, appFonts.submit),
                                    isLoading: isLoading,
                                    onTap: isLoading
                                        ? null
                                        : () {

                                      final password = passController.text.trim();
                                      final confirmPassword = confirmPassController.text.trim();

                                      // 🔹 Step 1: Empty check
                                      if (password.isEmpty || confirmPassword.isEmpty) {
                                        AppToast.showError(appFonts.pleaseEnterPassword);
                                        return;
                                      }

                                      // 🔹 Step 2: Mismatch check
                                      if (password != confirmPassword) {
                                        AppToast.showError("Passwords don’t match");
                                        return;
                                      }

                                      // 🔹 Step 3: Continue normal flow
                                      final authBloc = context.read<AuthBloc>();

                                      if (isFromForgotPassword && email != null) {
                                        authBloc.add(
                                          ResetPasswordEvent(
                                            email: email!,
                                            otp: otp!,
                                            newPassword: password,
                                          ),
                                        );
                                      }
                                       else {
                                                final authBloc = context
                                                    .read<AuthBloc>();
                                                if (isJoined) {
                                                  authBloc.add(
                                                    SetupProfileEvent(
                                                      email: authBloc
                                                          .profileData!
                                                          .email,
                                                      name:
                                                          "${authBloc.profileData!.firstName} ${authBloc.profileData!.lastName}",
                                                      countryCode: "91",
                                                      phone: authBloc
                                                          .profileData!
                                                          .phone,
                                                      password: passController
                                                          .text
                                                          .trim(),
                                                    ),
                                                  );
                                                } else {
                                                  authBloc.add(
                                                    SubmitProfileEvent(
                                                      passController.text
                                                          .trim(),
                                                      teamName: joinedTeamName,
                                                    ),
                                                  );
                                                }
                                              }
                                            }

                                  );
                                },
                              ),
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
