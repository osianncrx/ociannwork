import 'dart:developer';

import 'package:intl/intl.dart';
import 'package:teamwise/config.dart';
import 'package:teamwise/core/network/api_manger.dart';
import 'package:teamwise/core/utils/quill_parser.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import 'package:teamwise/features/chat/data/datasources/chat_Api.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_Api.dart';

import '../../../chat/presentation/bloc/chat_bloc.dart';
import '../../../chat/presentation/pages/chat_screen.dart';
import '../../../chat/socket_service.dart';
import '../../data/models/global_search_model.dart';

class GlobalSearchScreen extends StatefulWidget {
  const GlobalSearchScreen({super.key});

  @override
  State<GlobalSearchScreen> createState() => _GlobalSearchScreenState();
}

class _GlobalSearchScreenState extends State<GlobalSearchScreen> {
  final searchController = TextEditingController();
  final FocusNode searchFocus = FocusNode();
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  bool isadvancedSearch = false;
  MessageModel? selectedChat;
  String generateChatId(int user1, int user2) {
    if (user1 < user2) {
      return "${user1}_${user2}";
    }
    return "${user2}_${user1}";
  }
  // Update the openChatFromSearch method in GlobalSearchScreen

  void openChatFromSearch({
    required BuildContext context,
    required Messages message,
    required int currentUserId,
  }) {
    bool isChannel = message.channelId != null;

    // Get message ID safely
    final messageId = message.id?.toString() ?? '';
    log('🎯 Opening chat with message ID: $messageId, Channel: $isChannel');

    // ============= CHANNEL =============
    if (isChannel) {
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
              recipientName: message.channel?.name ?? 'Channel',
              recipientAvatar: '' ?? '',
              chatType: "channel",
              initialMessageId: messageId, // ✅ Pass message ID
            ),
          ),
        ),
      );
      return;
    }

    // ============= DIRECT MESSAGE =============
    late int otherUserId;

    if (message.senderId == currentUserId) {
      otherUserId = message.recipientId!;
    } else {
      otherUserId = message.senderId!;
    }

    // Get receiver object
    final receiver = message.senderId == currentUserId
        ? message.recipient
        : message.sender;

    log('🎯 DM - OtherUserId: $otherUserId, MessageId: $messageId');

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
            recipientName: receiver?.name ?? "Unknown",
            recipientAvatar: receiver?.avatar ?? "",
            chatType: "dm",
            recipientEmail: receiver?.email,
            initialMessageId: messageId, // ✅ Pass message ID
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Container(
        height: double.infinity,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [appColor(context).commonBgColor, appColor(context).white],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  SvgPicture.asset(
                    svgAssets.arrowLeft,
                    color: appColor(context).black,
                  ).inkWell(onTap: () => route.pop(context)),
                  HSpace(Sizes.s7),
                  Text(
                    "Messages",
                    style: appCss.dmSansMedium20.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ).padding(horizontal: Sizes.s20, top: Sizes.s24),
              Theme.of(context).brightness == Brightness.dark
                  ? GlassSearchBar(
                      focusNode: searchFocus,
                      controller: searchController,
                      onChanged: (v) async {
                        if (v.trim().length < 3) {
                          setState(() {
                            _searchResults = [];
                            _isSearching = false;
                          });
                          return;
                        }

                        setState(() {
                          _isSearching = true;
                        });

                        final results = await ChatApi(
                          serviceLocator<AuthBloc>(),
                          serviceLocator<ApiManager>(),
                        ).searchMessages(query: v, scopType: 'global');

                        setState(() {
                          _searchResults = results;
                        });
                      },
                    ).padding(vertical: Sizes.s15)
                  : SearchBarWidget(
                      controller: searchController,
                      focusNode: searchFocus,
                      hintText: appFonts.startMessaging,
                      onChanged: (v) async {
                        if (v.trim().length < 2) {
                          setState(() {
                            _searchResults = [];
                            _isSearching = false;
                          });
                          return;
                        }

                        setState(() {
                          _isSearching = true;
                        });

                        final results = await ChatApi(
                          serviceLocator<AuthBloc>(),
                          serviceLocator<ApiManager>(),
                        ).searchMessages(query: v, scopType: 'global');

                        setState(() {
                          _searchResults = results;
                        });
                      },
                    ).padding(horizontal: Sizes.s10),
              Row(
                mainAxisAlignment: .spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Advanced Search",
                        style: appCss.dmSansExtraBold18.textColor(
                          appColor(context).black,
                        ),
                      ),
                      Text(
                        "Power up your search results.",
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).gray,
                        ),
                      ),
                    ],
                  ).padding(horizontal: Sizes.s20),
                  SvgPicture.asset(
                    svgAssets.arrowDown,
                  ).padding(horizontal: Sizes.s20),
                ],
              ).inkWell(
                onTap: () {
                  setState(() {
                    if (isadvancedSearch == false) {
                      isadvancedSearch = true;
                    } else if (isadvancedSearch == true) {
                      isadvancedSearch = false;
                    }
                  });
                },
              ),
              if (isadvancedSearch == true)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    VSpace(Sizes.s20),
                    Text(
                      "Filter By",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: appColor(context).black,
                      ),
                    ).padding(horizontal: Sizes.s20),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: selectedChatKey,
                      hint: Text(
                        "Select Conversation",
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).black,
                        ),
                      ),
                      items: chats.map((chat) {
                        final value = chat.channelId ?? chat.recipientId;
                        final type = chat.chatType ?? '';
                        return DropdownMenuItem<String>(
                          value: '$type-$value',
                          child: Text(chat.name ?? 'Unknown Chat'),
                        );
                      }).toList(),
                      onChanged: (val) async {
                        setState(() => selectedChatKey = val);
                        selectedChat = chats.firstWhere((chat) {
                          final value = chat.channelId ?? chat.recipientId;
                          final type = chat.chatType ?? '';
                          log("-=-=-=-=-=-=-=-=-=$value  $type");
                          return '$type-$value' == val;
                        });

                        if (searchController.text.isNotEmpty) {
                          await ChatApi(
                            serviceLocator<AuthBloc>(),
                            serviceLocator<ApiManager>(),
                          ).searchMessages(
                            query: searchController.text,
                            scopType: selectedChat?.chatType == "channel"
                                ? 'channel'
                                : "dm",
                            recipientId: selectedChat?.chatType == "channel"
                                ? null
                                : selectedChat?.id,
                            channelId: selectedChat?.chatType == "channel"
                                ? selectedChat?.id
                                : null,
                          );
                        }
                        log(
                          "-=-=-=-=-=-=-=-=-=${selectedChat?.id}  ${selectedChat?.chatType} ",
                        );
                      },
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: appColor(context).white,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.r30),
                          borderSide: BorderSide(
                            color: isDark(context)
                                ? appColor(context).gray.withValues(alpha: 0.2)
                                : appColor(context).textFiledBorder,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.r30),
                          borderSide: BorderSide(
                            color: appColor(context).primary,
                          ),
                        ),
                      ),
                    ).padding(horizontal: Sizes.s20),

                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedMembersKey,
                      hint: Text(
                        "Select Conversation",
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).black,
                        ),
                      ),
                      items: _filteredMembers.map((member) {
                        final value = member.channelId ?? member.recipientId;
                        final type = member.chatType ?? '';
                        return DropdownMenuItem<String>(
                          value: '$type-$value',
                          child: Text(member.name ?? 'Unknown Chat'),
                        );
                      }).toList(),
                      onChanged: (val) async {
                        setState(() => selectedMembersKey = val);

                        final selectedMember = _filteredMembers.firstWhere((
                          member,
                        ) {
                          final value = member.channelId ?? member.recipientId;
                          final type = member.chatType ?? '';
                          return '$type-$value' == val;
                        });
                        log(
                          "-=-=-=-=-=-=-=-=-=${selectedChat?.id}  ${selectedChat?.chatType} ",
                        );
                        if (searchController.text.isNotEmpty) {
                          await ChatApi(
                            serviceLocator<AuthBloc>(),
                            serviceLocator<ApiManager>(),
                          ).searchMessages(
                            query: searchController.text,
                            scopType: selectedChat?.chatType == "channel"
                                ? 'channel'
                                : "dm",
                            recipientId: selectedChat?.chatType == "channel"
                                ? null
                                : selectedChat?.id,
                            channelId: selectedChat?.chatType == "channel"
                                ? selectedChat?.id
                                : null,
                            senderId: selectedMember.id,
                          );

                          setState(() {});
                        }
                      },
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: appColor(context).white,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.r30),
                          borderSide: BorderSide(
                            color: isDark(context)
                                ? appColor(context).gray.withValues(alpha: 0.2)
                                : appColor(context).textFiledBorder,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.r30),
                          borderSide: BorderSide(
                            color: appColor(context).primary,
                          ),
                        ),
                      ),
                    ).padding(horizontal: Sizes.s20),

                    const SizedBox(height: 25),
                    Text(
                      "Date",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: appColor(context).black,
                      ),
                    ).padding(horizontal: Sizes.s20),
                    const SizedBox(height: 10),
                    _buildDateField(
                      label: "Start",
                      value: _formatDate(startDate),
                      onTap: () => _pickDate(context, true),
                    ).padding(horizontal: Sizes.s20),
                    const SizedBox(height: 12),
                    _buildDateField(
                      label: "End",
                      value: _formatDate(endDate),
                      onTap: () => _pickDate(context, false),
                    ).padding(horizontal: Sizes.s20),
                  ],
                ),

              // FilterSection(),
              VSpace(Sizes.s20),
              if (searchController.text.isNotEmpty && globalSearchData == null)
                Center(
                  child: Text(
                    "NO DATA FOUND",
                    style: appCss.dmSansMedium18.textColor(
                      appColor(context).darkText,
                    ),
                  ),
                ),
              if (searchController.text.isNotEmpty && globalSearchData != null)
                Expanded(
                  child: ListView.separated(
                    separatorBuilder: (context, index) =>
                        SizedBox(height: Sizes.s20),
                    shrinkWrap: true,
                    itemCount: globalSearchData?.messages?.length ?? 0,
                    itemBuilder: (context, index) {
                      return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    "${globalSearchData?.messages?[index].sender?.name}",
                                    style: appCss.dmSansBold16.textColor(
                                      appColor(context).darkText,
                                    ),
                                  ),
                                  Spacer(),
                                  Text(
                                    globalSearchData
                                                ?.messages![index]
                                                .createdAt !=
                                            null
                                        ? DateFormat(
                                            'dd/MM/yyyy, hh:mm a',
                                          ).format(
                                            DateTime.parse(
                                              globalSearchData!
                                                  .messages![index]
                                                  .createdAt!,
                                            ).toLocal(),
                                          )
                                        : '',
                                    style: appCss.dmSansRegular12.textColor(
                                      appColor(context).darkText,
                                    ),
                                  ),
                                ],
                              ),
                              VSpace(Sizes.s10),
                              Text(
                                QuillParser.deltaToPlainText(
                                  globalSearchData?.messages![index].content,
                                ),
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              Text(
                                "To: ${globalSearchData?.messages?[index].recipient?.name}",
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                            ],
                          )
                          .padding(horizontal: Sizes.s15, vertical: Sizes.s10)
                          .decorated(
                            color: appColor(
                              context,
                            ).primary.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: appColor(context).gray),
                          )
                          .inkWell(
                            onTap: () {
                              final msg = globalSearchData!.messages![index];
                              final userId = AuthService().userId.toString();

                              openChatFromSearch(
                                context: context,
                                message: msg,
                                currentUserId: int.parse(userId),
                              );
                            },
                          )
                          .padding(horizontal: Sizes.s20);
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String? fromValue = 'Anyone';
  String? postedInValue = 'All Conversations';
  DateTime? startDate;
  DateTime? endDate;
  String? selectedChatKey;
  String? selectedMembersKey;

  Future<void> _pickDate(BuildContext context, bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              surface: appColor(context).fieldCardBg,
              primary: appColor(context).primary.withValues(alpha: 0.5),
              onPrimary: appColor(context).primary, // <-- SEE HERE
              onSurface: appColor(context).darkText, // <-- SEE HERE
            ),
            cardColor: appColor(context).white,
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                textStyle: appCss.dmSansRegular16.textColor(
                  appColor(context).darkText,
                ),
              ),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          startDate = picked;
        } else {
          endDate = picked;
        }
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'DD/MM/YYYY';
    return DateFormat('dd/MM/yyyy').format(date);
  }

  @override
  void initState() {
    super.initState();
    _loadChats();
    _loadMembers();
  }

  List<MessageModel> chats = [];
  bool isLoading = false;
  Future<void> _loadChats() async {
    try {
      setState(() => isLoading = true);
      final data = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).fetchChats();
      setState(() => chats = data);
      log(" Loaded ${data.length} chats");
    } catch (e) {
      log(" Error fetching chats: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  Widget _buildDateField({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: appColor(context).white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "$label: $value",
              style: TextStyle(color: appColor(context).black, fontSize: 15),
            ),
            const Icon(
              Icons.calendar_today_outlined,
              color: Colors.grey,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  bool _isLoadingMembers = true;
  List<MessageModel> _members = [];
  List<MessageModel> _filteredMembers = [];
  Future<void> _loadMembers() async {
    try {
      setState(() {
        _isLoadingMembers = true;
      });

      final members = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).teamMembers();

      setState(() {
        _members = members;
        _filteredMembers = List.from(members);
        _isLoadingMembers = false;
      });
    } catch (e) {
      log('Error loading members: $e');
      setState(() {
        _isLoadingMembers = false;
      });
    }
  }

  /* void _onSearchChanged(String query) {
      if (query.isEmpty) {
        context.read<DashboardBloc>().add(ClearSearch());
      } else {
        context.read<DashboardBloc>().add(SearchChats(query));
      }
    } */
}
