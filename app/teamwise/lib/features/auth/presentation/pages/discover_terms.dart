import 'dart:async';

import '../../../../config.dart';

class DiscoverTerms extends StatefulWidget {
  const DiscoverTerms({super.key});

  @override
  State<DiscoverTerms> createState() => _DiscoverTermsState();
}

class _DiscoverTermsState extends State<DiscoverTerms> {
  bool showLoader = true;
  TextEditingController searchController = TextEditingController();
  FocusNode searchFocus = FocusNode();
  bool hasSearched = false; // Track if user has searched
  bool isWelcome = false;

  @override
  void initState() {
    super.initState();
    searchController.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map?;
      if (args != null && args['isWelcome'] != null) {
        setState(() {
          isWelcome = args['isWelcome'];
        });
      }
    });
  }

  Timer? _debounce;

  void _onSearchChanged() {
    final term = searchController.text.trim();

    // If empty, reset search state
    if (term.isEmpty) {
      setState(() {
        hasSearched = false;
      });
      return;
    }

    if (_debounce?.isActive ?? false) _debounce!.cancel();

    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() {
        hasSearched = true;
      });
      context.read<AuthBloc>().add(
        FetchTeams(
          term: term,
          email: context.read<AuthBloc>().profileData?.email ?? '',
        ),
      );
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    searchController.dispose();
    searchFocus.dispose();
    super.dispose();
  }

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
                appColor(context).white,
                appColor(context).white,
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                Stack(
                  alignment: AlignmentGeometry.topCenter,
                  children: [
                    Container(
                      width: Sizes.s257,
                      height: Sizes.s335,
                      decoration: BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage(imageAssets.discoverTeamsBg),
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
                                appFonts.discoverTeams,
                                style: appCss.dmSansExtraBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              Text(
                                appFonts.lookForExisting,
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).lightText,
                                ),
                              ).paddingDirectional(
                                top: Sizes.s3,
                                bottom: Sizes.s17,
                              ),

                              // Search field
                              TextFieldCommon(
                                textInputAction: TextInputAction.done,
                                controller: searchController,
                                hintText: language(context, appFonts.search),
                                prefixIcon: svgAssets.search,
                                focusNode: searchFocus,
                              ),

                              // Show list only after search
                              if(searchController.text.isNotEmpty)
                              SizedBox(
                                height: 335,
                                child: !hasSearched
                                    ? const SizedBox.shrink() // Empty space jyare search na karyu hoy
                                    : BlocBuilder<AuthBloc, AuthState>(
                                  buildWhen: (previous, current) =>
                                  current is TeamListLoading ||
                                      current is TeamListLoaded,
                                  builder: (context, state) {
                                    if (state is TeamListLoading) {
                                      return Center(
                                        child: CircularProgressIndicator(),
                                      );
                                    } else if (state is TeamListLoaded) {
                                      final teams = state.teams;

                                      if (teams.isEmpty) {
                                        return Center(
                                          child: Column(
                                            mainAxisAlignment:
                                            MainAxisAlignment.center,
                                            children: [
                                              Image.asset(
                                                imageAssets.noData,
                                                height: Sizes.s200,
                                                width: Sizes.s200,
                                              ),
                                              VSpace(Sizes.s20),
                                              Text(
                                                appFonts.noDataFound,
                                                style: appCss
                                                    .dmSansSemiBold16
                                                    .textColor(appColor(
                                                    context)
                                                    .lightText),
                                              ),
                                            ],
                                          ),
                                        );
                                      }

                                      String getInitials(String? name) {
                                        if (name == null || name.isEmpty)
                                          return '';
                                        final parts =
                                        name.trim().split(' ');
                                        if (parts.length == 1) {
                                          final firstChar = parts[0][0];
                                          final secondChar =
                                          parts[0].length > 1
                                              ? parts[0][1]
                                              : ' ';
                                          return (firstChar + secondChar)
                                              .toUpperCase();
                                        } else {
                                          return (parts[0][0] +
                                              parts[1][0])
                                              .toUpperCase();
                                        }
                                      }

                                      return ListView.builder(
                                        padding: EdgeInsets.only(
                                          top: Sizes.s15,
                                        ),
                                        itemCount:
                                        (teams.length / 2).ceil(),
                                        shrinkWrap: true,
                                        itemBuilder: (context, rowIndex) {
                                          final leftIndex = rowIndex * 2;
                                          final rightIndex = leftIndex + 1;

                                          return Column(
                                            children: [
                                              if (rowIndex > 0)
                                                Divider(
                                                  thickness: 0,
                                                  color: appColor(
                                                    context,
                                                  ).lightText,
                                                  height: 0,
                                                ).padding(
                                                  top: Sizes.s20,
                                                  bottom: Sizes.s16,
                                                ),
                                              IntrinsicHeight(
                                                child: Row(
                                                  crossAxisAlignment:
                                                  CrossAxisAlignment
                                                      .start,
                                                  children: [
                                                    Expanded(
                                                      child: buildTeamItem(
                                                        context,
                                                        teams[leftIndex],
                                                        getInitials,
                                                        searchController,
                                                        isWelcome: isWelcome,
                                                      ),
                                                    ),
                                                    if (rightIndex <
                                                        teams.length) ...[
                                                      Container(
                                                        width: 0.09,
                                                        color: appColor(
                                                          context,
                                                        ).lightText,
                                                        margin:
                                                        const EdgeInsets
                                                            .symmetric(
                                                          horizontal: 5,
                                                        ),
                                                      ),
                                                      Expanded(
                                                        child:
                                                        buildTeamItem(
                                                          context,
                                                          teams[
                                                          rightIndex],
                                                          getInitials,
                                                          searchController,
                                                          isWelcome: isWelcome,
                                                        ),
                                                      ),
                                                    ] else
                                                      Expanded(
                                                        child: SizedBox
                                                            .shrink(),
                                                      ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          );
                                        },
                                      );
                                    }

                                    return const SizedBox.shrink();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ).padding(top: Sizes.s210),
                  ],
                ),
                Spacer(flex: 4),
                buildOrFooter(context),
              ],
            ),
          ),
        ),
      ),
    );
  }
}