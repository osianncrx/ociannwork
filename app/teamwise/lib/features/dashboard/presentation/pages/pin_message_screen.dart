import 'dart:convert';
import 'dart:developer';
import 'package:intl/intl.dart';
import 'package:teamwise/features/chat/data/datasources/chat_Api.dart';
import 'package:teamwise/features/chat/presentation/bloc/chat_bloc.dart';
import 'package:teamwise/features/chat/presentation/pages/chat_screen.dart';
import 'package:teamwise/features/chat/socket_service.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_Api.dart';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import '../../../chat/data/models/chat_message_model.dart';

class PinMessageScreen extends StatefulWidget {
  const PinMessageScreen({super.key});

  @override
  State<PinMessageScreen> createState() => _PinMessageScreenState();
}

class _PinMessageScreenState extends State<PinMessageScreen> {
  List<MessageModel> chats = [];
  String? selectedChatKey;
  List<ChatMessageModel> pinnedMessages = [];
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadChats() async {
    try {
      setState(() => isLoading = true);
      final data = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).fetchChats();
      setState(() => chats = data);
      log("✅ Loaded ${data.length} chats");
    } catch (e) {
      log("❌ Error fetching chats: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> _loadMessages() async {
    try {
      setState(() => isLoading = true);
      final messages = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).filterMessages(filter: 'pin');

      // Filter only pinned messages
      final pinnedMsgs = messages.where((msg) => msg.isPinned == true).toList();

      setState(() => pinnedMessages = pinnedMsgs);
      log("📌 Loaded ${pinnedMsgs.length} pinned messages");
    } catch (e) {
      log("❌ Failed to load messages: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  // Unpin message and refresh list
  Future<void> _unpinMessage(String messageId) async {
    try {
      // Show loading indicator
      // AppToast.showLoading();

      // Call unpin API
      await ChatApi(
        context.read<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).unPinMessage(messageId);

      // Hide loading
      // AppToast.hideLoading();

      // Show success message
      // AppToast.showSuccess("Message unpinned successfully");

      // Refresh the list
      await _loadMessages();

      log("✅ Message $messageId unpinned successfully");
    } catch (e) {
      // AppToast.hideLoading();
      AppToast.showError("Failed to unpin message");
      log("❌ Failed to unpin message: $e");
    }
  }

  String _getCurrentUserName() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthSuccess) {
      return authState.userName ?? '';
    }
    return '';
  }

  String formatDateTime(DateTime dateTime) {
    // Convert UTC or any other timezone to local
    final localTime = dateTime.toLocal();

    // Format month and day
    String month = DateFormat('MMMM').format(localTime); // e.g. July
    int day = localTime.day;
    String suffix;

    if (day >= 11 && day <= 13) {
      suffix = 'th';
    } else {
      switch (day % 10) {
        case 1:
          suffix = 'st';
          break;
        case 2:
          suffix = 'nd';
          break;
        case 3:
          suffix = 'rd';
          break;
        default:
          suffix = 'th';
      }
    }

    // ✅ Use localTime here
    String time = DateFormat('hh:mm a').format(localTime);

    return '$month $day$suffix, $time';
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = _getCurrentUserName();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [appColor(context).commonBgColor, appColor(context).white],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Row(
                children: [
                  SvgPicture.asset(
                    svgAssets.arrowLeft,
                    color: appColor(context).black,
                  ).inkWell(onTap: () => route.pop(context)),
                  HSpace(Sizes.s7),
                  Text(
                    "Pinned Messages (${pinnedMessages.length})",
                    style: appCss.dmSansMedium20.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ).padding(horizontal: Sizes.s20, top: Sizes.s24),

              // Loading indicator
              if (isLoading)
                CircularProgressIndicator().center().paddingDirectional(
                  top: Sizes.s250,
                ),

              // Empty state or messages list
              VSpace(Sizes.s20),
              if (!isLoading)
                Expanded(
                  child: pinnedMessages.isEmpty
                      ? _buildEmptyState()
                      : ListView.separated(
                          padding: EdgeInsets.symmetric(vertical: Sizes.s10),
                          itemCount: pinnedMessages.length,
                          separatorBuilder: (context, index) =>
                              VSpace(Sizes.s10),
                          itemBuilder: (context, index) {
                            final msg = pinnedMessages[index];
                            final isCurrentUser = currentUser == msg.senderName;

                            return GestureDetector(
                              onTap: () => _openChatFromPinnedMessage(msg),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isDark(context)
                                      ? appColor(
                                          context,
                                        ).gray.withValues(alpha: 0.2)
                                      : appColor(context).white,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                padding: EdgeInsets.symmetric(
                                  horizontal: Sizes.s15,
                                  vertical: Sizes.s10,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        // Avatar
                                        Container(
                                          height: Sizes.s40,
                                          width: Sizes.s40,
                                          decoration: BoxDecoration(
                                            color: appColor(context).primary,
                                            borderRadius: BorderRadius.circular(
                                              Sizes.s15,
                                            ),
                                          ),
                                          child: msg.sender.avatar != null
                                              ? ClipRRect(
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                        Sizes.s15,
                                                      ),
                                                  child: Image.network(
                                                    msg.sender.avatar
                                                        .toString(),
                                                    fit: BoxFit.cover,
                                                  ),
                                                )
                                              : Text(
                                                  msg.senderName[0]
                                                      .toUpperCase(),
                                                  style: appCss.dmSansBold16
                                                      .textColor(
                                                        appColor(context).white,
                                                      ),
                                                ).center(),
                                        ),
                                        HSpace(Sizes.s10),

                                        // Message content
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              // Sender name and time
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    isCurrentUser
                                                        ? 'Me'
                                                        : msg.senderName,
                                                    style: appCss.dmSansBold16
                                                        .textColor(
                                                          appColor(
                                                            context,
                                                          ).darkText,
                                                        ),
                                                  ),
                                                  // Unpin button
                                                  SvgPicture.asset(
                                                    svgAssets.pin,
                                                    colorFilter:
                                                        ColorFilter.mode(
                                                          appColor(
                                                            context,
                                                          ).primary,
                                                          BlendMode.srcIn,
                                                        ),
                                                  ).inkWell(
                                                    onTap: () async {
                                                      // Show confirmation dialog

                                                      await _unpinMessage(
                                                        msg.id.toString(),
                                                      );
                                                    },
                                                  ),
                                                ],
                                              ),
                                              Text(
                                                msg.recipient.name,
                                                style: appCss.dmSansRegular12
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).lightText,
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    VSpace(Sizes.s9),
                                    Text(
                                      msg.plainTextContent,
                                      style: appCss.dmSansRegular14.textColor(
                                        appColor(context).darkText,
                                      ),
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    VSpace(Sizes.s5),

                                    // Message text
                                    Text(
                                      formatDateTime(
                                        DateTime.parse(msg.createdAt),
                                      ),
                                      style: appCss.dmSansMedium14.textColor(
                                        appColor(context).gray,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ).paddingSymmetric(horizontal: Sizes.s20),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SvgPicture.asset(
          svgAssets.pin,
          height: Sizes.s50,
          width: Sizes.s50,
          colorFilter: ColorFilter.mode(
            appColor(context).lightText,
            BlendMode.srcIn,
          ),
        ),
        VSpace(Sizes.s20),
        Text(
          selectedChatKey == null
              ? "No pinned messages found"
              : "No pinned messages in this chat",
          style: appCss.dmSansMedium16.textColor(appColor(context).lightText),
          textAlign: TextAlign.center,
        ).paddingSymmetric(horizontal: Sizes.s40),
      ],
    );
  }

  String _getChatName(ChatMessageModel message) {
    try {
      final selectedChat = chats.firstWhere((chat) {
        final value = chat.channelId ?? chat.recipientId;
        final type = chat.chatType ?? '';
        return '$type-$value' == selectedChatKey;
      });
      return selectedChat.name ?? 'Unknown Chat';
    } catch (e) {
      return 'Unknown Chat';
    }
  }

  void _openChatFromPinnedMessage(ChatMessageModel message) {
    // Get current user ID
    final authService = AuthService();
    final currentUserIdStr = authService.userId;
    if (currentUserIdStr == null) return;
    final currentUserId = int.parse(currentUserIdStr);

    bool isChannel = message.channelId != null;
    final messageId = message.id.toString();

    log('🎯 Opening chat from PIN: ID: $messageId, Channel: $isChannel');

    // ============= CHANNEL =============
    if (isChannel) {
      // Find channel name if possible, or use default
      String channelName = 'Channel';
      if (chats.isNotEmpty) {
        try {
          final chat = chats.firstWhere(
            (c) => c.channelId == message.channelId && c.chatType == 'channel',
          );
          channelName = chat.name ?? 'Channel';
        } catch (_) {}
      }

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => ChatBloc(
              messageService: serviceLocator<ChatApi>(),
              socketService: serviceLocator<SocketService>(),
              recipientId: '',
              channelId: message.channelId.toString(),
            )..add(LoadMessages()),
            child: ChatScreen(
              channelId: message.channelId.toString(),
              recipientId: '',
              recipientName: channelName,
              recipientAvatar: '',
              chatType: "channel",
              initialMessageId: messageId,
            ),
          ),
        ),
      );
      return;
    }

    // ============= DIRECT MESSAGE =============
    int otherUserId;
    String otherUserName;
    String otherUserAvatar;
    String? otherUserEmail;

    if (message.senderId == currentUserId) {
      otherUserId = message.recipientId;
      otherUserName = message.recipientName;
      otherUserAvatar = message.recipient.avatar ?? "";
      otherUserEmail = message.recipient.email;
    } else {
      otherUserId = message.senderId;
      otherUserName = message.senderName;
      otherUserAvatar = message.sender.avatar ?? "";
      otherUserEmail = message.sender.email;
    }

    log('🎯 DM from PIN - OtherUserId: $otherUserId, MessageId: $messageId');

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BlocProvider(
          create: (_) => ChatBloc(
            messageService: serviceLocator<ChatApi>(),
            socketService: serviceLocator<SocketService>(),
            recipientId: otherUserId.toString(),
            channelId: null,
          )..add(LoadMessages()),
          child: ChatScreen(
            channelId: null,
            recipientId: otherUserId.toString(),
            recipientName: otherUserName,
            recipientAvatar: otherUserAvatar,
            chatType: "dm",
            recipientEmail: otherUserEmail,
            initialMessageId: messageId,
          ),
        ),
      ),
    );
  }
}
