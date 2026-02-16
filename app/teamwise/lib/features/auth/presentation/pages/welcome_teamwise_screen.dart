import 'dart:developer';

import 'package:teamwise/features/auth/data/auth_services.dart';

import '../../../../config.dart';

class WelcomeTeamwiseScreen extends StatefulWidget {
  const WelcomeTeamwiseScreen({super.key});

  @override
  State<WelcomeTeamwiseScreen> createState() => _WelcomeTeamwiseScreenState();
}

class _WelcomeTeamwiseScreenState extends State<WelcomeTeamwiseScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authBloc = context.read<AuthBloc>();
      if (authBloc.state is! TeamListLoaded) {
        final email = AuthService().userEmail;
        if (email != null) {
          authBloc.add(FetchTeams(email: email, term: ''));
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) async {
        if (state is AuthSuccess) {
          SharedPreferences preferences = await SharedPreferences.getInstance();

          final customFiled = preferences.getString("customFiled");
          log('state.fields::${state.fields}');
          if ( /* state.fields */ customFiled == null) {
            // Fields exist, go to CustomFieldsScreen
            Navigator.pushReplacementNamed(
              context,
              routeName.customFieldsScreen,
            );
          } else {
            // No custom fields, go directly to dashboard
            Navigator.pushNamedAndRemoveUntil(
              context,
              routeName.dashboard,
              (route) => false,
            );
          }
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

          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                VSpace(Sizes.s50),
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: 258,
                      height: 337,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.welcomeBg),
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
                                appFonts.welcome,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),

                              Text(
                                appFonts.joinYourTeam,
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).lightText,
                                ),
                              ).paddingDirectional(
                                top: Sizes.s3,
                                bottom: Sizes.s11,
                              ),

                              Row(
                                children: [
                                  Text(
                                    appFonts.teamsFor,
                                    style: appCss.dmSansRegular14.textColor(
                                      appColor(context).lightText,
                                    ),
                                  ),
                                  Text(
                                    " ${AuthService().userEmail ?? context.read<AuthBloc>().profileData?.email ?? ''}",
                                    style: appCss.dmSansMedium14.textColor(
                                      appColor(context).darkText,
                                    ),
                                  ),
                                ],
                              ),
                              VSpace(Sizes.s12),
                              BlocBuilder<AuthBloc, AuthState>(
                                builder: (context, state) {
                                  if (state is TeamListLoaded) {
                                    final joinedTeams = state.teams
                                        .where(
                                          (team) => team.status == 'joined',
                                        )
                                        .toList();

                                    final isScrollable = joinedTeams.length > 3;

                                    final listView = ListView.builder(
                                      shrinkWrap: !isScrollable,
                                      physics: isScrollable
                                          ? BouncingScrollPhysics()
                                          : NeverScrollableScrollPhysics(),
                                      itemCount: joinedTeams.length,
                                      itemBuilder: (context, index) {
                                        final team = joinedTeams[index];

                                        String getInitials(String? title) {
                                          if (title == null ||
                                              title.trim().isEmpty) {
                                            return '';
                                          }
                                          final words = title.trim().split(' ');
                                          return words
                                              .map(
                                                (word) => word[0].toUpperCase(),
                                              )
                                              .join();
                                        }

                                        return InkWell(
                                          borderRadius: BorderRadius.circular(
                                            AppRadius.r5,
                                          ),
                                            onTap: () {
                                              HapticFeedback.mediumImpact();
                                              final teamName = team.name;
                                              final teamId = team.id;
                                              context.read<AuthBloc>().add(
                                                SelectTeamEvent(teamName, teamId),
                                              );

                                            },
                                          child:
                                              Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .spaceBetween,
                                                    children: [
                                                      Row(
                                                        children: [
                                                          Text(
                                                                getInitials(
                                                                  team.name,
                                                                ),
                                                                style: appCss
                                                                    .dmSansSemiBold16,
                                                              )
                                                              .paddingDirectional(
                                                                all: Sizes.s12,
                                                              )
                                                              .decorated(
                                                                color:
                                                                    Theme.of(
                                                                          context,
                                                                        ).brightness ==
                                                                        Brightness
                                                                            .dark
                                                                    ? Colors
                                                                          .white
                                                                          .withOpacity(
                                                                            0.1,
                                                                          )
                                                                    : appColor(
                                                                        context,
                                                                      ).textFiledBorder,
                                                                shape: BoxShape
                                                                    .circle,
                                                              ),
                                                          HSpace(Sizes.s11),
                                                          Column(
                                                            crossAxisAlignment:
                                                                CrossAxisAlignment
                                                                    .start,
                                                            children: [
                                                              Text(
                                                                team.name ?? '',
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
                                                                "${team.memberCount} members",
                                                                style: appCss
                                                                    .dmSansMedium14
                                                                    .textColor(
                                                                      appColor(
                                                                        context,
                                                                      ).lightText,
                                                                    ),
                                                              ),
                                                            ],
                                                          ),
                                                        ],
                                                      ),
                                                      SvgPicture.asset(
                                                        svgAssets.arrowRight,
                                                        color: appColor(
                                                          context,
                                                        ).primary,
                                                      ),
                                                    ],
                                                  )
                                                  .paddingDirectional(
                                                    horizontal: Sizes.s15,
                                                    vertical: Sizes.s10,
                                                  )
                                                  .decorated(
                                                    color:
                                                        Theme.of(
                                                              context,
                                                            ).brightness ==
                                                            Brightness.dark
                                                        ? Colors.white
                                                              .withOpacity(0.1)
                                                        : appColor(
                                                            context,
                                                          ).textFieldFillColor,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          /*  AppRadius.r5, */ 50,
                                                        ),
                                                    border: Border.all(
                                                      color: appColor(
                                                        context,
                                                      ).textFiledBorder,
                                                    ),
                                                  )
                                                  .paddingDirectional(
                                                    bottom:
                                                        joinedTeams.length -
                                                                1 ==
                                                            index
                                                        ? 0
                                                        : Sizes.s18,
                                                  ),
                                        );
                                      },
                                    );

                                    return isScrollable
                                        ? SizedBox(
                                            height: 250,
                                            child: listView,
                                          ) // ⬅ Adjust height if needed
                                        : listView;
                                  } else if (state is AuthLoading) {
                                    return const CircularProgressIndicator();
                                  } else {
                                    return const SizedBox();
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s250),
                  ],
                ),
                Spacer(flex: 2),
                Row(crossAxisAlignment: CrossAxisAlignment.center,mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Want to add or join new team?",style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText)),
                    Text(" Add or Join",style: appCss.dmSansSemiBold14.textColor(appColor(context).primary).underline,).inkWell(onTap: () {
                      Navigator.pushNamed(context, routeName.createTeamScreen,arguments: {'isWelcome':true});

                    }),
                  ],
                ).padding(bottom: Sizes.s30)
              ],
            ),
          ),
        ),
      ),
    );
  }
}
