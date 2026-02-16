import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../config.dart';
import '../../../../core/network/app_constants.dart';
import '../../../auth/data/auth_services.dart';
import '../../../auth/data/models/team_model.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class TeamDrawer extends StatefulWidget {
  final String? currentTeamId;
  final String? userName;
  final String? userAvatar;
  final String? profileColor;

  const TeamDrawer({
    super.key,
    this.currentTeamId,
    this.userName,
    this.profileColor,
    this.userAvatar,
  });

  @override
  State<TeamDrawer> createState() => _TeamDrawerState();
}

class _TeamDrawerState extends State<TeamDrawer> {
  List<TeamModel> userTeams = [];
  String? selectedTeamId;

  @override
  void initState() {
    super.initState();
    selectedTeamId = AuthService().teamId.toString();
    log(
      "🚀 Drawer initialized with currentTeamId: ${AuthService().teamId.toString()}",
    );
    log("🚀 selectedTeamId set to: $selectedTeamId");
    final email = AuthService().userEmail;
    log("📧 Fetching teams for user: $email");
    context.read<AuthBloc>().add(FetchTeams(email: email));
  }

  @override
  void didUpdateWidget(TeamDrawer oldWidget) {
    super.didUpdateWidget(oldWidget);
    // ✅ Update selectedTeamId if parent passes new currentTeamId
    if (AuthService().teamId.toString() != oldWidget.currentTeamId) {
      setState(() {
        selectedTeamId = AuthService().teamId.toString();
      });
      log("🔄 Updated selectedTeamId from widget: $selectedTeamId");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: BlocListener<AuthBloc, AuthState>(
          listener: (context, state) {
            if (state is TeamListLoaded) {
              final joinedTeams = state.teams
                  .where((team) => team.status == 'joined')
                  .toList();

              log("✅ Loaded ${joinedTeams.length} joined teams for user");
              setState(() {
                userTeams = joinedTeams;
              });
            }

            // ✅ Update selectedTeamId when team selection succeeds
            if (state is AuthSuccess && state.teamId != null) {
              log("✅ Team switched successfully to ID: ${state.teamId}");
              if (selectedTeamId != state.teamId.toString()) {
                setState(() {
                  selectedTeamId = state.teamId.toString();
                });

                log("✅ selectedTeamId updated to: $selectedTeamId");

                // Find and log the team name
                final newTeam = userTeams.firstWhere(
                  (t) => t.id.toString() == state.teamId.toString(),
                  orElse: () => userTeams.first,
                );
                log("✅ Current team is now: ${newTeam.name}");
              }
            }

            // ✅ If selectedTeamId is still null, set it from AuthSuccess state
            if (state is AuthSuccess &&
                selectedTeamId == null &&
                state.teamId != null) {
              log("🔧 Fixing null selectedTeamId with: ${state.teamId}");
              setState(() {
                selectedTeamId = state.teamId.toString();
              });
            }
          },
          child: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              if (state is AuthLoading) {
                return Center(
                  child: CircularProgressIndicator(
                    color: appColor(context).primary,
                  ),
                );
              }

              if (userTeams.isNotEmpty) {
                // ✅ Find current team by selectedTeamId (dynamic)
                final currentTeam = userTeams.firstWhere(
                  (t) => t.id.toString() == selectedTeamId,
                  orElse: () => userTeams.first,
                );

                log(
                  "🎯 Current Team Display: ${currentTeam.name} (ID: ${currentTeam.id})",
                );

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // User Info
                    Row(
                      children: [
                        Container(
                          width: Sizes.s42,
                          height: Sizes.s42,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: appColor(context).darkText,
                            ),

                            color: _getProfileColor(context),
                            // ✅ Use hex color from API
                            borderRadius: BorderRadius.circular(Sizes.s10),
                            image:
                                (widget.userAvatar != null &&
                                    widget.userAvatar!.isNotEmpty)
                                ? DecorationImage(
                                    image: NetworkImage(
                                      "${AppConstants.appUrl}${widget.userAvatar}",
                                    ),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          child:
                              (widget.userAvatar == null ||
                                  widget.userAvatar!.isEmpty)
                              ? Text(
                                  (AuthService().userName?.isNotEmpty ?? false)
                                      ? AuthService().userName!.substring(0, 1)
                                      : "",
                                  style: appCss.dmSansMedium18.textColor(
                                    Colors.black,
                                  ),
                                ).center()
                              : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            AuthService().userName ?? "User",
                            style: appCss.dmSansBold16.textColor(
                              appColor(context).darkText,
                            ),
                          ),
                        ),
                      ],
                    ),
                    VSpace(Sizes.s20),
                    Text(
                      "All Teams",
                      style: appCss.dmSansBold16.textColor(
                        appColor(context).darkText,
                      ),
                    ),
                    VSpace(Sizes.s8),
                    // All joined teams list
                    ...userTeams.map((team) {
                      return _teamTile(team);
                    }),
                  ],
                );
              }

              if (state is AuthFailure) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      "Failed to load teams: ${state.error}",
                      style: const TextStyle(color: Colors.redAccent),
                      textAlign: TextAlign.center,
                    ),
                  ),
                );
              }

              return Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text(
                    "No joined teams found for your account",
                    style: appCss.dmSansBold12.textColor(
                      appColor(context).darkText,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Color _getProfileColor(BuildContext context) {
    if (widget.profileColor == null || widget.profileColor!.isEmpty) {
      return appColor(context).primary; // Fallback to primary color
    }

    try {
      // Remove '#' if present and add '0xff' prefix for Flutter Color
      String colorString = widget.profileColor!.replaceAll('#', '');

      // Handle 3-digit hex colors (e.g., #FFF -> #FFFFFF)
      if (colorString.length == 3) {
        colorString = colorString.split('').map((c) => c + c).join();
      }

      return Color(int.parse('0xff$colorString'));
    } catch (e) {
      // If parsing fails, return primary color
      return appColor(context).primary;
    }
  }

  /// Reusable team tile with enhanced highlighting
  Widget _teamTile(TeamModel team, {bool isCurrent = false}) {
    String getInitials(String? title) {
      if (title == null || title.trim().isEmpty) return '?';
      final words = title.trim().split(' ');
      return words
          .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
          .take(2)
          .join();
    }

    // Check if this team is currently selected
    // ✅ Handle both int and String comparison
    final bool isActive =
        selectedTeamId == team.id.toString() ||
        selectedTeamId == team.id.toString();

    log(
      "🔍 Checking team: ${team.name} (ID: ${team.id}) | selectedTeamId: $selectedTeamId | isActive: $isActive",
    );

    // Enhanced color scheme for better highlighting
    final bgColor = isActive
        ? appColor(context).primary.withValues(alpha: 0.25)
        : appColor(context).darkText.withValues(alpha: 0.03);

    final borderColor = isActive
        ? appColor(context).primary
        : appColor(context).darkText.withValues(alpha: 0.05);

    final borderWidth = isActive ? 2.0 : 1.0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(50),
          onTap: () async {
            final teamIdString = team.id.toString();
            log(
              "🔘 Tapped team: ${team.name} (ID: $teamIdString) | Current selectedTeamId: $selectedTeamId | teamlength ${team.memberCount}",
            );

            if (selectedTeamId != teamIdString) {
              log("🌀 Switching to team: ${team.name} (ID: ${team.id})");

              // ✅ Optimistically update UI
              setState(() {
                selectedTeamId = teamIdString;
              });
              SharedPreferences pref = await SharedPreferences.getInstance();
              pref.setString("teamId", team.id.toString());
              log("✅ Updated selectedTeamId to: $selectedTeamId");

              HapticFeedback.mediumImpact();
              Navigator.pop(context);

              // Fire bloc event
              context.read<AuthBloc>().add(SelectTeamEvent(team.name, team.id));
            } else {
              log("⚠️ Team already selected: ${team.name}");
            }
          },
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: Sizes.s15,
              vertical: Sizes.s12,
            ),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(50),
              border: Border.all(color: borderColor, width: borderWidth),
              // Add subtle shadow for selected team
              boxShadow: isActive
                  ? [
                      BoxShadow(
                        color: appColor(context).primary.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Left side (team initials + name)
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        height: Sizes.s30,
                        width: Sizes.s30,
                        decoration: BoxDecoration(
                          color: appColor(context).primary,
                          borderRadius: BorderRadius.circular(Sizes.s8),
                        ),
                        child: Text(
                          getInitials(team.name),
                          style: appCss.dmSansSemiBold15.textColor(
                            appColor(context).white,
                          ),
                        ).center(),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              team.name,
                              style: TextStyle(
                                color: appColor(context).darkText,
                                fontWeight: isActive
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                fontSize: 15,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "${team.memberCount} members",
                              style: appCss.dmSansMedium10.textColor(
                                appColor(context).darkText,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Right side icon
                Icon(
                  Icons.arrow_forward_ios,
                  color: appColor(context).darkText,
                  size: Sizes.s18,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
