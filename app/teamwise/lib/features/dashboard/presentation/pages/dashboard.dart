import 'dart:developer';
import 'dart:ui';

import 'package:flutter/scheduler.dart';
import 'package:teamwise/core/network/extensions.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_api.dart';
import 'package:teamwise/features/dashboard/presentation/widgets/settings_bottomshit.dart';

import '../../../../common/widgets/glass_button.dart';
import '../../../../config.dart';
import '../../../chat/socket_service.dart';
import '../../data/models/update_profile_model.dart';
import 'drawer.dart';

class Dashboard extends StatefulWidget {
  const Dashboard({super.key});

  @override
  State<Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<Dashboard> {
  final TextEditingController searchController = TextEditingController();
  final FocusNode searchFocus = FocusNode();
  int _selectedNavIndex = 0;
  bool isNavigating = false;

  late Future<UserDetailsResponse> _userDetailsFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    SocketService().setOnline();

    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && args['selectedIndex'] != null) {
      _selectedNavIndex = args['selectedIndex'] as int;
    }
  }

  @override
  void initState() {
    super.initState();
    SocketService().setOnline();

    _userDetailsFuture = serviceLocator<DashboardApi>().getUserDetails();
    serviceLocator<DashboardApi>().teamSetting();

    final authState = context.read<AuthBloc>().state;
    if (authState is AuthSuccess) {
      _initializeSocket(authState);
    }
    // Listen to onlineUsers changes
    SocketService().onlineUsers.addListener(() {
      log('👥 Online users updated');
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() {});
      });
    });

    SocketService().connectionStream.listen((isConnected) {
      if (mounted) setState(() {});
    });

    SocketService().onlineUsers.addListener(() {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() {});
      });
    });

    _setupDashboardSocketListeners();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardBloc>().add(ResetSelection());
      context.read<DashboardBloc>().add(
        LoadChats(showLoader: true),
      ); // ✅ Show loader on initial load
    });
  }

  void _setupDashboardSocketListeners() {
    log('🔔 Setting up Dashboard socket listeners');
    SocketService().onSocketEvent(SocketEvents.bulkStatusUpdate, (data) {
      log('🔔 Dashboard: userStatusUpdate event - Refreshing chat list');
      if (mounted) {
        context.read<DashboardBloc>().add(RefreshChats());
      }
    });
    SocketService().onSocketEvent(SocketEvents.channelUpdates, (data) {
      log('🔔 Dashboard: channelUpdates event - Refreshing chat list');
      if (mounted) {
        context.read<DashboardBloc>().add(RefreshChats());
      }
    });
    // Listen for new messages and refresh dashboard
    SocketService().onSocketEvent(SocketEvents.receiveMessage, (data) {
      log('🔔 Dashboard: receiveMessage event - Refreshing chat list');
      if (mounted) {
        // ✅ Background refresh without loader
        context.read<DashboardBloc>().add(RefreshChats());
      }
    });
  }

  Future<void> _initializeSocket(AuthSuccess authState) async {
    final teamId = AuthService().teamId;

    SocketService()
        .initializeSocket(
          AuthService().token ?? '',
          AuthService().teamId.toString(),
          AuthService().userId.toString(),
          AuthService().userName.toString(),
        )
        .then((_) {
          log('✅ Socket initialized with userId: ${authState.userId}');

          SocketService().onSocketEvent(SocketEvents.receiveMessage, (data) {
            log('📨 Socket message received in dashboard context');
            if (mounted) {
              // ✅ Background refresh
              context.read<DashboardBloc>().add(RefreshChats());
            }
          });
        });
  }

  @override
  void dispose() {
    // ✅ Cleanup socket listeners
    SocketService().socket?.off(SocketEvents.receiveMessage);
    // SocketService().socket?.off(SocketEvents.messageSent);

    searchFocus.dispose();
    searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (query.isEmpty) {
      context.read<DashboardBloc>().add(ClearSearch());
    } else {
      context.read<DashboardBloc>().add(SearchChats(query));
    }
  }

  void _clearSearch() {
    context.read<DashboardBloc>().add(ClearSearch());
    searchController.clear();
    searchFocus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, authState) {
          String? currentTeamId;

          if (authState is AuthSuccess) {
            currentTeamId = authState.teamId?.toString();
          }

          // Fallback to AuthService
          currentTeamId ??= AuthService().teamId.toString();

          return FutureBuilder<UserDetailsResponse>(
            future: _userDetailsFuture,
            builder: (context, snapshot) {
              final user = snapshot.data?.user;

              return TeamDrawer(
                currentTeamId: currentTeamId,
                profileColor: user?.profileColor,
                userName:
                    user?.name.toTitleCase() ??
                    (authState is AuthSuccess ? authState.userName : ''),
                userAvatar: user?.avatar ?? '',
              );
            },
          );
        },
      ),
      floatingActionButton:
          SvgPicture.asset(
                svgAssets.search,
                colorFilter: ColorFilter.mode(Colors.white, BlendMode.srcIn),
              )
              .padding(all: Sizes.s15)
              .decorated(
                color: appColor(context).primary,
                shape: BoxShape.circle,
              )
              .inkWell(
                onTap: () async {
                  route.pushNamed(context, routeName.globalSearchScreen);
                },
              ),
      resizeToAvoidBottomInset: false,
      body: Container(
        height: double.infinity,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              /* appTheme.commonBgColor,
                appTheme.white,
                appTheme.white, */
              appColor(context).commonBgColor,
              appColor(context).white, // Bottom
              appColor(context).white,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              BlocListener<AuthBloc, AuthState>(
                listener: (context, state) {
                  if (state is AuthSuccess) {
                    setState(() {
                      _userDetailsFuture = serviceLocator<DashboardApi>()
                          .getUserDetails();
                      // ✅ 2. Refresh Dashboard chat list automatically
                      context.read<DashboardBloc>().add(RefreshChats());
                    });
                  }
                },
                child: FutureBuilder<UserDetailsResponse>(
                  future: _userDetailsFuture,
                  builder: (context, snapshot) {
                    // If the snapshot has an error, show fallback text
                    if (snapshot.hasError) {
                      log("❌ Dashboard FutureBuilder Error: ${snapshot.error}");
                      log("❌ Dashboard Stacktrace: ${snapshot.stackTrace}");
                      return Row(
                        children: [
                          Text(
                            'No User Found',
                            style: appCss.dmSansMedium15.textColor(
                              appColor(context).white,
                            ),
                          ),
                          const Spacer(),
                          GlassButton(
                            icon: svgAssets.setting,
                            onTap: () async {
                              showModalBottomSheet(
                                context: context,
                                backgroundColor: appColor(context).white,
                                shape: const RoundedRectangleBorder(
                                  borderRadius: BorderRadius.vertical(
                                    top: Radius.circular(20),
                                  ),
                                ),
                                builder: (context) =>
                                    const SettingsBottomshit(),
                              );
                            },
                          ).paddingDirectional(horizontal: Sizes.s20),
                        ],
                      );
                    }

                    final user = snapshot.data?.user;
                    return ChatHeaderWidget(
                      profileColor: user?.profileColor,
                      userName:
                          user?.name.toTitleCase() ??
                          context.select<AuthBloc, String>((bloc) {
                            final state = bloc.state;
                            if (state is AuthSuccess &&
                                state.userName != null) {
                              return state.userName!;
                            }
                            return '';
                          }),

                      userAvatar: user?.avatar ?? '',
                      onMenuTap: () {},
                      onSettingsTap: () async {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: appColor(context).white,
                          shape: const RoundedRectangleBorder(
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(20),
                            ),
                          ),
                          builder: (context) => const SettingsBottomshit(),
                        );
                      },
                    );
                  },
                ),
              ),
              isDark(context)
                  ? GlassSearchBar(
                      focusNode: searchFocus,
                      hintText: appFonts.searchPeopleOrChannel,
                      controller: searchController,
                      onChanged: _onSearchChanged,
                      onClear: _clearSearch,
                    ).padding(vertical: Sizes.s10)
                  : SearchBarWidget(
                      hintText: appFonts.searchPeopleOrChannel,
                      focusNode: searchFocus,
                      controller: searchController,
                      onChanged: _onSearchChanged,
                      onClear: _clearSearch,
                    ),

              DashboardWidgets().buildChatsHeader(context, _selectedNavIndex),
              Expanded(
                child: DashboardWidgets().buildChatsList(
                  searchController.text,
                  _selectedNavIndex,
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: ClipRRect(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(Sizes.s11),
          topRight: Radius.circular(Sizes.s11),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15.0, sigmaY: 15.0),
          child: Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.10),
                  blurRadius: 10,
                  offset: const Offset(-3, -3),
                ),
              ],
            ),
            child: BottomNavigationWidget(
              selectedIndex: _selectedNavIndex,
              onItemTapped: (index) {
                setState(() {
                  _selectedNavIndex = index;
                });
              },
            ),
          ),
        ),
      ),
    );
  }
}
