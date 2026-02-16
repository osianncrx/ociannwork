import 'dart:developer';

import 'package:flutter/gestures.dart';

import '../../../../config.dart';
import '../../data/datasources/auth_api.dart';
import '../widgets/page_content_screen.dart';

class ReviewTerms extends StatefulWidget {
  const ReviewTerms({super.key});

  @override
  State<ReviewTerms> createState() => _ReviewTermsState();
}

class _ReviewTermsState extends State<ReviewTerms> {
  bool isWelcome= false;
  @override
  void didChangeDependencies() {
    // TODO: implement didChangeDependencies
    super.didChangeDependencies();
    final args =
    ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && args['isWelcome'] != null) {
      isWelcome = args['isWelcome'] ;
    }
  }

  var pages = serviceLocator<AuthApi>().pages;

  void openPage(String slug) {
    if (pages == null || pages!.isEmpty) {
      AppToast.showMessage("Content not available yet");
      return;
    }

    // Try to find the page by slug
    final page = pages?.firstWhere(
          (p) => p['slug'] == slug,
      orElse: () => {},
    );

    log("🔍 openPage slug: $slug");
    log("📄 Found page: $page");

    if (page!.isNotEmpty) {
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
  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthSuccess) {
          // Navigator.pushNamed(context, routeName.forgotPassScreen);
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
                // Top purple shade
                appColor(context).white, // Bottom
                appColor(context).white, // Bottom
              ],
            ),
          ),
          /*  decoration: BoxDecoration(
            image: DecorationImage(
              image: AssetImage(imageAssets.reviewTheTermsBG),
              alignment: Alignment.topCenter,
            ),
          ), */
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                /*   Spacer(flex: 2), */
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: Sizes.s257,
                      height: Sizes.s335,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.reviewBg),
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
                                appFonts.pleaseReviewTheTerms,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              VSpace(Sizes.s8),
                              Text(
                                appFonts.theseUserTermsOfService,
                                style: appCss.dmSansRegular14
                                    .textColor(appColor(context).lightText)
                                    .textHeight(1.9),
                              ).paddingDirectional(
                                top: Sizes.s3,
                                bottom: Sizes.s5,
                              ),

                              Text(
                                appFonts.byChoosing,
                                style: appCss.dmSansRegular14
                                    .textColor(appColor(context).lightText)
                                    .textHeight(1.9),
                              ),
                              if ((pages?.any((p) => p['slug'] == 'terms') ??
                                      false) ||
                                  (pages?.any(
                                        (p) => p['slug'] == 'privacy-policy',
                                      ) ??
                                      false))
                                RichText(
                                  text: TextSpan(
                                    style: appCss.dmSansMedium14.textColor(
                                      appColor(context).primary,
                                    ),
                                    children: [
                                      if (pages?.any(
                                            (p) => p['slug'] == 'terms',
                                          ) ??
                                          false)
                                        TextSpan(
                                          text: appFonts.termsOfUse,
                                          style: appCss.dmSansMedium14
                                              .textColor(
                                                appColor(context).primary,
                                              )
                                              .underline,
                                          recognizer: TapGestureRecognizer()
                                            ..onTap = () => openPage("terms"),
                                        ),
                                      if ((pages?.any(
                                                (p) => p['slug'] == 'terms',
                                              ) ??
                                              false) &&
                                          (pages?.any(
                                                (p) =>
                                                    p['slug'] ==
                                                    'privacy-policy',
                                              ) ??
                                              false))
                                        TextSpan(
                                          text: ' ${appFonts.and} ',
                                          style:
                                              appCss.dmSansMedium14.textColor(
                                            appColor(context).lightText,
                                          ),
                                        ),
                                      if (pages?.any(
                                            (p) =>
                                                p['slug'] == 'privacy-policy',
                                          ) ??
                                          false)
                                        TextSpan(
                                          text: appFonts.privacyPolicy,
                                          style: appCss.dmSansMedium14
                                              .textColor(
                                                appColor(context).primary,
                                              )
                                              .underline,
                                          recognizer: TapGestureRecognizer()
                                            ..onTap =
                                                () =>
                                                    openPage("privacy-policy"),
                                        ),
                                    ],
                                  ),
                                ).center().paddingDirectional(
                                  top: Sizes.s10,
                                  bottom: Sizes.s45,
                                ),

                              BlocBuilder<AuthBloc, AuthState>(
                                buildWhen: (prev, curr) =>
                                    (prev is AuthLoading) !=
                                    (curr is AuthLoading),
                                builder: (context, state) {
                                  final isLoading = state is AuthLoading;
                                  return ButtonCommon(
                                    title: language(context, appFonts.iAgree),
                                    isLoading: isLoading,
                                    onTap: isLoading
                                        ? null
                                        : () {
                                      if(isWelcome){Navigator.pushReplacementNamed(
                                        context,
                                        routeName.inviteTeamScreen,
                                      );}else{
                                            Navigator.pushReplacementNamed(
                                              context,
                                              routeName.profileSetupScreen,
                                            );
                                          }}
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
                Spacer(flex: 1),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
