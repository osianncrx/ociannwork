import '../../../../config.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  // Controllers
  final TextEditingController currentPasswordController =
      TextEditingController();
  final TextEditingController newPasswordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  // Focus nodes
  final FocusNode currentPasswordFocus = FocusNode();
  final FocusNode newPasswordFocus = FocusNode();
  final FocusNode confirmPasswordFocus = FocusNode();

  bool isLoading = false;

  @override
  void dispose() {
    currentPasswordController.dispose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
    currentPasswordFocus.dispose();
    newPasswordFocus.dispose();
    confirmPasswordFocus.dispose();
    super.dispose();
  }

  void _handleChangePassword() {
    // Validate fields
    if (currentPasswordController.text.trim().isEmpty) {
      AppToast.showError('Please enter your current password');
      return;
    }
    if (newPasswordController.text.trim().isEmpty) {
      AppToast.showError('Please enter a new password');
      return;
    }
    if (confirmPasswordController.text.trim().isEmpty) {
      AppToast.showError('Please confirm your new password');
      return;
    }

    // Dispatch event
    context.read<DashboardBloc>().add(
      ChangePassword(
        currentPassword: currentPasswordController.text.trim(),
        newPassword: newPasswordController.text.trim(),
        confirmPassword: confirmPasswordController.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<DashboardBloc, DashboardState>(
      listener: (context, state) {
        if (state is PasswordChangeLoading) {
          setState(() {
            isLoading = true;
          });
        } else if (state is PasswordChangeSuccess) {
          setState(() {
            isLoading = false;
          });
          AppToast.showSuccess(
            backgroundColor: appColor(context).primary,
            state.message,
          );
          // AppToast.showSuccess(state.message);
          Navigator.pop(context);
        } else if (state is PasswordChangeError) {
          setState(() {
            isLoading = false;
          });
          AppToast.showError(state.error);
        }
      },
      builder: (context, state) {
        final visibilityMap = state.visibilityMap;

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
                padding: EdgeInsets.only(top: Sizes.s24, bottom: Sizes.s24),
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
                                  "Change Password",
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                VSpace(Sizes.s8),
                                VSpace(Sizes.s16),

                                // Current Password
                                Text(
                                  appFonts.oldPassword,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                VSpace(Sizes.s8),
                                TextFieldCommon(
                                  controller: currentPasswordController,
                                  focusNode: currentPasswordFocus,
                                  hintText: appFonts.enterOldPasswordHint,
                                  obscureText:
                                      !(visibilityMap['current_password'] ??
                                          false),
                                  maxLines: 1,
                                  prefixIcon: svgAssets.lock,
                                  validator: (pass) => Validation()
                                      .passValidation(context, pass),
                                  suffixIcon: GestureDetector(
                                    behavior: HitTestBehavior.translucent,
                                    onTap: () {
                                      HapticFeedback.mediumImpact();
                                      context.read<DashboardBloc>().add(
                                        ToggleDashboardPasswordVisibility(
                                          'current_password',
                                        ),
                                      );
                                    },
                                    child: SvgPicture.asset(
                                      (visibilityMap['current_password'] ??
                                              false)
                                          ? svgAssets.eye
                                          : svgAssets.hide,
                                      fit: BoxFit.scaleDown,
                                      colorFilter: ColorFilter.mode(
                                        isDark(context)
                                            ? appColor(context).lightText
                                            : appColor(context).darkText,
                                        BlendMode.srcIn,
                                      ),
                                    ),
                                  ),
                                ),
                                VSpace(Sizes.s10),

                                // New Password
                                Text(
                                  "New Password",
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                VSpace(Sizes.s8),
                                TextFieldCommon(
                                  controller: newPasswordController,
                                  focusNode: newPasswordFocus,
                                  hintText: appFonts.enterNewPassword,
                                  obscureText:
                                      !(visibilityMap['new_password'] ?? false),
                                  maxLines: 1,
                                  prefixIcon: svgAssets.lock,
                                  validator: (pass) => Validation()
                                      .passValidation(context, pass),
                                  suffixIcon: GestureDetector(
                                    behavior: HitTestBehavior.translucent,
                                    onTap: () {
                                      HapticFeedback.mediumImpact();
                                      context.read<DashboardBloc>().add(
                                        ToggleDashboardPasswordVisibility(
                                          'new_password',
                                        ),
                                      );
                                    },
                                    child: SvgPicture.asset(
                                      (visibilityMap['new_password'] ?? false)
                                          ? svgAssets.eye
                                          : svgAssets.hide,
                                      fit: BoxFit.scaleDown,
                                      colorFilter: ColorFilter.mode(
                                        isDark(context)
                                            ? appColor(context).lightText
                                            : appColor(context).darkText,
                                        BlendMode.srcIn,
                                      ),
                                    ),
                                  ),
                                ),
                                VSpace(Sizes.s10),

                                // Confirm Password
                                Text(
                                  "Confirm Password",
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                VSpace(Sizes.s8),
                                TextFieldCommon(
                                  controller: confirmPasswordController,
                                  focusNode: confirmPasswordFocus,
                                  hintText: appFonts.enterConfirmPassword,
                                  obscureText:
                                      !(visibilityMap['confirm_password'] ??
                                          false),
                                  maxLines: 1,
                                  prefixIcon: svgAssets.lock,
                                  validator: (pass) => Validation()
                                      .passValidation(context, pass),
                                  suffixIcon: GestureDetector(
                                    behavior: HitTestBehavior.translucent,
                                    onTap: () {
                                      HapticFeedback.mediumImpact();
                                      context.read<DashboardBloc>().add(
                                        ToggleDashboardPasswordVisibility(
                                          'confirm_password',
                                        ),
                                      );
                                    },
                                    child: SvgPicture.asset(
                                      (visibilityMap['confirm_password'] ??
                                              false)
                                          ? svgAssets.eye
                                          : svgAssets.hide,
                                      fit: BoxFit.scaleDown,
                                      colorFilter: ColorFilter.mode(
                                        isDark(context)
                                            ? appColor(context).lightText
                                            : appColor(context).darkText,
                                        BlendMode.srcIn,
                                      ),
                                    ),
                                  ),
                                ),
                                VSpace(Sizes.s10),

                                VSpace(Sizes.s33),
                                ButtonCommon(
                                  title: "Update",
                                  isLoading: isLoading,
                                  onTap: isLoading
                                      ? null
                                      : _handleChangePassword,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    VSpace(Sizes.s20),
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
