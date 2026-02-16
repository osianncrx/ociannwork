import 'dart:convert';
import 'dart:developer';
import 'package:intl/intl.dart';
import 'package:teamwise/features/chat/data/datasources/chat_Api.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_Api.dart';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../chat/data/models/chat_message_model.dart';

class FavoriteScreen extends StatefulWidget {
  const FavoriteScreen({super.key});

  @override
  State<FavoriteScreen> createState() => _FavoriteScreenState();
}

class _FavoriteScreenState extends State<FavoriteScreen> {
  List<MessageModel> chats = [];
  String? selectedChatKey;
  List<ChatMessageModel> favoriteMessages = [];
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

  Future<void> _loadMessages({String? recipientId, String? channelId}) async {
    try {
      setState(() => isLoading = true);
      final messages = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).filterMessages(filter: 'fav');

      // Filter only favorites
      final favMessages = messages
          .where((msg) => msg.isFavorite == true)
          .toList();

      setState(() => favoriteMessages = favMessages);
      log("⭐ Loaded ${favMessages.length} favorite messages");
    } catch (e) {
      log("❌ Failed to load messages: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  String _getCurrentUserName() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthSuccess) {
      return authState.userName??'';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = _getCurrentUserName();

    return Scaffold(
      /*  appBar: AppBar(
        backgroundColor:  appColor(context).commonBgColor,
        title: Text(
          "My Favorites (${favoriteMessages.length})",
          style: appCss.dmSansMedium16.textColor( appColor(context).darkText),
        ),
        centerTitle: true,
      ), */
      body: Container(
        height: double.infinity,
        width: double.infinity,
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
                    "My Favorites (${favoriteMessages.length})",
                    style: appCss.dmSansMedium20.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ).padding(horizontal: Sizes.s20, top: Sizes.s24),
              // Dropdown for conversation selection
              /*   Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: Sizes.s20,
                  vertical: Sizes.s20,
                ),
                child: DropdownButtonFormField<String>(
                  value: selectedChatKey,
                  hint: Text(
                    "Select Conversation",
                    style: appCss.dmSansRegular14.textColor( appColor(context).black),
                  ),
                  items: chats.map((chat) {
                    final value = chat.channelId ?? chat.recipientId;
                    final type = chat.chatType ?? '';
                    return DropdownMenuItem<String>(
                      value: '$type-$value',
                      child: Text(chat.name ?? 'Unknown Chat'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() => selectedChatKey = val);
                    final selectedChat = chats.firstWhere((chat) {
                      final value = chat.channelId ?? chat.recipientId;
                      final type = chat.chatType ?? '';
                      return '$type-$value' == val;
                    });
          
                    if (selectedChat.chatType == 'channel') {
                      _loadMessages(channelId: selectedChat.channelId.toString());
                    } else {
                      _loadMessages(
                        recipientId: selectedChat.recipientId.toString(),
                      );
                    }
                  },
                  decoration: InputDecoration(
                    filled: true,
                    fillColor:  appColor(context).white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.r30),
                    ),
                  ),
                ),
              ),*/

              // Loading indicator
              if (isLoading)
                CircularProgressIndicator().center().paddingSymmetric(
                  vertical: Sizes.s20,
                ),

              // Empty state or messages list
              VSpace(Sizes.s20),
              if (!isLoading)
              Expanded(
                child: favoriteMessages.isEmpty
                    ? _buildEmptyState()
                    : ListView.separated(
                        padding: EdgeInsets.symmetric(vertical: Sizes.s10),
                        itemCount: favoriteMessages.length,
                        separatorBuilder: (context, index) => VSpace(Sizes.s10),
                        itemBuilder: (context, index) {
                          final msg = favoriteMessages[index];
                          final isCurrentUser = currentUser == msg.senderName;

                          return Container(
                            decoration: BoxDecoration(
                              color: isDark(context)?appColor(context).gray.withValues(alpha: 0.2):appColor(context).white,
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
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                                                msg.sender.avatar.toString(),
                                                fit: BoxFit.cover,
                                              ),
                                            )
                                          : Text(
                                              msg.senderName[0].toUpperCase(),
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
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                isCurrentUser
                                                    ? 'Me'
                                                    : msg.senderName,
                                                style: appCss.dmSansMedium15
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).darkText,
                                                    ),
                                              ),
                                              Icon(
                                                Icons.star,
                                                color: appColor(context).yellow,
                                                size: 18,
                                              ).inkWell(onTap: () async {
                                                await ChatApi(
                                                serviceLocator<AuthBloc>(),
                                                serviceLocator<ApiManager>(),
                                                ).removeFavoriteMessage(msg.id.toString(),);      await _loadMessages();
                                              },),
                                              /*  SvgPicture.asset(svgAssets.pin), */
                                            ],
                                          ),
                                          Text(
                                            formatDateTime(
                                              DateTime.parse(msg.createdAt),
                                            ),
                                            style: appCss.dmSansMedium14
                                                .textColor(
                                                  appColor(context).gray,
                                                ),
                                          ),
                                          /*  Text(
                                            msg.recipient.name,
                                            style: appCss.dmSansRegular12.textColor(
                                               appColor(context).lightText,
                                            ),
                                          ), */
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
                              ],
                            ),
                          );
                        },
                      ).paddingSymmetric(horizontal: Sizes.s20),
                /* ListView.separated(
                        padding: EdgeInsets.symmetric(vertical: Sizes.s10),
                        itemCount: favoriteMessages.length,
                        separatorBuilder: (context, index) => Divider(height: 1),
                        itemBuilder: (context, index) {
                          final msg = favoriteMessages[index];
                          final isCurrentUser = currentUser == msg.senderName;
          
                          return Container(
                            color:  appColor(context).white,
                            padding: EdgeInsets.symmetric(
                              horizontal: Sizes.s15,
                              vertical: Sizes.s10,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Avatar
                                Container(
                                  height: Sizes.s40,
                                  width: Sizes.s40,
                                  decoration: BoxDecoration(
                                    color:  appColor(context).primary,
                                    borderRadius: BorderRadius.circular(Sizes.s15),
                                  ),
                                  child: msg.sender.avatar != null
                                      ? ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            Sizes.s15,
                                          ),
                                          child: Image.network(
                                            msg.sender.avatar.toString(),
                                            fit: BoxFit.cover,
                                          ),
                                        )
                                      : Text(
                                          msg.senderName[0].toUpperCase(),
                                          style: appCss.dmSansBold16.textColor(
                                             appColor(context).white,
                                          ),
                                        ).center(),
                                ),
          
                                HSpace(Sizes.s10),
          
                                // Message content
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Sender name and time
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            isCurrentUser ? 'Me' : msg.senderName,
                                            style: appCss.dmSansBold16.textColor(
                                               appColor(context).darkText,
                                            ),
                                          ),
                                          Text(
                                            DateFormat(
                                              'hh:mm a',
                                            ).format(DateTime.parse(msg.createdAt)),
                                            style: appCss.dmSansRegular12.textColor(
                                               appColor(context).lightText,
                                            ),
                                          ),
                                        ],
                                      ),
          
                                      VSpace(Sizes.s5),
          
                                      // Message text
                                      Text(
                                        msg.plainTextContent,
                                        style: appCss.dmSansRegular14.textColor(
                                           appColor(context).darkText,
                                        ),
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
          
                                      VSpace(Sizes.s5),
          
                                      // Chat name and favorite indicator
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.star,
                                            color: Colors.yellow,
                                            size: Sizes.s14,
                                          ),
                                          HSpace(Sizes.s5),
                                          Text(
                                            msg.recipient.name,
                                            style: appCss.dmSansRegular12.textColor(
                                               appColor(context).lightText,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ), */
              ),
            ],
          ),
        ),
      ),
    );
  }

  String formatDateTime(DateTime dateTime) {
    // Format month and day
    String month = DateFormat('MMMM').format(dateTime); // July
    int day = dateTime.day;
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

    // Format time
    String time = DateFormat('hh:mm a').format(dateTime); // 10:14 AM

    // Combine all parts
    return '$month $day$suffix, $time';
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.favorite_border,
          size: Sizes.s60,
          color: appColor(context).lightText,
        ),
        VSpace(Sizes.s20),
        Text(
          selectedChatKey == null
              ? "Select a conversation to view favorites"
              : "No favorite messages in this chat",
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
}
