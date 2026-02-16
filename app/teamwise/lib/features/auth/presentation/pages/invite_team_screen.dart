import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../config.dart';
import '../../data/auth_services.dart';
import '../../data/models/common_model.dart';

class InviteTeamScreen extends StatefulWidget {
  const InviteTeamScreen({super.key});

  @override
  State<InviteTeamScreen> createState() => _InviteTeamScreenState();
}

class _InviteTeamScreenState extends State<InviteTeamScreen> {
  List<TextEditingController> emailControllers = [TextEditingController()];
  List<FocusNode> emailFocusNodes = [FocusNode()];
  bool _isDash = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    _isDash = args?['isDash'] == true;
  }
  void _addEmailField() {
    setState(() {
      emailControllers.add(TextEditingController());
      emailFocusNodes.add(FocusNode());
    });
  }

  void _removeEmailField(int index) {
    if (emailControllers.length > 1) {
      setState(() {
        final controller = emailControllers.removeAt(index);
        final focusNode = emailFocusNodes.removeAt(index);

        // Defer disposal to ensure the widget is removed from the tree first
        WidgetsBinding.instance.addPostFrameCallback((_) {
          controller.dispose();
          focusNode.dispose();
        });
      });
    }
  }

  @override
  void dispose() {
    for (var controller in emailControllers) {
      controller.dispose();
    }
    for (var node in emailFocusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  /// ✅ Email format validation using regex
  bool _isValidEmail(String email) {
    final emailRegex = RegExp(
      r"^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$",
    ); // simple + effective
    return emailRegex.hasMatch(email);
  }

  Future<void> onDonePressed() async {
    final emails = emailControllers.map((c) => c.text.trim()).toList();
    log("Invite emails: $emails");

    // ✅ Check empty
    if (emails.any((email) => email.isEmpty)) {
      AppToast.showError("Please fill all email fields.");
      return;
    }

    // ✅ Check invalid emails
    for (final email in emails) {
      if (!_isValidEmail(email)) {
        AppToast.showError("Invalid email: $email");
        return;
      }
    }

    // ✅ Continue if valid
    final teamId = AuthService().teamId;
    if (teamId == null) {
      AppToast.showError("Team ID not found.");
      return;
    }

    context.read<AuthBloc>().add(
      InviteTeamMembersEvent(emails: emails, teamId: teamId),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          AppToast.showMessage(state.message);
          if (_isDash) {
            Navigator.pushReplacementNamed(context, routeName.dashboard);
          } else {
            Navigator.pushReplacementNamed(
              context,
              routeName.chatChannelScreen,
            );
          }
        } else if (state is AuthFailure) {
          AppToast.showError(state.error);
        }
      },
      child: Scaffold(
        resizeToAvoidBottomInset: false,
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
                appColor(context).white,
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: Sizes.s257,
                      height: Sizes.s470,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.createChannelBg),
                          alignment: Alignment.topCenter,
                        ),
                      ),
                    ),
                    Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: CommonCardContainer(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  appFonts.inviteYourTeam,
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                Text(
                                  appFonts.sendInvitesAnd,
                                  style: appCss.dmSansRegular14.textColor(
                                    appColor(context).lightText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s3,
                                  bottom: Sizes.s20,
                                ),
                                Text(
                                  appFonts.teamMembersEmail,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                VSpace(Sizes.s10),

                                // 🔹 Dynamic email fields
                                ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxHeight: MediaQuery.of(context).size.height * 0.35,
                                  ),
                                  child: ListView.builder(
                                    shrinkWrap: true,
                                    physics: emailControllers.length > 4
                                        ? const BouncingScrollPhysics()
                                        : const NeverScrollableScrollPhysics(),
                                    itemCount: emailControllers.length,
                                    itemBuilder: (context, index) {
                                      final controller =
                                          emailControllers[index];
                                      return Row(
                                        children: [
                                          Expanded(
                                            child:
                                                TextFieldCommon(
                                                  validator: (name) {
                                                    log("name::$name");
                                                    return Validation()
                                                        .emailValidation(
                                                          context,
                                                          name,
                                                        );
                                                  },

                                                  controller: controller,
                                                  hintText: appFonts.enterEmail,
                                                  keyboardType: TextInputType
                                                      .emailAddress,
                                                  focusNode: emailFocusNodes[index],
                                                ).paddingDirectional(
                                                  top: Sizes.s8,
                                                  bottom: Sizes.s7,
                                                ),
                                          ),
                                          HSpace(Sizes.s10),
                                          if (emailControllers.length > 1)
                                            SvgPicture.asset(svgAssets.trash)
                                                .paddingDirectional(
                                                  all: Sizes.s12,
                                                )
                                                .decorated(
                                                  color: appColor(
                                                    context,
                                                  ).red.withValues(alpha: 0.1),
                                                  shape: BoxShape.circle,
                                                )
                                                .inkWell(
                                                  onTap: () =>
                                                      _removeEmailField(index),
                                                ),
                                        ],
                                      );
                                    },
                                  ),
                                ),

                                // 🔹 Invite More button
                                Text(
                                      appFonts.inviteMore,
                                      style: appCss.dmSansSemiBold16
                                          .textColor(appColor(context).primary)
                                          .underline,
                                    )
                                    .inkWell(onTap: _addEmailField)
                                    .center()
                                    .paddingDirectional(
                                      top: Sizes.s15,
                                      bottom: Sizes.s33,
                                    ),

                                // 🔹 Submit Button
                                BlocBuilder<AuthBloc, AuthState>(
                                  buildWhen: (prev, curr) =>
                                      (prev is AuthLoading) !=
                                      (curr is AuthLoading),
                                  builder: (context, state) {
                                    final isLoading = state is AuthLoading;
                                    return ButtonCommon(
                                      title: language(context, appFonts.done),
                                      isLoading: isLoading,
                                      onTap: isLoading
                                          ? null
                                          : () => onDonePressed(),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s100),
                  ],
                ),
                if (!_isDash)
                  remindMeLater(
                    context,
                    onTap: () => Navigator.pushReplacementNamed(
                      context,
                      routeName.chatChannelScreen,
                    ),
                  )
                else
                  const Spacer(flex: 1),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
