import 'dart:developer';

import '../../../../config.dart';

class ForgotPassScreen extends StatefulWidget {
  const ForgotPassScreen({super.key});

  @override
  State<ForgotPassScreen> createState() => _ForgotPassScreenState();
}

class _ForgotPassScreenState extends State<ForgotPassScreen> {
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
  }

  @override
  void dispose() {
    emailController.dispose();
    emailFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is ForgotPasswordSuccess) {
          Navigator.pushReplacementNamed(
            context,
            routeName.otpScreen,
            arguments: {
              'email': emailController.text.trim(), // pass current email
              'fromForgot': true, // flag for forgot password flow
            },
          );
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },

      child: Scaffold(
        resizeToAvoidBottomInset: false,
        body: Container(
          /*   decoration: BoxDecoration(
            image: DecorationImage(
              image: AssetImage(imageAssets.forgotYourPasswordBG),
              alignment: Alignment.topCenter,
            ),
          ), */
          height: double.infinity,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                appColor(context).commonBgColor,
                /*  Color(0XFFD8E0FF) /* overlayColor72 */, */
                // Top purple shade
                appColor(context).white, // Bottom
                appColor(context).white, // Bottom
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                /*  Spacer(flex: 3), */
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: Sizes.s300,
                      height: Sizes.s470,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.forgotPasswordBg),
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
                                appFonts.needAPasswordReset,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s3),
                              Text(
                                appFonts.forgotPasswordEasily,
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).lightText,
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
                              TextFieldCommon(
                                validator: (email) => Validation()
                                    .emailValidation(context, email),
                                controller: emailController,
                                hintText: language(
                                  context,
                                  appFonts.enterEmail,
                                ),
                                keyboardType: TextInputType.emailAddress,
                                focusNode: emailFocus,
                                prefixIcon: svgAssets.email,
                              ),
                              VSpace(Sizes.s33),
                              BlocBuilder<AuthBloc, AuthState>(
                                buildWhen: (prev, curr) =>
                                    (prev is AuthLoading) !=
                                    (curr is AuthLoading),
                                builder: (context, state) {
                                  final isLoading = state is AuthLoading;
                                  return ButtonCommon(
                                    title: language(context, appFonts.send),
                                    isLoading: isLoading,
                                    onTap: isLoading
                                        ? null
                                        : () {
                                            HapticFeedback.mediumImpact();
                                            final email = emailController.text
                                                .trim();
                                            log("email::$email");
                                            if (email.isNotEmpty) {
                                              context.read<AuthBloc>().add(
                                                SendEmailPressed(email),
                                              ); // ✅ Correct
                                            } else {
                                              AppToast.showError(
                                                appFonts.pleaseEnterValidEmail,
                                              );
                                            }
                                          },
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s280),
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
