import 'dart:developer';

import '../../../../config.dart';

class CreateChannelForm extends StatefulWidget {
  const CreateChannelForm({super.key});

  @override
  State<CreateChannelForm> createState() => _CreateChannelFormState();
}

class _CreateChannelFormState extends State<CreateChannelForm> {
  final channelNameController = TextEditingController();
  final channelDesController = TextEditingController();

  FocusNode channelNameFocus = FocusNode();
  FocusNode channelDesFocus = FocusNode();
  int? selectedIndex = 1;
  TeamType selectedType = TeamType.public; // default selected value

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is ChannelCreatedSuccess) {
          AppToast.showMessage(state.channelData['message']);
          Navigator.pushReplacementNamed(context, routeName.dashboard);
        }
        if (state is ChannelCreationFailed) {
          AppToast.showError(state.error);
        }
      },
      child: WillPopScope(
        onWillPop: () async {
          // Go back to login screen
          Navigator.pushNamedAndRemoveUntil(
            context,
            routeName.login,
            (route) => false,
          );
          return false; // prevent default back action
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

                  appColor(context).white, // Bottom
                  appColor(context).white, // Bottom
                ],
              ),
            ),

            child: SafeArea(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  /* Spacer(flex: 2), */
                  Stack(
                    alignment: AlignmentGeometry.topCenter,
                    children: [
                      Container(
                        width: Sizes.s300,
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
                          CommonCardContainer(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  appFonts.giveYourFirst,
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),

                                Text(
                                  appFonts.youMayInitiate,
                                  style: appCss.dmSansRegular14.textColor(
                                    appColor(context).lightText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s3,
                                  bottom: Sizes.s20,
                                ),

                                Text(
                                  appFonts.channelName,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(bottom: Sizes.s8),
                                TextFieldCommon(
                                  validator: (name) => Validation()
                                      .nameValidation(context, name),
                                  controller: channelNameController,
                                  hintText: language(
                                    context,
                                    appFonts.channelName,
                                  ),
                                  keyboardType: TextInputType.name,
                                  focusNode: channelNameFocus,
                                ),

                                Text(
                                  appFonts.description,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s20,
                                  bottom: Sizes.s8,
                                ),
                                TextFieldCommon(
                                  validator: (name) => Validation()
                                      .nameValidation(context, name),
                                  controller: channelDesController,
                                  hintText: language(
                                    context,
                                    appFonts.description,
                                  ),
                                  focusNode: channelDesFocus,
                                ),
                                Text(
                                  appFonts.channelType,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s20,
                                  bottom: Sizes.s8,
                                ),

                                Container(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: Sizes.s16,
                                    vertical: Sizes.s4,
                                  ),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(
                                      Sizes.s8,
                                    ),
                                    border: Border.all(
                                      color: (isDark(context)
                                          ? appColor(
                                              context,
                                            ).gray.withValues(alpha: 0.2)
                                          : appColor(context).textFiledBorder),
                                    ),
                                  ),
                                  child: DropdownButton<TeamType>(
                                    isExpanded: true,
                                    value: selectedType,
                                    underline: SizedBox(),
                                    icon: Icon(Icons.keyboard_arrow_down),
                                    items: TeamType.values.map((type) {
                                      return DropdownMenuItem<TeamType>(
                                        value: type,
                                        child: Text(type.name.capitalize()),
                                      );
                                    }).toList(),
                                    onChanged: (TeamType? newType) {
                                      setState(() {
                                        if (newType != null)
                                          selectedType = newType;
                                      });
                                    },
                                  ),
                                ),

                                VSpace(Sizes.s33),
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
                                          : () {
                                              final name = channelNameController
                                                  .text
                                                  .trim();
                                              final description =
                                                  channelDesController.text
                                                      .trim();

                                              if (name.isEmpty) {
                                                AppToast.showError(
                                                  "Please enter a channel name",
                                                );
                                                return;
                                              }

                                              // Use selectedType enum directly (assuming you declared it as TeamType selectedType;)
                                              final type = selectedType.name;

                                              final data = {
                                                "name": name,
                                                "description": description,
                                                "type": type,
                                                "member_ids": [],
                                              };
                                              log("data::$data");

                                              // Dispatch event with this data
                                              context.read<AuthBloc>().add(
                                                CreateChannelEvent(data),
                                              );
                                            },
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ).padding(top: 100),
                    ],
                  ),
                  Spacer(flex: 1),
                  remindMeLater(context),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
