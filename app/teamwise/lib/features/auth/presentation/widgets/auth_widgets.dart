import 'dart:developer';

import 'package:teamwise/common/widgets/country_picker_custom/country_code_custom.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:teamwise/features/auth/data/datasources/auth_api.dart';
import 'package:teamwise/features/auth/presentation/widgets/page_content_screen.dart'
    show PageContentScreen;

import '../../../../config.dart';

import '../../../../core/network/api_manger.dart';
import '../../data/models/team_model.dart';
import 'country_list_layout.dart';

// Widgets for the Auth Screen
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

Widget buildFooter(BuildContext context) {
  final authApi = serviceLocator<AuthApi>();
  final pages = authApi.pages;

  void openPage(String slug) {
    // log("slug::${slug.toString()}");
    if (pages == null || pages.isEmpty) {
      AppToast.showMessage("Content not available yet");
      return;
    }

    // Try to find the page by slug
    final page = pages.firstWhere((p) => p['slug'] == slug, orElse: () => {});

    // log("🔍 openPage slug: $slug");
    // log("📄 Found page: $page");

    if (page.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PageContentScreen(slug: slug), // ✅ dynamic slug
        ),
      );
    } else {
      AppToast.showMessage("Page not found for slug: $slug");
    }
  }

  final hasTerms = pages?.any((p) => p['slug'] == 'terms') ?? false;
  final hasPrivacy = pages?.any((p) => p['slug'] == 'privacy-policy') ?? false;

  if (!hasTerms && !hasPrivacy) return const SizedBox.shrink();

  return Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      RichText(
        text: TextSpan(
          style: appCss.dmSansMedium14.textColor(appColor(context).primary),
          children: [
            if (hasTerms)
              TextSpan(
                text: appFonts.termsOfUse,
                style: appCss.dmSansMedium14
                    .textColor(appColor(context).primary)
                    .underline,
                recognizer: TapGestureRecognizer()
                  ..onTap = () => openPage("terms"),
              ),
            if (hasTerms && hasPrivacy)
              TextSpan(
                text: ' ${appFonts.and} ',
                style: appCss.dmSansMedium14.textColor(
                  appColor(context).lightText,
                ),
              ),
            if (hasPrivacy)
              TextSpan(
                text: appFonts.privacyPolicy,
                style: appCss.dmSansMedium14
                    .textColor(appColor(context).primary)
                    .underline,
                recognizer: TapGestureRecognizer()
                  ..onTap = () => openPage("privacy-policy"),
              ),
          ],
        ),
      ),
    ],
  );
}

Widget buildOrFooter(BuildContext context) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      VSpace(Sizes.s8),
      Text(
        appFonts.createYourTeam,
        style: appCss.dmSansMedium14
            .textColor(appColor(context).primary)
            .underline,
      ).inkWell(
        onTap: () {
          Navigator.pushNamed(context, routeName.createTeamScreen);
        },
      ),
    ],
  ).paddingDirectional(bottom: Sizes.s30);
}

// Password textFiled
Widget buildPasswordField({
  required TextEditingController controller,
  required FocusNode focusNode,
  required String fieldKey, // unique key per field
  String? title,
}) {
  return BlocBuilder<AuthBloc, AuthState>(
    builder: (context, state) {
      final visibilityMap = (state is AuthPasswordVisibilityToggled)
          ? state.visibilityMap
          : <String, bool>{};
      final isVisible = visibilityMap[fieldKey] ?? false;

      return TextFieldCommon(
        controller: controller,
        focusNode: focusNode,
        hintText: language(context, title ?? appFonts.enterPass),
        obscureText: !isVisible,
        maxLines: 1,
        prefixIcon: svgAssets.lock,
        validator: (pass) => Validation().passValidation(context, pass),
        suffixIcon: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () {
            HapticFeedback.mediumImpact();
            context.read<AuthBloc>().add(TogglePasswordVisibility(fieldKey));
          },
          child: SvgPicture.asset(
            isVisible ? svgAssets.eye : svgAssets.hide,
            fit: BoxFit.scaleDown,
            colorFilter: ColorFilter.mode(
              isDark(context)
                  ? appColor(context).lightText
                  : appColor(context).darkText,
              BlendMode.srcIn,
            ),
          ),
        ),
      );
    },
  );
}

// Class level variable add karo
Set<int> _joiningTeams = <int>{};

Widget buildTeamItem(
  BuildContext context,
  TeamModel team,
  String Function(String?) getInitials,
  TextEditingController searchController, {
  bool isWelcome = false,
}) {
  final authBloc = context.read<AuthBloc>();
  final userEmail = authBloc.profileData!.email;

  return Column(
    children: [
      Container(
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xFFE8E8E8),
        ),
        child: Text(
          team.name[0],
          style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
          textAlign: TextAlign.center,
        ).paddingDirectional(all: Sizes.s15),
      ),
      Text(
        team.name.capitalize(),
        style: appCss.dmSansRegular14.textColor(appColor(context).darkText),
      ).padding(top: Sizes.s9, bottom: Sizes.s1),
      Text(
        "${team.memberCount} Members",
        style: appCss.dmSansRegular14.textColor(appColor(context).lightText),
      ),
      VSpace(Sizes.s12),
      BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is JoinTeamSuccess) {
            // Remove from joining set
            _joiningTeams.remove(team.id);

            // Team join success ke baad teams list fetch karo
            context.read<AuthBloc>().add(
              FetchTeams(
                email: context.read<AuthBloc>().profileData!.email,
                term: searchController
                    .text, // Empty search term ya current search term pass karo
              ),
            );
          }
          if (state is JoinTeamFailure) {
            // Remove from joining set on failure
            _joiningTeams.remove(team.id);
            AppToast.showMessage(state.error);
          }

          if (state is TeamListLoaded) {
            final joinedTeams = state.teams.where(
              (t) => t.status.toLowerCase() == 'joined',
            );

            if (joinedTeams.isNotEmpty) {
              final joinedTeam = joinedTeams.first;

              //log("✅ Joined Team Name: ${joinedTeam.name}");

              Future.delayed(const Duration(milliseconds: 150), () {
                Navigator.pushNamed(
                  context,
                  routeName.profileSetupScreen,
                  arguments: {
                    "isJoined": true,
                    "joinedTeamName": joinedTeam.name,
                    "isWelcome": isWelcome,
                  },
                );
              });
            } else {
              log("⚠️ No joined team found.");
              // You can show a toast or navigate to a fallback screen if needed
            }
          }
        },

        builder: (context, state) {
          final isJoining = _joiningTeams.contains(team.id);
          final isLoadingTeams = state is TeamListLoading;
          final status = team.status.toLowerCase();

          // Determine button text based on status
          String buttonText;
          if (isJoining) {
            buttonText = 'Joining...';
          } else if (isLoadingTeams) {
            buttonText = 'Loading...';
          } else {
            buttonText = team.status;
          }

          // Determine if button should be disabled
          final isDisabled =
              isJoining ||
              isLoadingTeams ||
              status == 'joined' ||
              status == 'requested';

          return ButtonCommon(
            height: Sizes.s35,
            borderColor: appColor(context).primary,
            color: status == 'join'
                ? appColor(context).bgColor
                : appColor(context).primary,
            fontColor: status == 'join'
                ? appColor(context).primary
                : appColor(context).bgColor,
            title: buttonText.capitalize(),
            onTap: isDisabled
                ? null
                : () {
                    HapticFeedback.mediumImpact();

                    // Only join if status is 'join' and not already processing
                    if (status == 'join' && !_joiningTeams.contains(team.id)) {
                      // Add to joining set to prevent duplicate requests
                      _joiningTeams.add(team.id);

                      authBloc.add(
                        JoinTeamEvent(teamId: team.id, email: userEmail),
                      );
                    }
                  },
          );
        },
      ).paddingDirectional(horizontal: Sizes.s15),
    ],
  );
}

// Remember me and Forgot Password Row
Widget buildRememberAndForgot(BuildContext context, String? emailPass) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.end,
    children: [
      Text(
        language(context, appFonts.forgotPassword),
        style: appCss.dmSansSemiBold14.textColor(appColor(context).primary),
      ).inkWell(
        onTap: () {
          HapticFeedback.mediumImpact();

          final email = emailPass;
          if (email == null || email.isEmpty) {
            AppToast.showMessage("Please enter email");
            return;
          }

          Navigator.pushNamed(
            context,
            routeName.forgotPassScreen,
            arguments: email, // 👈 passing email to pre-fill
          );
        },
      ),
    ],
  ).paddingDirectional(top: Sizes.s11, bottom: Sizes.s33);
}

Widget buildLoginButton({
  required TextEditingController passController,
  email,
}) {
  return BlocBuilder<AuthBloc, AuthState>(
    buildWhen: (prev, curr) => (prev is AuthLoading) != (curr is AuthLoading),
    builder: (context, state) {
      final isLoading = state is AuthLoading;
      return ButtonCommon(
        title: language(context, appFonts.login),
        isLoading: isLoading,
        onTap: isLoading
            ? null
            : () {
                if (passController.text.isNotEmpty) {
                  if (email != null && email!.isNotEmpty) {
                    context.read<AuthBloc>().add(
                      LoginPressed(
                        email: email!,
                        password: passController.text.trim(),
                      ),
                    );
                  } else {
                    AppToast.showError("Email is missing");
                  }
                } else {
                  AppToast.showError(appFonts.pleaseEnterPassword);
                }
              },
      );
    },
  );
}

Widget otpInputWidget(
  BuildContext context,
  TextEditingController controller,
  Function(String) onCompleted,
) {
  return PinCodeTextField(
    appContext: context,
    length: 6,
    controller: controller,
    keyboardType: TextInputType.number,
    autoFocus: true,
    animationType: AnimationType.fade,
    pinTheme: PinTheme(
      shape: PinCodeFieldShape.underline,
      fieldHeight: Sizes.s60,
      fieldWidth: Sizes.s48,
      activeColor: appColor(context).primary,
      selectedColor: appColor(context).primary,
      inactiveColor: appColor(context).textFiledBorder,
      activeFillColor: appColor(context).white,
      inactiveFillColor: appColor(context).textFiledBorder,
      selectedFillColor: appColor(context).white,
    ),
    textStyle: appCss.dmSansMedium20.textColor(appColor(context).primary),
    cursorColor: appColor(context).primary,
    animationDuration: const Duration(milliseconds: 300),
    enableActiveFill: false,
    onCompleted: onCompleted,
    // This will be called when OTP is complete
    onChanged: (_) {},
  );
}

Widget phoneTextBox(
  context,
  controller,
  focus, {
  Function(CountryCodeCustom?)? onChanged,
  ValueChanged<String>? onFieldSubmitted,
  double? hPadding,
  EdgeInsets? scrollPadding,
  String? initialSelection,
}) => IntrinsicHeight(
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      CountryListLayout(
        onChanged: onChanged,
        initialSelection: initialSelection,
      ),
      HSpace(Sizes.s8),
      Expanded(
        child: Theme.of(context).brightness == Brightness.dark
            ? GlassTextFieldCommon(
                isNumber: true,
                keyboardType: TextInputType.number,
                validator: (phone) =>
                    Validation().phoneValidation(context, phone),
                controller: controller,
                onFieldSubmitted: onFieldSubmitted,
                scrollPadding: scrollPadding,
                focusNode: focus,
                hintText: language(context, appFonts.typeANumber),
              )
            : TextFieldCommon(
                isNumber: true,
                keyboardType: TextInputType.number,
                validator: (phone) =>
                    Validation().phoneValidation(context, phone),
                controller: controller,
                onFieldSubmitted: onFieldSubmitted,
                scrollPadding: scrollPadding,
                focusNode: focus,
                hintText: language(context, appFonts.typeANumber),
              ),
      ),
    ],
  ),
);

Widget buildDropdownSection(BuildContext context) {
  final customDetails = appArray.customDetails;
  if (customDetails.isEmpty) return SizedBox.shrink();

  final details = customDetails.first;
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: details.keys.map<Widget>((label) {
      return BlocBuilder<DropdownBloc, DropdownState>(
        builder: (context, state) {
          if (state is DropdownLoading) {
            return CircularProgressIndicator();
          }
          if (state is DropdownError) {
            return Text(state.message);
          }
          if (state is DropdownLoaded) {
            final selectedValue =
                state.selectedValues[label] ?? 'Select a Value';
            final items =
                state.items[label] ?? ['Select a Value', ...details[label]];
            final isLast = label.indexOf(label) == label.length - 1;
            return Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : Sizes.s18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: appCss.dmSansSemiBold14.textColor(
                      appColor(context).black,
                    ),
                  ),
                  VSpace(Sizes.s8),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: Sizes.s12),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: appColor(context).textFiledBorder,
                      ),
                      borderRadius: BorderRadius.circular(Sizes.s8),
                    ),
                    child: DropdownButton<dynamic>(
                      value: selectedValue == 'Select a Value'
                          ? null
                          : selectedValue,
                      hint: Text(
                        'Select a Value',
                        style: appCss.dmSansMedium14.textColor(
                          appColor(context).lightText,
                        ), // Light text for placeholder
                      ),
                      items: items.map<DropdownMenuItem<dynamic>>((
                        dynamic value,
                      ) {
                        return DropdownMenuItem<dynamic>(
                          value: value,
                          child: Text(
                            value.toString(),
                            style: appCss.dmSansMedium14.textColor(
                              appColor(context).black,
                            ),
                          ), // Light text for placeholder),
                        );
                      }).toList(),
                      icon: SvgPicture.asset(
                        svgAssets.arrowDown,
                        colorFilter: ColorFilter.mode(
                          appColor(context).lightText,
                          BlendMode.srcIn,
                        ),
                      ),
                      onChanged: (dynamic newValue) {
                        if (newValue != null && newValue != 'Select a Value') {
                          context.read<DropdownBloc>().add(
                            SelectValue(label, newValue),
                          );
                        }
                      },
                      isExpanded: true,
                      underline: SizedBox(),
                    ),
                  ),
                ],
              ),
            );
          }
          return SizedBox.shrink();
        },
      );
    }).toList(), // Casted to List<Widget>
  );
}

Widget remindMeLater(context, {GestureTapCallback? onTap}) {
  return Text(
        appFonts.remindMeLater,
        style: appCss.dmSansSemiBold14
            .textColor(appColor(context).primary)
            .underline,
      )
      .inkWell(
        onTap:
            onTap ??
            () {
              HapticFeedback.mediumImpact();
              Navigator.pushReplacementNamed(context, routeName.dashboard);
            },
      )
      .paddingDirectional(bottom: Sizes.s30);
}
