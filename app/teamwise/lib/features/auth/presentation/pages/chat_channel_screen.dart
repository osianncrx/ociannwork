import 'dart:developer';

import '../../../../config.dart';

class ChatChannelScreen extends StatefulWidget {
  const ChatChannelScreen({super.key});

  @override
  State<ChatChannelScreen> createState() => _ChatChannelScreenState();
}

class _ChatChannelScreenState extends State<ChatChannelScreen> {
  // Selected index track karne ke liye (single selection)
  // Default ma 0 index selected hai
  int? selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
        } else if (state is AuthFailure) {
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

                appColor(context).white, // Bottom
                appColor(context).white, // Bottom
              ],
            ),
          ),
          /*  decoration: BoxDecoration(
            image: DecorationImage(
              image: AssetImage(imageAssets.chatBG),
              alignment: Alignment.topCenter,
            ),
          ), */
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                /*  Spacer(flex: 5), */
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
                                appFonts.connectThroughChannels,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),

                              Text(
                                appFonts.chooseATopic,
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).lightText,
                                ),
                              ).paddingDirectional(
                                top: Sizes.s3,
                                bottom: Sizes.s22,
                              ),

                              VSpace(Sizes.s30),
                              ListView.builder(
                                shrinkWrap: true,
                                physics: NeverScrollableScrollPhysics(),
                                itemCount: appArray.chatChannel.length,
                                itemBuilder: (context, index) {
                                  // final isSelected = selectedIndex == index;

                                  return GestureDetector(
                                    onTap: () {
                                      // setState(() {
                                      //   // Single selection: agar same item hai to deselect, nahi to select
                                      //   selectedIndex = selectedIndex == index
                                      //       ? null
                                      //       : index;
                                      // });
                                    },
                                    behavior: HitTestBehavior.opaque,

                                    child: Stack(
                                      clipBehavior: Clip.none,
                                      alignment: Alignment.topCenter,
                                      children: [
                                        Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                                Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.center,
                                                  mainAxisAlignment:
                                                      MainAxisAlignment.center,
                                                  children: [
                                                    Text(
                                                      appArray
                                                          .chatChannel[index]['title'],
                                                      style: appCss
                                                          .dmSansMedium14
                                                          .textColor(
                                                            appColor(
                                                              context,
                                                            ).darkText,
                                                          ),
                                                    ),
                                                    VSpace(Sizes.s3),
                                                    Text(
                                                      appArray
                                                          .chatChannel[index]['subTitle'],
                                                      style: appCss
                                                          .dmSansMedium14
                                                          .textColor(
                                                            appColor(
                                                              context,
                                                            ).lightText,
                                                          ),
                                                    ),
                                                  ],
                                                ).paddingDirectional(
                                                  top: Sizes.s10,
                                                ),
                                              ],
                                            )
                                            .paddingDirectional(
                                              horizontal: Sizes.s20,
                                              vertical: Sizes.s20,
                                            )
                                            .decorated(
                                              color: appColor(
                                                context,
                                              ).fieldCardBg,
                                              borderRadius:
                                                  BorderRadius.circular(
                                                    AppRadius.r5,
                                                  ),
                                              border: Border.all(
                                                color: appColor(context)
                                                    .lightText
                                                    .withValues(alpha: 0.5),
                                              ),
                                            )
                                            .paddingDirectional(
                                              bottom:
                                                  appArray.chatChannel.length -
                                                          1 ==
                                                      index
                                                  ? 0
                                                  : Sizes.s40,
                                            ),
                                        Positioned(
                                          top: -Sizes.s25,
                                          child:
                                              SvgPicture.asset(
                                                    appArray
                                                        .chatChannel[index]['svg'],
                                                    // ignore: deprecated_member_use
                                                    color: appColor(
                                                      context,
                                                    ).primary,
                                                  )
                                                  .paddingDirectional(
                                                    all: Sizes.s13,
                                                  )
                                                  .decorated(
                                                    color: appColor(
                                                      context,
                                                    ).fieldCardBg,
                                                    shape: BoxShape.circle,
                                                    border: Border.all(
                                                      color: appColor(
                                                        context,
                                                      ).bgColor,
                                                      width: 3,
                                                    ),
                                                  ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
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
                                            // Selected channel print karo
                                            if (selectedIndex != null) {
                                              log(
                                                'Selected channel index: $selectedIndex',
                                              );
                                              log(
                                                'Selected channel: ${appArray.chatChannel[selectedIndex!]}',
                                              );
                                            } else {
                                              log('No channel selected');
                                            }

                                            // Navigation logic
                                            Navigator.pushReplacementNamed(
                                              context,
                                              routeName.createChannelForm,
                                            );
                                          },
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s100),
                  ],
                ),
                Spacer(flex: 1),
                remindMeLater(context),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
