// ignore_for_file: use_build_context_synchronously

import 'dart:developer';
import 'package:teamwise/core/network/extensions.dart';
import 'package:teamwise/features/chat/presentation/bloc/chat_bloc.dart';
import 'package:teamwise/features/dashboard/presentation/widgets/team_member_Item_widget.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_api.dart';
import 'package:teamwise/features/dashboard/presentation/widgets/notification_bottomshit.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../chat/data/datasources/chat_Api.dart';
import '../../../chat/presentation/pages/chat_screen.dart';
import '../../../chat/socket_service.dart';
import 'chat_item_widget.dart';

class DashboardWidgets {
  // Widget buildChatsHeader(BuildContext context, int selectedIndex) {
  //   final title = selectedIndex == 0
  //       ? appFonts.chatsAndChannels
  //       : selectedIndex == 3
  //       ? 'More'
  //       : selectedIndex == 2
  //       ? 'Members'
  //       : "Channels";
  //
  //   return Row(
  //         mainAxisAlignment: MainAxisAlignment.spaceBetween,
  //         children: [
  //           Text(
  //             title,
  //             style: appCss.dmSansBold16.textColor(appColor(context).black),
  //           ),
  //           if (selectedIndex == 0) // only show menu for Conversations
  //             PopupMenuButton<String>(
  //               icon: Icon(
  //                 Icons.more_vert_outlined,
  //                 color: appColor(context).black,
  //               ),
  //               onSelected: (value) async {
  //                 switch (value) {
  //                   case 'Create Channel':
  //                     Navigator.pushNamed(context, routeName.channelsScreen);
  //                     break;
  //                   case 'Invite Members':
  //                     Navigator.pushNamed(context, routeName.inviteTeamScreen,arguments: {
  //                       'isDash': true,
  //                     });
  //                     break;
  //
  //                 }
  //               },
  //               itemBuilder: (_) => [
  //                 PopupMenuItem(
  //                   value: 'Create Channel',
  //                   child: Text(
  //                     "Create Channel",
  //                     style: appCss.dmSansMedium14.textColor(
  //                       appColor(context).darkText,
  //                     ),
  //                   ),
  //                 ),
  //                 PopupMenuItem(
  //                   value: 'Invite Members',
  //                   child: Text(
  //                     "Invite Members",
  //                     style: appCss.dmSansMedium14.textColor(
  //                       appColor(context).darkText,
  //                     ),
  //                   ),
  //                 ),
  //                 /*  PopupMenuItem(
  //                   value: 'Edit Profile',
  //                   child: Text(
  //                     "Edit Profile",
  //                     style: appCss.dmSansMedium14.textColor( appColor(context).darkText),
  //                   ),
  //                 ), */
  //               ],
  //             ),
  //         ],
  //       )
  //       .paddingDirectional(horizontal: Sizes.s20, bottom: Sizes.s13)
  //       .height(Sizes.s50);
  // }
  Widget buildChatsHeader(BuildContext context, int selectedIndex) {
    final title = selectedIndex == 0
        ? appFonts.chatsAndChannels
        : selectedIndex == 3
        ? 'More'
        : selectedIndex == 2
        ? 'Members'
        : "Channels";

    final authState = context.watch<AuthBloc>().state;
    bool isDNDActive = false;

    if (authState is AuthSuccess && authState.mutedUntil != null) {
      isDNDActive = true;
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: appCss.dmSansBold16.textColor(appColor(context).black),
            ),

            if (selectedIndex == 0 ||
                selectedIndex == 1) // only show menu for Conversations
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert_outlined,
                  color: appColor(context).black,
                ),
                onSelected: (value) async {
                  switch (value) {
                    case 'Create Channel':
                      Navigator.pushNamed(context, routeName.channelsScreen);
                      break;
                    case 'Invite Members':
                      Navigator.pushNamed(
                        context,
                        routeName.inviteTeamScreen,
                        arguments: {'isDash': true},
                      );
                      break;
                  }
                },
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'Create Channel',
                    child: Text(
                      "Create Channel",
                      style: appCss.dmSansMedium14.textColor(
                        appColor(context).darkText,
                      ),
                    ),
                  ),
                  PopupMenuItem(
                    value: 'Invite Members',
                    child: Text(
                      "Invite Members",
                      style: appCss.dmSansMedium14.textColor(
                        appColor(context).darkText,
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    ).paddingDirectional(horizontal: Sizes.s20, bottom: Sizes.s13);
  }

  bool isNavigating = false;
  Widget buildChatsList(String query, int selectedIndex) {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(20),
        topRight: Radius.circular(20),
      ),
      child: selectedIndex == 3
          ? _buildMoreDataList()
          : selectedIndex == 2
          ? _buildTeamMembersList(query)
          : BlocConsumer<DashboardBloc, DashboardState>(
              listenWhen: (previous, current) =>
                  current is ChatLoaded &&
                  previous is ChatLoaded &&
                  current.selectedChatId != previous.selectedChatId &&
                  current.selectedChatId != null &&
                  current.selectedChatType != null &&
                  !isNavigating,
              listener: (context, state) {
                // Set user online when returning to dashboard
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  SocketService().setOnline();
                });

                if (state is ChatLoaded &&
                    state.selectedChatId != null &&
                    state.selectedChatType != null &&
                    !isNavigating) {
                  _navigateToChat(context, state);
                }
              },
              builder: (context, state) {
                if (state is ChatLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is ChatError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 48,
                          color: appColor(context).gray,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: appCss.dmSansRegular14.textColor(
                            appColor(context).gray,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<DashboardBloc>().add(LoadChats());
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ).padding(all: 20),
                  );
                }

                if (state is ChatLoaded) {
                  final filteredChatsForTab = selectedIndex == 1
                      ? state.filteredChats
                            .where((chat) => chat.isChannel)
                            .toList()
                      : state.filteredChats;

                  if (filteredChatsForTab.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            selectedIndex == 1
                                ? Icons.tag
                                : Icons.chat_bubble_outline,
                            size: 64,
                            color: appColor(context).gray.withOpacity(0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            selectedIndex == 1
                                ? "No channels yet"
                                : query.isNotEmpty
                                ? "No results found"
                                : "No conversations yet",
                            style: appCss.dmSansMedium16.textColor(
                              appColor(context).gray,
                            ),
                          ),
                          if (query.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Try a different search term',
                              style: appCss.dmSansRegular12.textColor(
                                appColor(context).gray.withOpacity(0.7),
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }

                  return ValueListenableBuilder<Set<String>>(
                    valueListenable: SocketService().onlineUsers,
                    builder: (context, onlineUsers, _) {
                      return RefreshIndicator(
                        onRefresh: () async {
                          context.read<DashboardBloc>().add(RefreshChats());
                          // Wait a bit for refresh to complete
                          await Future.delayed(
                            const Duration(milliseconds: 500),
                          );
                        },
                        child: ListView.builder(
                          key: ValueKey(selectedIndex),
                          itemCount: filteredChatsForTab.length,
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemBuilder: (context, index) {
                            final chat = filteredChatsForTab[index];
                            final isOnline = chat.isDM
                                ? onlineUsers.contains(
                                    chat.recipientId?.toString() ?? '',
                                  )
                                : false;

                            return ChatItemWidget(
                              chat: chat,
                              isOnline: isOnline,
                              onTap: () {
                                log(
                                  '🖱️ Chat tapped: ${chat.name} (ID: ${chat.id})',
                                );
                                context.read<DashboardBloc>().add(
                                  SelectChat(chat.id, chat.chatType),
                                );

                                if (chat.unreadCount > 0) {
                                  context.read<DashboardBloc>().add(
                                    MarkReadChat(chat.id, chat.chatType),
                                  );
                                }
                              },
                              onPinToggle: () {
                                log('📌 Pin toggled for: ${chat.name}');
                                context.read<DashboardBloc>().add(
                                  TogglePinChat(chat.id),
                                );
                              },
                              showDivider:
                                  index < filteredChatsForTab.length - 1,
                            );
                          },
                        ),
                      );
                    },
                  );
                }

                return const SizedBox.shrink();
              },
            ),
    );
  }

  void _navigateToChat(BuildContext context, ChatLoaded state) {
    try {
      log(
        '🔍 Looking for chat with ID: ${state.selectedChatId} and Type: ${state.selectedChatType}',
      );

      final selectedChat = state.filteredChats.firstWhere(
        (chat) =>
            chat.id == state.selectedChatId &&
            chat.chatType == state.selectedChatType,
      );

      log('🎯 Selected Chat Details:');
      log('   - Name: ${selectedChat.name}');
      log('   - ID: ${selectedChat.id}');
      log('   - Type: ${selectedChat.chatType}');
      log('   - Channel ID: ${selectedChat.channelId}');
      log('   - Recipient ID: ${selectedChat.recipientId}');

      isNavigating = true;

      String recipientId;
      String? channelId;

      if (selectedChat.isChannel) {
        channelId = selectedChat.channelId ?? selectedChat.id.toString();
        recipientId = selectedChat.id.toString();

        ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).channelInfo(channelId: channelId);

        log('🔷 Navigating to CHANNEL: ${selectedChat.name}');
        log('   - Channel ID: $channelId');
      } else {
        recipientId = selectedChat.recipientId ?? selectedChat.id.toString();
        channelId = null;
        log('💬 Navigating to DM: ${selectedChat.name}');
        log('   - Recipient ID: $recipientId');
      }

      Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => BlocProvider(
                create: (_) {
                  log('🏗️ Creating ChatBloc with proper params: ');
                  log('   - recipientId: ${selectedChat.profileColor}');
                  log('   - channelId: $channelId');
                  return serviceLocator<ChatBloc>(
                    param1: recipientId,
                    param2: channelId,
                  )..add(LoadMessages());
                },

                child: ChatScreen(
                  recipientId: recipientId,
                  channelId: channelId,
                  recipientName: selectedChat.name,
                  recipientEmail: selectedChat.email,
                  recipientAvatar: "${selectedChat.avatarUrl}",
                  chatType: selectedChat.chatType,
                  profileColor: selectedChat.profileColor,
                ),
              ),
            ),
          )
          .then((_) {
            log('🔙 Returned from ChatScreen');
            isNavigating = false;
            context.read<DashboardBloc>().add(ResetSelection());
            context.read<DashboardBloc>().add(RefreshChats());
          })
          .catchError((error) {
            log('❌ Navigation error: $error');
            isNavigating = false;
            context.read<DashboardBloc>().add(ResetSelection());
          });
    } catch (e) {
      log('❌ Navigation exception: $e');
      isNavigating = false;
      context.read<DashboardBloc>().add(ResetSelection());
    }
  }

  /*
  Widget buildChatsList(String query, int selectedIndex) {
    return ClipRRect(
      borderRadius: BorderRadius.only(
        topLeft: Radius.circular(20),
        topRight: Radius.circular(20),
      ),
      child: selectedIndex == 3
          ? _buildMoreDataList()
          : selectedIndex == 2
          ? _buildTeamMembersList(query) // Show team members for index 3
          : BlocConsumer<DashboardBloc, DashboardState>(
              listenWhen: (previous, current) =>
                  current is ChatLoaded &&
                  previous is ChatLoaded &&
                  current.selectedChatId != previous.selectedChatId &&
                  current.selectedChatId != null &&
                  current.selectedChatType != null &&
                  !isNavigating,
              listener: (context, state) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  SocketService().setOnline();
                });

                if (state is ChatLoaded &&
                    state.selectedChatId != null &&
                    state.selectedChatType != null &&
                    !isNavigating) {
                  try {
                    log(
                      "🔍 Looking for chat with ID: ${state.selectedChatId} and Type: ${state.selectedChatType}",
                    );

                    // Find chat by BOTH ID and TYPE to avoid conflicts
                    final selectedChat = state.filteredChats.firstWhere(
                      (chat) =>
                          chat.id == state.selectedChatId &&
                          chat.chatType == state.selectedChatType,
                    );

                    log("🎯 Selected Chat Details:");
                    log("   - Name: ${selectedChat.name}");
                    log("   - ID: ${selectedChat.id}");
                    log("   - Type: ${selectedChat.chatType}");
                    log("   - Channel ID: ${selectedChat.channelId}");
                    log("   - Recipient ID: ${selectedChat.recipientId}");

                    isNavigating = true;

                    // Get proper navigation parameters
                    String recipientId;
                    String? channelId;
                    log("selectedChat.isChannel::${selectedChat.isChannel}");
                    if (selectedChat.isChannel) {
                      channelId =
                          selectedChat.channelId ?? selectedChat.id.toString();
                      recipientId = selectedChat.id
                          .toString(); // Required by ChatBloc constructor

                      ChatApi(
                        serviceLocator<AuthBloc>(),
                        serviceLocator<ApiManager>(),
                      ).channelInfo(channelId: channelId);
                      log('🔷 Navigating to CHANNEL: ${selectedChat.name}');
                      log('   - Channel ID: $channelId');
                      log('   - Recipient ID (placeholder): $recipientId');
                    } else {
                      // For DMs: recipientId = user ID, channelId = null
                      recipientId =
                          selectedChat.recipientId ??
                          selectedChat.id.toString();
                      channelId = null;
                      log('💬 Navigating to DM: ${selectedChat.name}');
                      log('   - Recipient ID: $recipientId');
                      log('   - Channel ID: null');
                    }

                    Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => BlocProvider(
                              create: (_) {
                                log(
                                  '🏗️ Creating ChatBloc with proper params:',
                                );
                                log('   - recipientId: $recipientId');
                                log('   - channelId: $channelId');
                                log('   - Chat type: ${selectedChat.chatType}');
                                log(
                                  'selectedChat.avatarUrl::${selectedChat.avatarUrl}',
                                );
                                return serviceLocator<ChatBloc>(
                                  param1: recipientId,
                                  param2: channelId,
                                )..add(LoadMessages());
                              },
                              child: ChatScreen(
                                recipientId: recipientId,
                                channelId: channelId,
                                recipientName: selectedChat.name,
                                recipientEmail: selectedChat.email,
                                recipientAvatar: "${selectedChat.avatarUrl}",
                                chatType: selectedChat.chatType,
                                profileColor: selectedChat.profileColor,
                              ),
                            ),
                          ),
                        )
                        .then((_) {
                          log('🔙 Returned from ChatScreen');
                          isNavigating = false;
                          context.read<DashboardBloc>().add(ResetSelection());
                          context.read<DashboardBloc>().add(RefreshChats());
                        })
                        .catchError((error) {
                          log('❌ Navigation error: $error');
                          isNavigating = false;
                          context.read<DashboardBloc>().add(ResetSelection());
                        });
                  } catch (e) {
                    log('❌ Navigation exception: $e');
                    log(
                      '❌ Could not find chat with ID: ${state.selectedChatId} and Type: ${state.selectedChatType}',
                    );
                    isNavigating = false;
                    context.read<DashboardBloc>().add(ResetSelection());
                  }
                }
              },
              builder: (context, state) {
                if (state is ChatLoaded) {
                  final filteredChatsForTab = selectedIndex == 1
                      ? state.filteredChats
                            .where((chat) => chat.isChannel)
                            .toList()
                      : state.filteredChats;
                  if (filteredChatsForTab.isEmpty ) {
                    return Center(
                      child: Text(
                        "No Data Found",
                        style: appCss.dmSansMedium16.textColor(
                          appColor(context).black,
                        ),
                      ),
                    );
                  }

                  if (filteredChatsForTab.isEmpty) {
                    return Center(
                      child: Text(
                        selectedIndex == 1
                            ? "No channels yet"
                            : selectedIndex == 2
                            ? "No team members yet"
                            : "No conversations yet",
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).gray,
                        ),
                      ),
                    );
                  }

                  return ValueListenableBuilder<Set<String>>(
                    valueListenable: SocketService().onlineUsers,
                    builder: (context, onlineUsers, _) {
                      String? highlightedChatId; // Je chat long-pressed che

                      return RefreshIndicator(
                        onRefresh: () async {
                          context.read<DashboardBloc>().add(RefreshChats());
                        },

                        child: ListView.builder(
                          key: ValueKey(selectedIndex),
                          itemCount: filteredChatsForTab.length,
                          itemBuilder: (context, index) {
                            final chat = filteredChatsForTab[index];
                            final isOnline = chat.isDM
                                ? onlineUsers.contains(
                                    chat.recipientId?.toString() ?? '',
                                  )
                                : false;

                            return ChatItemWidget(
                              chat: chat,
                              isOnline: isOnline,

                              onTap: () {
                                context.read<DashboardBloc>().add(
                                  SelectChat(chat.id, chat.chatType),
                                );

                                if (chat.unreadCount > 0) {
                                  context.read<DashboardBloc>().add(
                                    MarkReadChat(chat.id.toString()),
                                  );
                                }
                              },

                              onPinToggle: () {
                                context.read<DashboardBloc>().add(
                                  TogglePinChat(chat.id.toString()),
                                );
                              },
                              showDivider:
                                  index < state.filteredChats.length - 1,
                            );
                          },
                        ),
                      );
                    },
                  );
                }

                // 👇 Removed CircularProgressIndicator
                // Just return empty SizedBox during loading or other states
                return const CircularProgressIndicator().center();
              },
            ),
    );
  }
*/

  // Add this new method to build team members list
  Widget _buildTeamMembersList(String query) {
    return FutureBuilder<List<MessageModel>>(
      future: _loadTeamMembers(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
            child: CircularProgressIndicator(color: appColor(context).primary),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  color: appColor(context).gray,
                  size: 48,
                ),
                SizedBox(height: 16),
                Text(
                  "Failed to load team members",
                  style: TextStyle(color: appColor(context).gray),
                ),
                SizedBox(height: 8),
                TextButton(onPressed: () {}, child: Text("Retry")),
              ],
            ),
          );
        }

        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return Center(
            child: Text(
              "No team members found",
              style: TextStyle(color: appColor(context).gray),
            ),
          );
        }

        // Filter team members based on query
        final filteredMembers = query.isEmpty
            ? snapshot.data!
            : snapshot.data!
                  .where(
                    (member) =>
                        member.name.toLowerCase().contains(
                              query.toLowerCase(),
                            ) ==
                            true ||
                        member.email?.toLowerCase().contains(
                              query.toLowerCase(),
                            ) ==
                            true,
                  )
                  .toList();
        if (filteredMembers.isEmpty) {
          return Center(
            child: Text(
              "No team members match your search",
              style: TextStyle(color: appColor(context).gray),
            ),
          );
        }

        return ValueListenableBuilder<Set<String>>(
          valueListenable: SocketService().onlineUsers,
          builder: (context, onlineUsers, _) {
            return RefreshIndicator(
              onRefresh: () async {},
              child: ListView.builder(
                itemCount: filteredMembers.length,
                itemBuilder: (context, index) {
                  final member = filteredMembers[index];
                  final isOnline = onlineUsers.contains(
                    member.id.toString() ?? '',
                  );

                  return TeamMemberItemWidget(
                    member: member,
                    isOnline: isOnline,

                    onTap: () => _navigateToMemberChat(context, member),
                  );
                },
              ),
            );
          },
        );
      },
    );
  }

  List moreData = ['Files', 'Pinned', 'Favorites', 'Reminders'];
  List moreDataImages = [
    svgAssets.files,
    svgAssets.pin,
    svgAssets.star,
    svgAssets.clock,
  ];

  Widget _buildMoreDataList() {
    return GridView.builder(
      padding: EdgeInsets.symmetric(horizontal: Sizes.s20),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 2.8, // Adjust based on your icon size
      ),
      itemCount: moreData.length,
      itemBuilder: (context, index) {
        return Column(
          children: [
            Container(
              padding: EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: !isDark(context)
                    ? appColor(context).white
                    : Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(30),
                border: BoxBorder.all(
                  color: !isDark(context)
                      ? appColor(context).white
                      : appColor(context).gray.withValues(alpha: 0.2),
                ),
                boxShadow: [
                  BoxShadow(
                    color: !isDark(context)
                        ? appColor(context).white.withValues(alpha: 0.15)
                        : Colors.white.withValues(alpha: 0.0),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: appColor(context).primary,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: SvgPicture.asset(
                        moreDataImages[index],
                        color: Colors.white,
                      ),
                    ),
                  ),
                  HSpace(Sizes.s13),
                  Text(
                    "${moreData[index]}",
                    style: appCss.dmSansRegular16.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ),
            ),
            /* Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _getSvgIcon(moreData[index])
                /* .padding(all: Sizes.s30) */
                .decorated(
                  color:  appColor(context).red.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(Sizes.s10),
                ),
                SizedBox(height: 8),
                Text(
                  moreData[index],
                  style: TextStyle(fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ), */
          ],
        ).inkWell(
          onTap: () async {
            log("MOREDATA::${moreData[index]}");
            switch (moreData[index]) {
              case 'Reminders':
                {
                  final SharedPreferences prefs =
                      await SharedPreferences.getInstance();
                  final token = prefs.getString('token');
                  context.read<CreateReminderBloc>().add(
                    FetchRemindersEvent(token.toString()),
                  );
                  Navigator.pushNamed(context, routeName.remindersScreen);
                }

                break;
              case 'Favorites':
                Navigator.pushNamed(context, routeName.favoriteScreen);
                break;
              case 'Pinned':
                Navigator.pushNamed(context, routeName.pinMessageScreen);
                break;
              case 'Files':
                Navigator.pushNamed(context, routeName.filesScreen);
                break;
            }
          },
        );
      },
    );
  }

  Widget _getSvgIcon(String itemName, context) {
    switch (itemName) {
      case 'Files':
        return Icon(Icons.file_copy, color: appColor(context).white);

      case 'Pin':
        return Icon(Icons.pin, color: appColor(context).white);
      case 'Favorite':
        return Icon(Icons.star, color: appColor(context).white);

      /* SvgPicture.asset(
          'assets/icons/favorite.svg',
          width: 40,
          height: 40,
        );*/
      case 'Reminder':
        return Icon(Icons.access_alarm, color: appColor(context).white);

      /*SvgPicture.asset(
          'assets/icons/reminder.svg',
          width: 40,
          height: 40,
        );*/
      default:
        return SvgPicture.asset(
          'assets/icons/default.svg',
          width: 40,
          height: 40,
        );
    }
  }

  // Add this method to load team members
  Future<List<MessageModel>> _loadTeamMembers() async {
    try {
      final chatApi =
          serviceLocator<ChatApi>(); // or however you access your API
      return await chatApi.teamMembers();
    } catch (e, s) {
      log('Error loading team members: $e///$s');
      throw e;
    }
  }

  // Add this method to handle navigation to member chat
  void _navigateToMemberChat(BuildContext context, MessageModel member) async {
    try {
      log('🚀 Starting chat with team member:');
      log('   - Member ID: ${member.id}');
      log('   - Member Name: ${member.name}');
      log('   - Member Email: ${member.email}');

      final recipientId = member.id.toString();
      if (recipientId == null) {
        log('❌ Member ID is null, cannot start chat');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cannot start chat: Invalid member ID')),
        );
        return;
      }

      // Navigate to chat screen
      Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => BlocProvider(
                create: (_) {
                  log('🏗️ Creating ChatBloc for team member chat:');
                  log('   - recipientId: $recipientId');
                  log('   - channelId: null (DM)');

                  return serviceLocator<ChatBloc>(
                    param1: recipientId,
                    param2: null, // null for DM
                  )..add(LoadMessages());
                },
                child: ChatScreen(
                  recipientId: recipientId,
                  channelId: null,
                  recipientName: member.name,
                  recipientAvatar: member.avatarUrl ?? '',
                  chatType: member.chatType,
                ),
              ),
            ),
          )
          .then((_) {
            log('🔙 Returned from team member chat');
            // Refresh the dashboard if needed
            context.read<DashboardBloc>().add(RefreshChats());
          })
          .catchError((error) {
            log('❌ Team member chat navigation error: $error');
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to open chat: $error')),
            );
          });
    } catch (e) {
      log('❌ Exception in _navigateToMemberChat: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start chat with team member')),
      );
    }
  }
}
