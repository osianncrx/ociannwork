import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:teamwise/config.dart';
import 'package:teamwise/core/network/api_manger.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_api.dart';

import '../../data/datasources/chat_Api.dart';
import '../../data/models/chat_message_model.dart';

class ForwardMessageScreen extends StatefulWidget {
  final ChatMessageModel messageToForward;

  const ForwardMessageScreen({super.key, required this.messageToForward});

  @override
  State<ForwardMessageScreen> createState() => _ForwardMessageScreenState();
}

class _ForwardMessageScreenState extends State<ForwardMessageScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  late TabController _tabController;

  List<MessageModel> _conversations = [];
  List<MessageModel> _filteredConversations = [];
  List<MessageModel> _members = [];
  List<MessageModel> _filteredMembers = [];

  final Set<String> _selectedChats = {};
  final Set<String> _selectedMembers = {};

  bool _isLoadingChats = true;
  bool _isLoadingMembers = true;
  bool _isForwarding = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);

    _loadData();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _tabController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onTabChanged() {
    // Clear search when switching tabs
    _searchController.clear();
    _filterItems('');
  }

  void _onSearchChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _filterItems(_searchController.text);
    });
  }

  void _filterItems(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredConversations = List.from(_conversations);
        _filteredMembers = List.from(_members);
      } else {
        final searchQuery = query.toLowerCase();

        _filteredConversations = _conversations.where((chat) {
          final name = chat.name.toLowerCase();
          return name.contains(searchQuery);
        }).toList();

        _filteredMembers = _members.where((member) {
          final name = member.name.toLowerCase();
          return name.contains(searchQuery);
        }).toList();
      }
    });
  }

  Future<void> _loadData() async {
    await Future.wait([_loadConversations(), _loadMembers()]);
  }

  Future<void> _loadConversations() async {
    try {
      setState(() {
        _isLoadingChats = true;
      });

      final dashboardApi = DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      );

      final chats = await dashboardApi.fetchChats();

      setState(() {
        _conversations = chats;
        _filteredConversations = List.from(chats);
        _isLoadingChats = false;
      });
    } catch (e) {
      log('Error loading conversations: $e');
      setState(() {
        _isLoadingChats = false;
      });
    }
  }

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

  void _toggleChatSelection(String chatId) {
    log("String chatId::${chatId}");
    setState(() {
      if (_selectedChats.contains(chatId)) {
        _selectedChats.remove(chatId);
      } else {
        _selectedChats.add(chatId);
      }
    });
  }

  void _toggleMemberSelection(String memberId) {
    setState(() {
      if (_selectedMembers.contains(memberId)) {
        _selectedMembers.remove(memberId);
      } else {
        _selectedMembers.add(memberId);
      }
    });
  }

  int get _totalSelected => _selectedChats.length + _selectedMembers.length;

  Future<void> _forwardMessage() async {
    if (_totalSelected == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please select at least one conversation or member'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isForwarding = true;
    });

    try {
      final chatApi = ChatApi(
        context.read<AuthBloc>(),
        serviceLocator<ApiManager>(),
      );

      int successCount = 0;
      int totalCount = _totalSelected;

      // Forward to selected chats/channels
      for (String chatId in _selectedChats) {
        try {
          final parts = chatId.split("_");
          final type = parts[0]; // "dm" or "channel"
          final id = parts[1];

          final selectedChat = _conversations.firstWhere(
            (chat) => chat.chatType == type && chat.id.toString() == id,
          );

          final bool isChannel = type == 'channel';
          final String? channelId = isChannel
              ? selectedChat.id.toString()
              : null;
          final String? recipientId = !isChannel
              ? selectedChat.id.toString()
              : null;

          final forwardMetadata = {
            "forwarded": true,
            "original_sender": {
              "id": widget.messageToForward.sender.id,
              "name": widget.messageToForward.sender.name,
              "email": widget.messageToForward.sender.email,
              "avatar": widget.messageToForward.sender.avatar,
            },
            "original_message_id": widget.messageToForward.id,
          };

          await chatApi.sendMessage(
            recipientId: recipientId ?? '',
            channelId: channelId,
            content: widget.messageToForward.plainTextContent,
            messageType: 'text',
            metadataObject: forwardMetadata,
          );

          successCount++;
          log('✅ Message forwarded successfully to chat: $chatId');
        } catch (e) {
          log('❌ Failed to forward message to chat $chatId: $e');
        }
      }
      // Forward to selected members (as direct messages)
      for (String memberId in _selectedMembers) {
        try {
          final forwardMetadata = {
            "forwarded": true,
            "original_sender": {
              "id": widget.messageToForward.sender.id,
              "name": widget.messageToForward.sender.name,
              "email": widget.messageToForward.sender.email,
              "avatar": widget.messageToForward.sender.avatar,
            },
            "original_message_id": widget.messageToForward.id,
          };

          await chatApi.sendMessage(
            recipientId: memberId,
            channelId: null,
            content: widget.messageToForward.plainTextContent,
            messageType: 'text',
            metadataObject: forwardMetadata,
          );

          successCount++;
          log('✅ Message forwarded successfully to member: $memberId');
        } catch (e) {
          log('❌ Failed to forward message to member $memberId: $e');
        }
      }

      setState(() {
        _isForwarding = false;
      });

      // Show result
      if (successCount == totalCount) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Message forwarded to $successCount recipient${successCount > 1 ? 's' : ''}',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Forwarded to $successCount of $totalCount recipients',
            ),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      log('❌ Error in forward process: $e');
      setState(() {
        _isForwarding = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to forward message'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildChatsList() {
    if (_isLoadingChats) {
      return Center(
        child: CircularProgressIndicator(color: appColor(context).primary),
      );
    }

    if (_filteredConversations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: appColor(context).gray,
            ),
            SizedBox(height: 16),
            Text(
              _searchController.text.isNotEmpty
                  ? 'No conversations found'
                  : 'No conversations available',
              style: TextStyle(color: appColor(context).gray, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 16),
      itemCount: _filteredConversations.length,
      itemBuilder: (context, index) {
        final chat = _filteredConversations[index];
        final isChannel = chat.chatType == 'channel';
        log("chat.channelId::$isChannel");
        final uniqueId = "${chat.chatType}_${chat.id}";
        final isSelected = _selectedChats.contains(uniqueId);

        return _buildListItem(
          isSelected: isSelected,
          onTap: () => _toggleChatSelection(uniqueId),
          icon: isChannel ? Icons.tag : Icons.chat,
          iconColor: isChannel ? appColor(context).primary : Colors.blue,
          title: chat.name,
          subtitle: isChannel ? 'Channel' : 'Direct Message',
        );
      },
    );
  }

  Widget _buildMembersList() {
    if (_isLoadingMembers) {
      return Center(
        child: CircularProgressIndicator(color: appColor(context).primary),
      );
    }

    if (_filteredMembers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: appColor(context).gray),
            SizedBox(height: 16),
            Text(
              _searchController.text.isNotEmpty
                  ? 'No members found'
                  : 'No members available',
              style: TextStyle(color: appColor(context).gray, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 16),
      itemCount: _filteredMembers.length,
      itemBuilder: (context, index) {
        final member = _filteredMembers[index];
        final isSelected = _selectedMembers.contains(member.id.toString());

        return _buildListItem(
          isSelected: isSelected,
          onTap: () => _toggleMemberSelection(member.id.toString()),
          icon: Icons.person,
          iconColor: Colors.green,
          title: member.name,
          subtitle: 'Team Member',
        );
      },
    );
  }

  Widget _buildListItem({
    required bool isSelected,
    required VoidCallback onTap,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      child: Material(
        color: isSelected
            ? appColor(context).primary.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(
                color: isSelected
                    ? appColor(context).primary
                    : appColor(context).gray.withValues(alpha: 0.2),
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: iconColor, size: 24),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: appColor(context).black,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: appColor(context).gray,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected
                        ? appColor(context).primary
                        : Colors.transparent,
                    border: Border.all(
                      color: isSelected
                          ? appColor(context).primary
                          : appColor(context).gray.withValues(alpha: 0.5),
                      width: 2,
                    ),
                  ),
                  child: isSelected
                      ? Icon(
                          Icons.check,
                          color: appColor(context).white,
                          size: 16,
                        )
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: appColor(context).white,
      appBar: AppBar(
        backgroundColor: appColor(context).primary,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: appColor(context).white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Forward Message',
          style: TextStyle(
            color: appColor(context).white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          if (_totalSelected > 0)
            TextButton(
              onPressed: _isForwarding ? null : _forwardMessage,
              child: _isForwarding
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: appColor(context).white,
                      ),
                    )
                  : Text(
                      'Forward ($_totalSelected)',
                      style: TextStyle(
                        color: appColor(context).white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: appColor(context).white,
          unselectedLabelColor: appColor(context).white.withValues(alpha: 0.7),
          indicatorColor: appColor(context).white,
          tabs: [
            Tab(text: 'Chats'),
            Tab(text: 'Members'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Message Preview
          Container(
            margin: EdgeInsets.all(16),
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: appColor(context).gray.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: appColor(context).gray.withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.forward,
                      color: appColor(context).primary,
                      size: 16,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Forwarding message from ${widget.messageToForward.senderName}',
                      style: TextStyle(
                        color: appColor(context).primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Text(
                  widget.messageToForward.plainTextContent,
                  style: TextStyle(
                    color: appColor(context).black,
                    fontSize: 14,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Search Bar
          Container(
            margin: EdgeInsets.symmetric(horizontal: 16),
            padding: EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: appColor(context).gray.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(25),
            ),
            child: TextField(
              controller: _searchController,
              focusNode: _searchFocusNode,
              decoration: InputDecoration(
                hintText: 'Search...',
                border: InputBorder.none,
                icon: Icon(Icons.search, color: appColor(context).gray),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear, color: appColor(context).gray),
                        onPressed: () {
                          _searchController.clear();
                          _filterItems('');
                        },
                      )
                    : null,
              ),
            ),
          ),

          SizedBox(height: 16),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildChatsList(), _buildMembersList()],
            ),
          ),
        ],
      ),
    );
  }
}
