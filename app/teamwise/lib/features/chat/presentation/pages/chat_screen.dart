import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:ui';

import 'package:audioplayers/audioplayers.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:teamwise/common/widgets/glass_button.dart';
import 'package:teamwise/core/network/extensions.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import 'package:teamwise/features/chat/data/models/channel_info_model.dart';
import 'package:teamwise/features/chat/data/models/chat_message_model.dart';
import 'package:teamwise/features/chat/presentation/pages/paint.dart';
import 'package:teamwise/features/chat/presentation/widgets/WebRTCCallService.dart';

import '../../../../config.dart' hide ChatError;

import '../../../../core/network/api_manger.dart';
import '../../../../core/network/app_constants.dart';
import '../../../../core/utils/quill_parser.dart';
import '../../../dashboard/data/datasources/dashboard_api.dart';
import '../../data/datasources/chat_Api.dart';
import '../../socket_service.dart';
import '../bloc/chat_bloc.dart';
import '../bloc/chat_state.dart' hide ChatLoading;
import '../widgets/MentionOverlayHelper.dart';
import '../widgets/audio_message_bubble.dart';
import '../widgets/chats_layouts.dart';
import '../widgets/Reaction_class.dart';
import 'call_screen.dart';
import 'forward_message_screen.dart';

class ChatScreen extends StatefulWidget {
  final String recipientId;
  final String? channelId;
  final String recipientName;
  final String recipientAvatar;
  final String chatType;
  final String? recipientEmail;
  final String? profileColor;
  final String? initialMessageId; // <-- Add this

  const ChatScreen({
    super.key,
    required this.recipientId,
    this.channelId,
    required this.recipientName,
    required this.recipientAvatar,
    required this.chatType,
    this.recipientEmail,
    this.profileColor,
    this.initialMessageId,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;
  bool isLongPress = false;
  ChatMessageModel? _selectedMessage;
  Set<String> _selectedMessageIds = {};
  bool _hasMarkedInitialMessagesAsRead = false;
  bool _isMarkingMessagesAsRead = false;
  final Map<String, String> _typingUsers = {}; // userId -> userName
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  List<Map<String, dynamic>> _searchResults = [];
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  final mentionHelper = MentionOverlayHelper(); // single instance
  int memberLength = 0;

  // Add WebRTC service
  final WebRTCCallService _callService = WebRTCCallService();
  StreamSubscription<CallState>? _callStateSubscription;
  OverlayEntry? _callProgressOverlay;
  bool _isScreenVisible = true; // ✅ Track if screen is visible
  DateTime? _lastPausedTime; // ✅ Track when app was paused

  void _checkConnectivity() async {
    // Check current status
    final connectivityResult = await Connectivity().checkConnectivity();
    setState(() {
      _isOnline = connectivityResult != ConnectivityResult.none;
    });

    // Listen for connectivity changes
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      result,
    ) {
      if (!mounted) return;
      setState(() {
        _isOnline = result != ConnectivityResult.none;
      });
      log('📶 Connectivity changed: ${_isOnline ? "Online" : "Offline"}');
    });
  }

  void _markAllMessagesAsReadSafely() async {
    log("🔵 [READ] Starting mark as read");

    if (_isMarkingMessagesAsRead) {
      log("⚠️ [READ] Already marking, skipping");
      return;
    }

    _isMarkingMessagesAsRead = true;

    try {
      await Future.delayed(Duration(milliseconds: 100));

      if (!mounted) {
        _isMarkingMessagesAsRead = false;
        return;
      }

      final chatBloc = context.read<ChatBloc>();
      final chatState = chatBloc.state;

      log('🔍 [READ] Current state: ${chatState.runtimeType}');

      List<ChatMessageModel> messages = [];

      if (chatState is MessagesLoaded) {
        messages = chatState.messages;
      } else if (chatState is NewMessageReceived) {
        messages = chatState.messages;
      } else if (chatState is MessageSent) {
        messages = (chatState as dynamic).messages ?? [];
      } else if (chatState is MessageSending) {
        messages = (chatState as dynamic).messages ?? [];
      } else {
        log('❌ [READ] Cannot extract messages');
        _isMarkingMessagesAsRead = false;
        return;
      }

      final currentUserId = AuthService().userId;

      log(
        '📊 [READ] Total messages: ${messages.length}, CurrentUserId: $currentUserId',
      );

      if (currentUserId == null || messages.isEmpty) {
        log('❌ [READ] No user ID or no messages');
        _isMarkingMessagesAsRead = false;
        _hasMarkedInitialMessagesAsRead = true;
        return;
      }

      // Collect unread message IDs
      final unreadMessageIds = <String>[];

      for (final message in messages) {
        final messageId = message.id.toString();
        final senderId = message.senderId.toString();

        if (senderId == currentUserId) {
          continue;
        }

        final isAlreadyRead = message.statuses.any(
          (status) =>
              status.userId.toString() == currentUserId &&
              (status.status.toLowerCase() == 'read' ||
                  status.status.toLowerCase() == 'seen'),
        );

        if (!isAlreadyRead && messageId.isNotEmpty) {
          unreadMessageIds.add(messageId);
          log('   📨 Unread: $messageId');
        }
      }

      log('📤 [READ] Found ${unreadMessageIds.length} unread messages');

      if (unreadMessageIds.isNotEmpty) {
        log('📡 [READ] Sending read receipts via socket');

        // ✅ STEP 1: Send bulk read via sendMessageSeen
        log('📡 [READ] Step 1: Calling SocketService().sendMessageSeen()');
        SocketService().sendMessageSeen(unreadMessageIds);

        // ✅ STEP 2: Also send individual updates (server might expect both)
        log('📡 [READ] Step 2: Sending individual status updates');

        for (final messageId in unreadMessageIds) {
          // ✅ FIX: Ensure userId is included
          final statusPayload = {
            'messageId': messageId,
            'message_id': messageId,
            'id': messageId,
            'status': 'read',
            'userId': currentUserId,
            'user_id': currentUserId,
            'recipientId': widget.recipientId,
            'recipient_id': widget.recipientId,
            'channelId': widget.channelId,
            'channel_id': widget.channelId,
            'timestamp': DateTime.now().toIso8601String(),
          };

          log(
            '   📨 Sending: messageId=$messageId, userId=$currentUserId, status=read',
          );
          log('   📨 Full payload: $statusPayload');

          SocketService().emit('message-status-update', statusPayload);
        }

        // ✅ STEP 3: Also emit messagesRead bulk event
        log('📡 [READ] Step 3: Sending bulk messagesRead event');
        SocketService().emit('messages-read', {
          'message_ids': unreadMessageIds,
          'userId': currentUserId,
          'user_id': currentUserId,
          'status': 'read',
          'timestamp': DateTime.now().toIso8601String(),
        });

        log('✅ [READ] All read receipts sent');
      } else {
        log('ℹ️ [READ] No unread messages');
      }

      _hasMarkedInitialMessagesAsRead = true;
    } catch (e, s) {
      log('❌ [READ] Error: $e');
      log('Stack: $s');
    } finally {
      _isMarkingMessagesAsRead = false;
      log('✅ [READ] Flag reset');
    }
  }

  List<ChannelMember> _members = []; // store channel members
  bool _showMemberList = false; // to toggle list visibility
  final AudioPlayer _player = AudioPlayer();

  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  bool _isPlaying = false;
  bool _isInitialLoad = true;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _initializeChat();
    _isScreenVisible = true;

    _isInitialLoad = true; // ✅ Set initial load flag

    _messageController.addListener(_onTypingChanged);
    _scrollController.addListener(_onScroll);

    _player.onDurationChanged.listen((d) {
      setState(() => _duration = d);
    });

    _player.onPositionChanged.listen((p) {
      setState(() => _position = p);
    });

    _player.onPlayerComplete.listen((_) {
      setState(() {
        _isPlaying = false;
        _position = Duration.zero;
      });
    });

    _messageController.addListener(() {
      final text = _messageController.text;
      if (text.endsWith('@')) {
        setState(() => _showMemberList = true);
      } else if (!text.contains('@')) {
        setState(() => _showMemberList = false);
      }
    });
    _setupDirectMessageListener();
    if (widget.initialMessageId != null) {
      Future.delayed(Duration(seconds: 1), () {
        log('🎯 Initial message ID provided: ${widget.initialMessageId}');
        _scrollToAndHighlightMessage(widget.initialMessageId!);
      });
    }

    _setupCallStateListener();
    _loadCurrentUserId();
    if (widget.channelId != null) {
      _fetchMembersFromApi();
    }
    _setupMentionListener();

    _callService.initialize();
    _setupCallListeners();

    WidgetsBinding.instance.addObserver(this);

    SocketService().connectionStream.listen((isConnected) {
      if (mounted) setState(() {});
    });

    if (widget.channelId != null) {
      Future.delayed(Duration(milliseconds: 500), () {
        _forceRejoinRooms();
      });
    }

    // Listen to onlineUsers changes
    SocketService().onlineUsers.addListener(() {
      if (mounted) setState(() {});
    });

    // Updated typing listener
    SocketService().typingStream.listen((typingData) {
      if (!mounted) return;

      final senderId =
          typingData['senderId']?.toString() ??
          typingData['userId']?.toString();
      final senderName =
          typingData['senderName']?.toString() ??
          typingData['userName']?.toString();
      final isTyping = typingData['isTyping'] ?? false;
      final messageChannelId = typingData['channelId']?.toString();

      bool isRelevantTyping = false;

      if (widget.channelId != null) {
        isRelevantTyping =
            messageChannelId == widget.channelId &&
            senderId != AuthService().userId;
      } else {
        isRelevantTyping = senderId == widget.recipientId;
      }

      if (isRelevantTyping && senderId != null) {
        setState(() {
          if (isTyping && senderName != null) {
            _typingUsers[senderId] = senderName;
          } else {
            _typingUsers.remove(senderId);
          }
        });
      }
    });

    // IMPORTANT: Add a delayed call to mark messages as read after everything is initialized
    Future.delayed(Duration(milliseconds: 1000), () {
      if (mounted) {
        log('🔄 Initial delayed mark messages as read attempt');
        _markAllMessagesAsReadSafely();
      }
    });

    // Fetch current subscription data
    context.read<ChatBloc>().add(FetchCurrentSubscription());
  }

  void _onScroll() {
    // Check if scrolled to top (to load older messages)
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      _loadMoreMessages();
    }
  }

  bool _isLoadingMore = false;

  void _loadMoreMessages() {
    if (_isLoadingMore) return;

    final chatState = context.read<ChatBloc>().state;
    if (chatState is! MessagesLoaded) return;
    if (chatState.messages.isEmpty) return;

    setState(() => _isLoadingMore = true);

    context.read<ChatBloc>().add(LoadMoreMessages());

    // Reset loading flag after delay
    Future.delayed(Duration(seconds: 1), () {
      if (mounted) setState(() => _isLoadingMore = false);
    });
  }

  void _setupCallListeners() {
    SocketService().onSocketEvent(SocketEvents.incomingCall, (data) {
      log('Incoming call data received: $data');

      final callId = data['callId']?.toString() ?? '';
      final callTypeString = data['callType']?.toString() ?? 'audio';
      final initiator = data['initiator'] is Map
          ? data['initiator'] as Map<String, dynamic>
          : {};
      final callerId = initiator['userId']?.toString() ?? '';
      final callerName = initiator['name']?.toString() ?? 'Unknown';
      final timestamp = data['timestamp']?.toString();

      // Only show dialog if call is from current chat participant
      if (callerId == widget.recipientId) {
        CallType callType = callTypeString == 'video'
            ? CallType.video
            : CallType.audio;

        // Dismiss any existing dialogs
        Navigator.of(
          context,
          rootNavigator: true,
        ).popUntil((route) => route.isFirst);

        // Show the incoming call dialog
        // Push full screen call UI and let that screen show accept/reject controls
        Navigator.of(context).push(
          MaterialPageRoute(
            fullscreenDialog: true,
            builder: (context) => VideoCallScreen(
              participantId: callerId,
              participantName: callerName,
              callType: callType,
              chatType: widget.chatType,
              isIncoming: true,
            ),
          ),
        );
        // Also listen for participants sync for channel calls (so UI can update)
        SocketService().onSocketEvent("call-participants-sync", (data) {
          try {
            log('call-participants-sync: $data');
            // Optional: if you want to reflect participants count on chat screen,
            // parse data['callId'] / data['participants'] and update state or callService participants stream
            // Example:
            // final callId = data['callId']?.toString();
            // final participants = data['participants'] as List? ?? [];
            // setState(() => _currentParticipants = participants.map(...).toList());
          } catch (e, st) {
            log('Error in call-participants-sync handler: $e\n$st');
          }
        });

        /*showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => IncomingCallDialog(
            callerId: callerId,
            callerName: callerName,
            callType: callType,
            callId: callId,
            timestamp: timestamp,
            onAccept: () async {
              log('🎯 UI: Accept button pressed');
              log('Current service state: ${_callService.callState}');

              if (_callService.callState != CallState.incoming) {
                log('⚠️ Cannot accept - not in incoming state');
                return;
              }

              _callService.acceptCall();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => VideoCallScreen(
                    participantId: callerId,
                    participantName: callerName,
                    callType: callType,
                    isIncoming: true,
                  ),
                ),
              );
            },
            onDecline: () {
              Navigator.of(context).pop();
              _callService.declineCall();
            },
          ),
        );*/
      }
    });
  }

  /*
  void _setupCallListeners() {
    SocketService().onSocketEvent(SocketEvents.incomingCall, (data) {
      try {
        log('Socket incoming-call event: $data');

        // Defensive extractors (server naming may vary 'chatId' or 'chat_id')
        final chatId = (data['chatId'] ?? data['chat_id'])?.toString();
        final chatType = (data['chatType'] ?? data['chat_type'])?.toString() ?? 'dm';
        final callId = data['callId']?.toString() ?? data['call_id']?.toString() ?? '';
        final callTypeString = (data['callType'] ?? data['call_type'])?.toString() ?? 'audio';
        final initiator = data['initiator'] is Map ? data['initiator'] as Map<String, dynamic> : <String, dynamic>{};
        final callerId = initiator['userId']?.toString() ?? initiator['user_id']?.toString() ?? '';
        final callerName = initiator['name']?.toString() ?? 'Unknown';
        final timestamp = data['timestamp']?.toString();

        log('Parsed incoming call -> callId:$callId, chatId:$chatId, chatType:$chatType, from:$callerId, callsType:$callTypeString');

        // Determine whether this screen is the right place to show the incoming call
        final bool isDM = chatType == 'dm';
        final bool isChannel = chatType == 'channel' || chatType == 'group';

        bool shouldShow = false;

        // If it's a DM, show when the initiator is the recipient you're chatting with
        if (isDM) {
          // For DM we expect the initiator userId to match the chat participant on this screen
          if (callerId.isNotEmpty && callerId == widget.recipientId) {
            shouldShow = true;
          }
        }

        // If it's a channel call, show when chatId matches this screen's recipientId (channel id)
        if (isChannel) {
          if (chatId != null && chatId == widget.recipientId) {
            shouldShow = true;
          }
        }

        // Also allow server to target specific users (if it sends targetUserId)
        final targetUserId = (data['targetUserId'] ?? data['target_user_id'])?.toString();
        if (targetUserId != null) {
          // show only if targeted to this user or to the whole channel (chatId match)
          final me = (SharedPreferences.getInstance().then((p) => p.getString('userId'))); // async, we only log here
          // We won't await here to avoid blocking — we'll still show if shouldShow true above.
          log('incoming-call has targetUserId: $targetUserId');
        }

        if (!shouldShow) {
          log('Incoming call ignored: not relevant to this chat screen');
          // Helpful fallback: show a small snackbar for debugging in dev builds
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('Incoming call for chat $chatId (type $chatType) — not this screen.'),
              duration: Duration(seconds: 2),
            ));
          }
          return;
        }

        // Parse call type
        final callType = callTypeString == 'video' ? CallType.video : CallType.audio;

        // Dismiss any existing route dialogs to avoid stacking
        Navigator.of(context, rootNavigator: true).popUntil((route) => route.isFirst);

        // Push full screen call UI
        Navigator.of(context).push(
          MaterialPageRoute(
            fullscreenDialog: true,
            builder: (context) => VideoCallScreen(
              participantId: callerId,
              participantName: callerName,
              callType: callType,
              isIncoming: true,
              // Optional: pass callId/chatId/chatType if your VideoCallScreen expects them
              // callId: callId,
              // chatId: chatId,
              // chatType: chatType,
            ),
          ),
        );
      } catch (e, st) {
        log('Error in incoming-call handler: $e\n$st');
      }
    });

    // Also listen for participants sync for channel calls (so UI can update)
    SocketService().onSocketEvent("call-participants-sync", (data) {
      try {
        log('call-participants-sync: $data');
        // Optional: if you want to reflect participants count on chat screen,
        // parse data['callId'] / data['participants'] and update state or callService participants stream
        // Example:
        // final callId = data['callId']?.toString();
        // final participants = data['participants'] as List? ?? [];
        // setState(() => _currentParticipants = participants.map(...).toList());
      } catch (e, st) {
        log('Error in call-participants-sync handler: $e\n$st');
      }
    });
  }
*/

  Future<void> _initiateCall(CallType callType) async {
    try {
      // FIXED: Request permissions instead of just checking
      log('🔒 Requesting permissions for ${callType.name} call...');

      bool hasPermissions = await _callService.requestAndCheckPermissions(
        callType,
      );

      if (!hasPermissions) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Camera and microphone permissions are required for ${callType.name} calls.',
            ),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
            action: SnackBarAction(
              label: 'Settings',
              textColor: Colors.white,
              onPressed: () {
                openAppSettings();
              },
            ),
          ),
        );
        return;
      }

      log('✅ Permissions granted, starting call...');
      final success = await _callService.startCall(
        recipientId:
            (widget.chatType == 'channel' || widget.chatType == 'group') &&
                widget.channelId != null
            ? widget.channelId!
            : widget.recipientId,
        recipientName: widget.recipientName,
        callType: callType,
        chatType: widget.chatType,
      );

      if (success) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => VideoCallScreen(
              participantId: widget.recipientId,
              participantName: widget.recipientName,
              callType: callType,
              chatType: widget.chatType,
              isIncoming: false,
            ),
          ),
        );
      } else {
        // ScaffoldMessenger.of(context).showSnackBar(
        //   SnackBar(
        //     content: Text('Failed to start call. Please try again.'),
        //     backgroundColor: Colors.red,
        //     action: SnackBarAction(
        //       label: 'Retry',
        //       textColor: Colors.white,
        //       onPressed: () {
        //         _initiateCall(callType);
        //       },
        //     ),
        //   ),
        // );
      }
    } catch (e) {
      log('Error initiating call: \$e');

      String errorMessage = 'Failed to start call.';
      bool showSettings = false;

      if (e.toString().contains('permanently denied')) {
        errorMessage = 'Permissions permanently denied. Enable in Settings.';
        showSettings = true;
      } else if (e.toString().contains('permission')) {
        errorMessage = 'Camera/microphone permission required.';
        showSettings = true;
      } else if (e.toString().contains('not found')) {
        errorMessage = 'Camera or microphone not found.';
      } else if (e.toString().contains('already in use')) {
        errorMessage = 'Camera/microphone in use by another app.';
      } else if (e.toString().contains('constraints not supported')) {
        errorMessage = 'Camera/microphone not supported.';
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
          action: showSettings
              ? SnackBarAction(
                  label: 'Settings',
                  textColor: Colors.white,
                  onPressed: () {
                    openAppSettings();
                  },
                )
              : SnackBarAction(
                  label: 'Retry',
                  textColor: Colors.white,
                  onPressed: () {
                    _initiateCall(callType);
                  },
                ),
        ),
      );
    }
  }

  void _setupCallStateListener() {
    _callStateSubscription = _callService.callStateStream.listen((state) {
      if (mounted) {
        log('Call state changed in ChatScreen: $state');

        switch (state) {
          case CallState.outgoing:
            break;
          case CallState.incoming:
            break;
          case CallState.connecting:
            break;
          case CallState.connected:
            _hideCallProgress();
            break;
          case CallState.ended:
            _hideCallProgress();
            break;
          case CallState.idle:
            break;
        }
      }
    });
  }

  void _hideCallProgress() {
    if (_callProgressOverlay != null) {
      _callProgressOverlay!.remove();
      _callProgressOverlay = null;
    }

    // Also hide any snackbars
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      log('📱 App paused');
      _lastPausedTime = DateTime.now();
      SocketService().setAway();

      if (_callService.callState == CallState.connected) {
        log("Call is connected");
      }
    } else if (state == AppLifecycleState.resumed) {
      log('📱 App resumed');

      if (mounted && _isScreenVisible) {
        final timeSincePause = _lastPausedTime != null
            ? DateTime.now().difference(_lastPausedTime!).inSeconds
            : 0;

        if (timeSincePause > 2) {
          log('🔵 App was in background for $timeSincePause seconds');
          SocketService().setOnline();

          // ✅ Immediate read on resume
          Future.delayed(Duration(milliseconds: 100), () {
            if (mounted && _isScreenVisible) {
              log('🔵 Marking messages as read on app resume');
              _markAllMessagesAsReadSafely();
            }
          });
        } else {
          log('⏭️ Quick resume (likely navigation) - still marking as read');
          SocketService().setOnline();

          // ✅ Even on quick resume, mark messages as read if screen is visible
          Future.delayed(Duration(milliseconds: 100), () {
            if (mounted && _isScreenVisible) {
              _markAllMessagesAsReadSafely();
            }
          });
        }
      }
    }
  }

  Widget _buildHeader() {
    if (_isSearching) {
      return _buildSearchHeader();
    }

    return isLongPress
        ? _isSearching
              ? _buildSearchHeader()
              : _buildLongPressHeader()
        : _isSearching
        ? _buildSearchHeader()
        : _buildNormalHeader();
  }

  Widget _buildSearchHeader() {
    log("SSSSSSSSSS");
    return Container(
      decoration: BoxDecoration(
        color: appColor(context).commonBgColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 5,
            offset: const Offset(0, 4),
          ),
        ],
      ),

      child:
          Row(
            children: [
              // Back button
              IconButton(
                icon: Icon(Icons.arrow_back, color: appColor(context).darkText),
                onPressed: () {
                  setState(() {
                    _isSearching = false;
                    _searchController.clear();
                    _searchResults.clear();
                  });
                },
              ),

              // Search field
              Expanded(
                child: TextField(
                  controller: _searchController,
                  focusNode: _searchFocusNode,
                  style: TextStyle(color: appColor(context).darkText),
                  decoration: InputDecoration(
                    hintText: 'Search messages...',
                    hintStyle: TextStyle(
                      color: appColor(context).darkText.withValues(alpha: 0.7),
                    ),
                    border: InputBorder.none,
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(
                              Icons.clear,
                              color: appColor(context).darkText,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              _searchResults.clear();
                            },
                          )
                        : null,
                  ),
                  onChanged: (value) {
                    if (value.length >= 2) {
                      _performSearch(value);
                    } else {
                      setState(() {
                        _searchResults.clear();
                      });
                    }
                  },
                  onSubmitted: (value) {
                    if (value.isNotEmpty) {
                      _performSearch(value);
                    }
                  },
                ),
              ),

              // Search icon
              IconButton(
                icon: Icon(Icons.search, color: appColor(context).darkText),
                onPressed: () {
                  if (_searchController.text.isNotEmpty) {
                    _performSearch(_searchController.text);
                  }
                },
              ),
            ],
          ).paddingDirectional(
            top: Sizes.s40,
            bottom: Sizes.s20,
            horizontal: Sizes.s20,
          ),
    );
  }

  Widget _buildNormalHeader() {
    final isSelfChat = widget.recipientId == _currentUserId;
    final isChannel = widget.channelId != null;

    log(
      "isSelfChat:::::${widget.chatType}///${widget.recipientId}///${_currentUserId}",
    );
    final chatBloc = context.read<ChatBloc>();
    return Container(
      decoration: BoxDecoration(
        color: appColor(context).commonBgColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 5,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child:
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  SvgPicture.asset(
                    svgAssets.arrowLeft,
                    height: Sizes.s24,
                    width: Sizes.s24,
                    color: appColor(context).black,
                  ).inkWell(
                    onTap: () {
                      Navigator.popUntil(context, (route) {
                        return route.settings.name == routeName.dashboard ||
                            route.isFirst;
                      });
                    },
                  ),
                  HSpace(Sizes.s8),
                  Row(
                    crossAxisAlignment:
                        widget.chatType == 'channel' ||
                            widget.chatType == 'group' ||
                            widget.recipientId == _currentUserId
                        ? CrossAxisAlignment.center
                        : CrossAxisAlignment.start,
                    children: [
                      _buildUserAvatar(),
                      HSpace(Sizes.s8),
                      _buildUserInfo(),
                    ],
                  ).inkWell(
                    onTap: () {
                      isSelfChat == true
                          ? null
                          : Navigator.pushNamed(
                              context,
                              routeName.contactProfile,
                              arguments: {
                                'recipientId': widget.recipientId,
                                'chatType': widget.chatType,
                                'channelId': widget.channelId,
                              },
                            );
                    },
                  ),
                ],
              ),
              Row(
                children: [
                  GlassButton(
                    icon: svgAssets.search,
                    color: appColor(context).black.withValues(alpha: 0.6),
                    onTap: () {
                      setState(() {
                        _isSearching = true;
                      });
                    },
                  ),
                  HSpace(Sizes.s5),
                  // ✅ Show consolidated dropdown for DM, CHANNEL, and GROUP
                  if (!isSelfChat || widget.chatType != 'dm') ...[
                    if (widget.chatType == 'channel' ||
                        widget.chatType == 'group' ||
                        widget.chatType == 'dm') ...[
                      _buildCallDropdown(),
                    ],
                  ],
                ],
              ),
            ],
          ).paddingDirectional(
            top: Sizes.s40,
            bottom: Sizes.s20,
            horizontal: Sizes.s20,
          ),
    );
  }

  _showUpgradeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                color: Colors.red,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Feature Not Available',
              style: appCss.dmSansSemiBold18.textColor(
                appColor(context).darkText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Video call is not available in your current plan. Please upgrade to enable this feature.',
              style: appCss.dmSansRegular14.textColor(appColor(context).gray),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(
                    0xFFFFB800,
                  ), // Matching the yellow from image
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Got it',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCallDropdown() {
    final chatBloc = context.read<ChatBloc>();
    return PopupMenuButton<CallType>(
      position: PopupMenuPosition.under,
      offset: const Offset(0, 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onSelected: (CallType callType) {
        if (callType == CallType.video) {
          log(
            "message-=-=-==--=VIDEO CALL CLICKED ${chatBloc.currentSubscription?['data']['subscription']["plan"]["allows_video_calls"]}",
          );
          chatBloc.currentSubscription?['data']['subscription']["plan"]["allows_video_calls"] ==
                  false
              ? _showUpgradeDialog(context)
              : _initiateCall(callType);
        } else {
          _initiateCall(callType);
        }
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.r20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: Container(
            width: Sizes.s55,
            height: Sizes.s40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.r20),
              border: Border.all(
                color: appColor(context).white.withValues(alpha: 0.3),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.15),
                  blurRadius: 10,
                  offset: const Offset(-3, -3),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SvgPicture.asset(
                  svgAssets.video,
                  height: Sizes.s18,
                  width: Sizes.s18,
                  colorFilter: ColorFilter.mode(
                    appColor(context).black,
                    BlendMode.srcIn,
                  ),
                ),
                HSpace(Sizes.s5),
                SvgPicture.asset(
                  svgAssets.arrowDown,
                  height: Sizes.s12,
                  width: Sizes.s12,
                  colorFilter: ColorFilter.mode(
                    appColor(context).black,
                    BlendMode.srcIn,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      itemBuilder: (BuildContext context) => <PopupMenuEntry<CallType>>[
        if (teamSettingModel?.videoCallsEnabled == true)
          PopupMenuItem<CallType>(
            value: CallType.video,
            child: Row(
              children: [
                SvgPicture.asset(
                  svgAssets.video,
                  height: 20,
                  width: 20,
                  color: appColor(context).darkText,
                ),
                const SizedBox(width: 12),
                Text(
                  "Video Call",
                  style: appCss.dmSansMedium14.textColor(
                    appColor(context).darkText,
                  ),
                ),
              ],
            ),
          ),
        if (teamSettingModel?.audioCallsEnabled == true)
          PopupMenuItem<CallType>(
            value: CallType.audio,
            child: Row(
              children: [
                SvgPicture.asset(
                  svgAssets.call,
                  height: 20,
                  width: 20,
                  color: appColor(context).darkText,
                ),
                const SizedBox(width: 12),
                Text(
                  "Audio Call",
                  style: appCss.dmSansMedium14.textColor(
                    appColor(context).darkText,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Color _getProfileColorHeader(BuildContext context) {
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

  Widget _buildUserAvatar() {
    final isChannel = widget.channelId != null;
    final rawAvatar = widget.recipientAvatar;
    bool isValidAvatar(String? avatar) {
      return avatar != null &&
          avatar.trim().isNotEmpty &&
          avatar.trim().toLowerCase() != "null";
    }

    final hasAvatar = isValidAvatar(widget.recipientAvatar);

    return Stack(
      alignment: Alignment.bottomRight,
      children: [
        Container(
          width: Sizes.s42,
          height: Sizes.s42,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Sizes.s15),
            border: Border.all(
              color: appColor(context).gray.withValues(alpha: 0.2),
            ),
            color: (hasAvatar
                ? Colors.transparent
                : _getProfileColorHeader(context)),
            image: (!isChannel && hasAvatar)
                ? DecorationImage(
                    image: NetworkImage(
                      "${AppConstants.appUrl}${widget.recipientAvatar}",
                    ),
                    fit: BoxFit.cover,
                  )
                : null,
          ),
          child: Center(
            child: isChannel
                ? Icon(Icons.tag, color: appColor(context).black)
                : (!hasAvatar
                      ? Text(
                          widget.recipientName[0].toUpperCase(),
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        )
                      : null),
          ),
        ),

        // Only show online indicator for DMs
        if (widget.recipientId != _currentUserId && !isChannel)
          _buildOnlineIndicator(),
      ],
    );
  }

  Widget _buildOnlineIndicator() {
    return ValueListenableBuilder<Set<String>>(
      valueListenable: SocketService().onlineUsers,
      builder: (context, onlineUsers, _) {
        final isOnline = onlineUsers.contains(widget.recipientId);
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isOnline ? Colors.green : Colors.orange,
            border: Border.all(color: appColor(context).white, width: 1),
          ),
        );
      },
    );
  }

  Widget _buildUserInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          overflow: TextOverflow.ellipsis,
          (widget.recipientId == _currentUserId)
              ? '${widget.recipientName} (Me)'.toTitleCase()
              : widget.recipientName.toString().toTitleCase(),
          style: appCss.dmSansSemiBold15.textColor(appColor(context).darkText),
        ).width(Sizes.s130),
        if (memberLength > 0)
          Text(
            overflow: TextOverflow.ellipsis,
            "$memberLength ${appFonts.member}",
            style: appCss.dmSansMedium12.textColor(appColor(context).lightText),
          ).width(Sizes.s130),
        if (_currentUserId != widget.recipientId && widget.channelId == null)
          _buildOnlineStatus(),
      ],
    );
  }

  Widget _buildOnlineStatus() {
    return ValueListenableBuilder<Set<String>>(
      valueListenable: SocketService().onlineUsers,
      builder: (context, onlineUsers, _) {
        final isOnline = onlineUsers.contains(widget.recipientId);
        return Text(
          isOnline ? 'Online' : 'Offline',
          style: TextStyle(color: isOnline ? Colors.green : Colors.grey),
        );
      },
    );
  }

  Future<void> _performSearch(String query) async {
    try {
      setState(() {
        // Show loading indicator if you want
      });
      log('widget.channelId::${widget.channelId}');
      // Call the search method on ChatApi instance
      final searchResults =
          await ChatApi(
            serviceLocator<AuthBloc>(),
            serviceLocator<ApiManager>(),
          ).searchMessages(
            query: query,
            scopType: widget.chatType,
            channelId: widget.channelId != null
                ? int.tryParse(widget.channelId!)
                : null,
            recipientId: widget.recipientId != ''
                ? int.tryParse(widget.recipientId)
                : null,
          );

      setState(() {
        _searchResults = searchResults;
      });

      log('🔍 Found ${_searchResults.length} results for "$query"');
    } catch (e) {
      log('❌ Search error: $e');
      AppToast.showError(e.toString());
    }
  }

  /*   Future<void> _toggleMessageReadBy() async {
      if (_selectedMessage == null || channelInfoData == null) return;

      try {
        setState(() {
          isLongPress = false;
        });

        // ✅ Extract members and message statuses
        final members = channelInfoData!.channel.members;
        final statuses = _selectedMessage!.statuses;

        // ✅ Get list of users who have read the message
        final readUserIds = statuses
            .where(
              (s) => s.status == 'seen',
            ) // Or whatever your read status key is
            .map((s) => s.userId)
            .toSet();

        // ✅ Split members into read / unread lists
        final readMembers = members
            .where((m) => readUserIds.contains(m.user.id))
            .toList();

        final unreadMembers = members
            .where((m) => !readUserIds.contains(m.user.id))
            .toList();

        // ✅ Show popup dialog
        await showDialog(
          context: context,
          barrierDismissible: true,
          barrierColor: Colors.black54,
          builder: (context) {
            return Dialog(
              backgroundColor: Colors.white,
              insetPadding: const EdgeInsets.all(20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Read By",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                      const Divider(height: 24),

                      // ✅ Read section
                      Text(
                        "Message read by ${readMembers.length} of ${members.length} members",
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      if (readMembers.isNotEmpty)
                        ListView.builder(
                          itemCount: readMembers.length,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemBuilder: (context, index) {
                            final member = readMembers[index].user;
                            return _buildMemberTile(member);
                          },
                        )
                      else
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            "No one has read this message yet.",
                            style: TextStyle(color: Colors.black54),
                          ),
                        ),

                      const SizedBox(height: 16),

                      // ✅ Yet-to-read section
                      Text(
                        "Yet to be read by ${unreadMembers.length} members",
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      if (unreadMembers.isNotEmpty)
                        ListView.builder(
                          itemCount: unreadMembers.length,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemBuilder: (context, index) {
                            final member = unreadMembers[index].user;
                            return _buildMemberTile(member);
                          },
                        )
                      else
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            "All members have read this message!",
                            style: TextStyle(color: Colors.black54),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      } catch (e, stackTrace) {
        log('❌ [CHATSCREEN] Error showing read-by popup: $e');
        log('Stack trace: $stackTrace');

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to load read-by info'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    Widget _buildMemberTile(member) {
      final hasAvatar = member.avatar != null && member.avatar!.isNotEmpty;

      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6.0),
        child: Row(
          children: [
            Container(
              height: 30,
              width: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _getProfileColor(member.profileColor),
                image: hasAvatar
                    ? DecorationImage(
                        image: NetworkImage(
                          "${AppConstants.appUrl}${member.avatar}",
                        ),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: !hasAvatar
                  ? Center(
                      child: Text(
                        member.name[0].toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 8),
            Text(member.name, style: const TextStyle(fontSize: 14)),
          ],
        ),
      );
    }

    */

  Future<void> _toggleMessageReadBy() async {
    if (_selectedMessage == null || channelInfoData == null) return;

    try {
      setState(() {
        isLongPress = false;
      });

      final members = channelInfoData!.channel.members;
      final statuses = _selectedMessage!.statuses;

      // ✅ Extract sender ID
      final senderId = _selectedMessage!.senderId;

      // ✅ Filter read user IDs
      final readUserIds = statuses
          .where((s) => s.status == 'seen') // adjust if your status key differs
          .map((s) => s.userId)
          .toSet();

      // ✅ Split members, excluding sender
      final readMembers = members
          .where(
            (m) => readUserIds.contains(m.user.id) && m.user.id != senderId,
          )
          .toList();

      final unreadMembers = members
          .where(
            (m) => !readUserIds.contains(m.user.id) && m.user.id != senderId,
          )
          .toList();

      // ✅ Show popup
      await showDialog(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        builder: (context) {
          return Dialog(
            backgroundColor: appColor(context).white,
            insetPadding: const EdgeInsets.all(20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Read By",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(height: 24),

                    // ✅ Read section
                    Text(
                      "Message read by ${readMembers.length} of ${members.length - 1} members",
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    if (readMembers.isNotEmpty)
                      ListView.builder(
                        itemCount: readMembers.length,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (context, index) {
                          final member = readMembers[index].user;
                          return _buildMemberTile(member);
                        },
                      )
                    else
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          "No one has read this message yet.",
                          style: TextStyle(color: appColor(context).black),
                        ),
                      ),

                    const SizedBox(height: 16),

                    // ✅ Yet-to-read section
                    if (unreadMembers.isNotEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Yet to be read by ${unreadMembers.length} members",
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          if (unreadMembers.isNotEmpty)
                            ListView.builder(
                              itemCount: unreadMembers.length,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemBuilder: (context, index) {
                                final member = unreadMembers[index].user;
                                return _buildMemberTile(member);
                              },
                            )
                          else
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: Text(
                                "All members have read this message!",
                                style: TextStyle(color: Colors.black54),
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    } catch (e, stackTrace) {
      log('❌ [CHATSCREEN] Error showing read-by popup: $e');
      log('Stack trace: $stackTrace');
      AppToast.showError('Failed to load read-by info');
    }
  }

  Future<void> _toggleMessageDeliveredTo() async {
    if (_selectedMessage == null || channelInfoData == null) return;

    try {
      setState(() {
        isLongPress = false;
      });

      final members = channelInfoData!.channel.members;
      final statuses = _selectedMessage!.statuses;

      // ✅ Extract sender ID
      final senderId = _selectedMessage!.senderId;

      // ✅ Get users with different statuses
      final deliveredUserIds = statuses
          .where((s) => s.status == 'delivered')
          .map((s) => s.userId)
          .toSet();

      final seenUserIds = statuses
          .where((s) => s.status == 'seen')
          .map((s) => s.userId)
          .toSet();

      // ✅ Split members into categories (excluding sender)
      // Delivered but not read
      final deliveredMembers = members
          .where(
            (m) =>
                deliveredUserIds.contains(m.user.id) &&
                !seenUserIds.contains(m.user.id) &&
                m.user.id != senderId,
          )
          .toList();

      // Not delivered at all (not in delivered or seen)
      final notDeliveredMembers = members
          .where(
            (m) =>
                !deliveredUserIds.contains(m.user.id) &&
                !seenUserIds.contains(m.user.id) &&
                m.user.id != senderId,
          )
          .toList();

      // ✅ Show popup
      await showDialog(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        builder: (context) {
          return Dialog(
            backgroundColor: appColor(context).white,
            insetPadding: const EdgeInsets.all(20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Delivery Status",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(height: 24),

                    // ✅ Delivered section
                    Text(
                      "Delivered to ${deliveredMembers.length} of ${members.length - 1} members",
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    if (deliveredMembers.isNotEmpty)
                      ListView.builder(
                        itemCount: deliveredMembers.length,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (context, index) {
                          final member = deliveredMembers[index].user;
                          return _buildMemberTile(member);
                        },
                      )
                    else
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          "No members have received this message yet.",
                          style: TextStyle(color: appColor(context).black),
                        ),
                      ),

                    const SizedBox(height: 16),

                    // ✅ Not delivered section
                    if (notDeliveredMembers.isNotEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Not yet delivered to ${notDeliveredMembers.length} members",
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          ListView.builder(
                            itemCount: notDeliveredMembers.length,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemBuilder: (context, index) {
                              final member = notDeliveredMembers[index].user;
                              return _buildMemberTile(member);
                            },
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    } catch (e, stackTrace) {
      log('❌ [CHATSCREEN] Error showing delivered-to popup: $e');
      log('Stack trace: $stackTrace');
      AppToast.showError('Failed to load delivery info');
    }
  }

  Widget _buildMemberTile(member) {
    final hasAvatar = member.avatar != null && member.avatar!.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        children: [
          Container(
            height: 30,
            width: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _getProfileColor(member.profileColor),
              image: hasAvatar
                  ? DecorationImage(
                      image: NetworkImage(
                        "${AppConstants.appUrl}${member.avatar}",
                      ),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: !hasAvatar
                ? Center(
                    child: Text(
                      member.name[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 8),
          Text(member.name, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }

  Future<void> _toggleMessageUpdate() async {
    if (_selectedMessage == null) return;

    final messageId = _selectedMessage!.id.toString();

    log("message-==-=-=-=-=-=-=-= ${_selectedMessage!.plainTextContent}");
    setState(() {
      _messageController.text = _selectedMessage!.plainTextContent;
    });

    try {
      setState(() {
        isLongPress = false;
      });

      // Show confirmation dialog first
      /* final shouldDelete = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('Delete Message'),
            content: Text('Are you sure you want to delete this message?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text('Delete', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ); */

      /* if (shouldDelete != true) return; */

      log('🗑️ [CHATSCREEN] Starting message deletion process for: $messageId');

      // STEP 1: Immediate local deletion via ChatBloc
      /* context.read<ChatBloc>().add(
          SocketMessageDeleted({
            'id': messageId,
            'messageId': messageId,
            'sender_id': SocketService().currentUserId,
            'channel_id': widget.channelId,
            'recipient_id': widget.recipientId,
            'deletedBy': SocketService().currentUserId,
            'timestamp': DateTime.now().toIso8601String(),
            'source': 'local_delete',
          }),
        ); */

      // STEP 2: Socket emission (for other users)
      /*  final deleteEventData = {
          'messageId': messageId,
          'message_id': messageId,
          'id': messageId,
          'userId': SocketService().currentUserId,
          'user_id': SocketService().currentUserId,
          'deletedBy': SocketService().currentUserId,
          'recipientId': widget.recipientId,
          'channelId': widget.channelId,
          'channel_id': widget.channelId,
          'recipient_id': widget.recipientId,
          'timestamp': DateTime.now().toIso8601String(),
          'type': widget.channelId != null ? 'channel' : 'dm',
          'action': 'delete',
          'source': 'user_action',
        }; */

      // log('📡 [CHATSCREEN] Emitting socket delete event: $deleteEventData');
      // SocketService().emit(SocketEvents.messageDeleted, deleteEventData);

      // STEP 3: Force UI refresh
      // Future.delayed(Duration(milliseconds: 100), () {
      //   _forceUIRefresh();
      // });

      // // STEP 4: Background API call
      // _performBackgroundMessageDeletion(messageId);

      // // Show success message
      // ScaffoldMessenger.of(context).showSnackBar(
      //   SnackBar(
      //     content: Text('Message deleted'),
      //     backgroundColor: Colors.green,
      //     duration: Duration(seconds: 2),
      //   ),
      // );

      log('✅ [CHATSCREEN] Message deletion process completed');
    } catch (e, stackTrace) {
      log('❌ [CHATSCREEN] Error deleting message: $e');
      log('Stack trace: $stackTrace');
      AppToast.showError('Failed to edit Message');
    }
  }

  // Background API call for reactions (runs async)
  void _performBackgroundReactionAPI(
    String messageId,
    String emoji,
    String action,
  ) async {
    try {
      log(
        '📡 Starting background API reaction $action for message: $messageId',
      );

      bool success = false;
      if (action == 'add') {
        success = await ChatApi(
          context.read<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).addMessageReaction(messageId, emoji);
      } else if (action == 'remove') {
        // This handles the removal API call
        success = await ChatApi(
          context.read<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).removeMessageReaction(messageId, emoji);
      }

      if (success) {
        log('✅ Background API reaction $action successful');
      } else {
        log(
          '⚠️ Background API reaction $action failed - socket update already applied',
        );
      }
    } catch (e) {
      log('⚠️ Background API reaction $action error: $e');
      // Don't disturb user - socket reaction already worked
    }
  }

  Future<void> _toggleMessagePin() async {
    if (_selectedMessage == null) return;

    final messageId = _selectedMessage!.id.toString();
    final isPinned = _selectedMessage!.isPinned;

    if (_isMarkingMessagesAsRead) {
      log('Pin operation already in progress, skipping');
      return;
    }

    try {
      setState(() {
        isLongPress = false;

        _selectedMessage = null;

        _isMarkingMessagesAsRead = true;
      });

      log(
        '🔄 Making API call to ${isPinned ? 'unpin' : 'pin'} message: $messageId',
      );

      // API call
      bool success;
      if (isPinned) {
        success = await ChatApi(
          context.read<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).unPinMessage(messageId);
      } else {
        success = await ChatApi(
          context.read<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).pinMessage(messageId);
      }

      if (success) {
        log('✅ API call successful for message $messageId');

        // DON'T manually update local state here - let socket event handle it
        // The backend will send the direct pinned message or pin status update

        // Just emit the socket event to notify backend
        // SocketService().emit(SocketEvents.messagePin, {
        //   'messageId': messageId,
        //   'isPinned': !isPinned,
        //   'userId': SocketService().currentUserId,
        //   'recipientId': widget.recipientId,
        //   'channelId': widget.channelId,
        //   'timestamp': DateTime.now().toIso8601String(),
        // });
        AppToast.showMessage(isPinned ? 'Message unpinned' : 'Message pinned');

        log('✅ Pin operation completed successfully');
      } else {
        throw Exception('API call failed');
      }
    } catch (e) {
      log('❌ Error toggling pin status: $e');
      AppToast.showError('Failed to ${isPinned ? 'unpin' : 'pin'} message');
    } finally {
      if (mounted) {
        setState(() {
          _isMarkingMessagesAsRead = false;
        });
      }
    }
  }

  Future<void> _toggleMessageFavorite() async {
    if (_selectedMessage == null) return;

    final messageId = _selectedMessage!.id.toString();
    final isFavorite = _selectedMessage!.isFavorite;

    try {
      setState(() {
        isLongPress = false;
        _selectedMessage = null;
      });

      log(
        '🔄 Making API call to ${isFavorite ? 'unfavorite' : 'favorite'} message: $messageId',
      );

      // API call
      bool success;
      if (isFavorite) {
        success = await ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).removeFavoriteMessage(messageId);
      } else {
        success = await ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).addFavoriteMessage(messageId);
      }

      if (success) {
        log('✅ API call successful, emitting socket event');

        // DON'T manually update local state - let socket event handle it
        // Just emit the socket event to notify backend
        SocketService().emit(SocketEvents.messageFavorite, {
          'messageId': messageId,
          'isFavorite': !isFavorite,
          'userId': AuthService().userId,
          'recipientId': widget.recipientId,
          'channelId': widget.channelId,
          'timestamp': DateTime.now().toIso8601String(),
        });

        AppToast.showMessage(
          isFavorite ? 'Removed from favorites' : 'Added to favorites',
        );
      } else {
        throw Exception('API call failed');
      }
    } catch (e) {
      log('❌ Error toggling favorite status: $e');
      AppToast.showError(
        'Failed to ${isFavorite ? 'remove from' : 'add to'} favorites',
      );
    }
  }

  @override
  void dispose() {
    _isScreenVisible = false; // ✅ Mark screen as not visible
    _closeReactionPicker();
    _messageController.dispose();
    _connectivitySubscription?.cancel();
    _callStateSubscription?.cancel();
    _highlightTimer?.cancel();
    _scrollController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _initializeChat() async {
    final chatBloc = context.read<ChatBloc>();
    final authState = context.read<AuthBloc>().state;

    final userId = AuthService().userId;
    final userName = AuthService().userName;

    if (authState is AuthSuccess) {
      chatBloc.initializeAuth(
        authState.token ?? '',
        authState.teamId ?? 0,
        userId.toString(),
        userName!,
      );

      if (!SocketService().isConnected) {
        log(
          'Warning: Socket not connected. Should be initialized in Dashboard',
        );
      }
    }
  }

  Timer? _typingTimer;

  void _onTypingChanged() {
    final text = _messageController.text.trim();
    final isCurrentlyTyping = text.isNotEmpty;

    // Only send "isTyping: true" when user starts typing (not on every keystroke)
    if (isCurrentlyTyping && !_isTyping) {
      _isTyping = true;
      final authState = context.read<AuthBloc>().state;
      if (authState is AuthSuccess) {
        SocketService().sendTyping(
          recipientId: widget.channelId == null ? widget.recipientId : null,
          channelId: widget.channelId,
          userId: authState.userId.toString(),
          userName: authState.userName!,
          isTyping: true,
        );
      }
    }

    // Reset debounce timer
    _typingTimer?.cancel();
    if (isCurrentlyTyping) {
      _typingTimer = Timer(const Duration(seconds: 2), () {
        _isTyping = false;
        final authState = context.read<AuthBloc>().state;
        if (authState is AuthSuccess) {
          SocketService().sendTyping(
            recipientId: widget.channelId == null ? widget.recipientId : null,
            channelId: widget.channelId,
            userId: authState.userId.toString(),
            userName: authState.userName!,
            isTyping: false,
          );
        }
      });
    }
  }

  void _showDoubleTapFeedback(Offset position) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;
  }

  bool _isLoadingMembers = false;

  Future<void> _fetchMembersFromApi() async {
    setState(() => _isLoadingMembers = true);

    try {
      final chatApi = ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      );

      final channelInfo = await chatApi.channelInfo(
        channelId: widget.channelId,
      );
      memberLength = channelInfo.channel.members.length;

      setState(() {
        // Filter out current user from member list
        _members = channelInfo.channel.members.where((m) {
          return m.userId.toString() != AuthService().userId;
        }).toList();
      });
    } catch (e, st) {
      debugPrint("❌ Error fetching channel members: $e\n$st");
    } finally {
      setState(() => _isLoadingMembers = false);
    }
  }

  void _setupMentionListener() {
    _messageController.addListener(() {
      final text = _messageController.text;
      if (text.endsWith('@')) {
        setState(() => _showMemberList = true);
      } else if (!text.contains('@')) {
        setState(() => _showMemberList = false);
      }
    });
  }

  void _insertMention(String name, int userId) {
    final text = _messageController.text;
    final selection = _messageController.selection;

    final newText = text.replaceRange(
      selection.start - 1,
      selection.start,
      '@$name ',
    );

    _messageController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(
        offset: selection.start + name.length + 1,
      ),
    );

    mentionHelper.addMentionedUser(userId, name);
    setState(() => _showMemberList = false);
  }

  @override
  Widget build(BuildContext context) {
    log("widget.recipientName::${memberLength}");
    return WillPopScope(
      onWillPop: () async {
        log('🔙 User pressed back button');
        _isScreenVisible = false; // ✅ Mark as not visible

        // ✅ DON'T mark messages as read on back press
        // Just navigate back
        Navigator.of(
          context,
          rootNavigator: true,
        ).popUntil((route) => route.isFirst);
        return false; // Prevent default pop
      },
      child: GestureDetector(
        onTap: _closeHeaderOptions, // Close header when tapping outside
        child: Scaffold(
          /*   backgroundColor:  appColor(context).primary, */
          body: Container(
            height: double.infinity,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  appColor(
                    context,
                  ).commonBgColor /*   Color(0XFFD8E0FF) */ /* overlayColor72 */,
                  // Top purple shade
                  appColor(context).white, // Bottom
                ],
              ),
            ),
            child: Column(
              children: [
                _buildHeader(),
                if (_isSearching && _searchResults.isNotEmpty)
                  Expanded(child: _buildSearchResults())
                else if (_isSearching && _searchController.text.isNotEmpty)
                  Expanded(
                    child: Center(
                      child: Text(
                        'No results found for "${_searchController.text}"',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: Column(
                      children: [
                        Expanded(
                          child: BlocConsumer<ChatBloc, ChatState>(
                            listener: (context, state) {
                              log(
                                '🔍 [LISTENER] State changed: ${state.runtimeType}',
                              );

                              if (state is NewMessageReceived) {
                                log('📬 [LISTENER] NewMessageReceived');
                              }
                            },
                            builder: (context, state) {
                              log(
                                '🔨 [BUILDER] Rebuilding with: ${state.runtimeType}',
                              );

                              if (_isInitialLoad && state is! MessagesLoaded) {
                                return Center(
                                  child: CircularProgressIndicator(
                                    color: appColor(context).primary,
                                  ),
                                );
                              }

                              if (state is MessagesLoaded && _isInitialLoad) {
                                _isInitialLoad = false;
                              }

                              // ✅ GET MESSAGES FROM ANY STATE
                              List<ChatMessageModel> messages = [];

                              if (state is MessagesLoaded) {
                                messages = state.messages;
                                log(
                                  '📊 [BUILDER] MessagesLoaded: ${messages.length} messages',
                                );
                              } else if (state is NewMessageReceived) {
                                messages = state.messages;
                                log(
                                  '📊 [BUILDER] NewMessageReceived: ${messages.length} messages',
                                );
                              } else if (state is MessageSent) {
                                messages = state.messages;
                                log(
                                  '📊 [BUILDER] MessageSent: ${messages.length} messages',
                                );
                              } else if (state is MessageSending) {
                                messages = (state as dynamic).messages ?? [];
                                log(
                                  '📊 [BUILDER] MessageSending: ${messages.length} messages',
                                );
                              }

                              if (messages.isEmpty) {
                                return Center(
                                  child: Text(
                                    'No messages yet. Start the conversation!',
                                    style: TextStyle(
                                      color: appColor(context).lightText,
                                      fontSize: 16,
                                    ),
                                  ),
                                );
                              }

                              log(
                                '📊 [BUILDER] Building ListView with ${messages.length} messages',
                              );

                              return Stack(
                                children: [
                                  ListView.builder(
                                    controller: _scrollController,
                                    reverse: true,
                                    padding: const EdgeInsets.all(16),
                                    itemCount: messages.length,
                                    // ✅ Add key to force item rebuild
                                    itemBuilder: (context, index) {
                                      ChatMessageModel message =
                                          messages[messages.length - 1 - index];

                                      return GestureDetector(
                                        key: ValueKey(message.id),
                                        // ✅ Force rebuild when message changes
                                        onDoubleTapDown: (details) {
                                          if (widget.channelId != null &&
                                                  message.content.contains(
                                                    'Everyone in the team',
                                                  ) ||
                                              (message.metadata?['system_action'] ==
                                                      'member_left' ||
                                                  message.metadata?['system_action'] ==
                                                      'member_removed' ||
                                                  message.metadata?['system_action'] ==
                                                      'member_added')) {
                                          } else {
                                            _showReactionPicker(
                                              context,
                                              details.globalPosition,
                                              message,
                                            );
                                          }
                                        },
                                        onTap: () {
                                          if (isLongPress) {
                                            setState(() {
                                              final id = message.id.toString();
                                              if (_selectedMessageIds.contains(
                                                id,
                                              )) {
                                                _selectedMessageIds.remove(id);
                                                if (_selectedMessageIds
                                                    .isEmpty) {
                                                  isLongPress = false;
                                                  _selectedMessage = null;
                                                }
                                              } else {
                                                _selectedMessageIds.add(id);
                                                _selectedMessage = message;
                                              }
                                            });
                                          }
                                        },
                                        onLongPress: () {
                                          setState(() {
                                            isLongPress = true;
                                            _selectedMessageIds.add(
                                              message.id.toString(),
                                            );
                                            _selectedMessage = message;
                                          });
                                        },
                                        child: _buildMessageBubbleSafe(message),
                                      );
                                    },
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                        if (widget.recipientId != _currentUserId)
                          _buildTypingIndicator(),
                        // 👇 Show member list when typing @
                        if (_showMemberList && _members.isNotEmpty)
                          Container(
                            height: 150,
                            margin: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            padding: EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: appColor(context).bgColor,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ListView.builder(
                              padding: EdgeInsets.zero,
                              itemCount:
                                  _members
                                      .where((m) => m.user.id != currentUserId)
                                      .length +
                                  1, // +1 for "All"
                              itemBuilder: (context, index) {
                                // Filter out current user once
                                final filteredMembers = _members
                                    .where((m) => m.user.id != currentUserId)
                                    .toList();

                                // "All" option
                                if (index == 0) {
                                  return ListTile(
                                    leading: Icon(
                                      Icons.group,
                                      color: appColor(context).darkText,
                                    ),
                                    title: Text(
                                      'All',
                                      style: TextStyle(
                                        color: appColor(context).darkText,
                                      ),
                                    ),
                                    onTap: () {
                                      final allIds = filteredMembers
                                          .map((m) => m.user.id)
                                          .toList();
                                      final allNames = filteredMembers
                                          .map((m) => m.user.name)
                                          .toList();

                                      mentionHelper.addMentionedUsers(
                                        allIds,
                                        allNames,
                                      );

                                      _messageController.text =
                                          '${_messageController.text}All ';

                                      setState(() => _showMemberList = false);
                                    },
                                  );
                                }

                                final member = filteredMembers[index - 1];

                                return ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: Color(
                                      int.parse(
                                        member.user.profileColor.replaceAll(
                                          '#',
                                          '0xff',
                                        ),
                                      ),
                                    ),
                                    backgroundImage: member.user.avatar != null
                                        ? NetworkImage(member.user.avatar!)
                                        : null,
                                    child: member.user.avatar == null
                                        ? Text(
                                            member.user.name
                                                .substring(0, 1)
                                                .toUpperCase(),
                                            style: TextStyle(
                                              color: appColor(context).darkText,
                                            ),
                                          )
                                        : null,
                                  ),
                                  title: Text(
                                    member.user.name,
                                    style: TextStyle(
                                      color: appColor(context).darkText,
                                    ),
                                  ),
                                  onTap: () {
                                    _insertMention(
                                      member.user.name,
                                      member.user.id,
                                    );
                                    setState(() => _showMemberList = false);
                                  },
                                );
                              },
                            ),
                          ),

                        ChatsLayout().buildMessageInput(
                          _selectedMessage,
                          _messageController,
                          _isReplying,

                          _cancelReply,
                          _scrollController,
                          widget.channelId,
                          widget.recipientId,
                          mentionHelper.mentionedUserIds,
                          mentionHelper,
                          replyToMessage: _replyToMessage,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    return Column(
      children: [
        // Search results header
        Padding(
          padding: EdgeInsets.all(Sizes.s16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Search Results',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: appColor(context).primary,
                ),
              ),
              Text(
                '${_searchResults.length} found',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ),
        Divider(height: 1, color: appColor(context).dividerColor),
        Expanded(
          child: ListView.builder(
            padding: EdgeInsets.all(Sizes.s8),
            itemCount: _searchResults.length,
            itemBuilder: (context, index) {
              final message = _searchResults[index];
              return _buildSearchResultItem(message);
            },
          ),
        ),
      ],
    );
  }

  String formatMessageTime(DateTime createdAt) {
    // Ensure the time is in the user's local timezone
    final localTime = createdAt.toLocal();
    final now = DateTime.now();
    final difference = now.difference(localTime);

    if (difference.inDays == 0) {
      // Same day → show time only
      return DateFormat.jm().format(localTime); //  e.g. 3:45 PM
    } else if (difference.inDays == 1) {
      // Yesterday
      return 'Yesterday • ${DateFormat.jm().format(localTime)}';
    } else {
      // Older messages
      return DateFormat('MMM dd, yyyy • ').add_jm().format(localTime);
      // e.g. Oct 30, 2025 • 3:45 PM
    }
  }

  Widget _buildSearchResultItem(Map<String, dynamic> message) {
    log('📨 message[content]:::${message['content']}');

    final content = QuillParser.deltaToPlainText(message['content']);
    log("✅ Parsed content::$content");

    final channel = message['channel'] as Map<String, dynamic>?;
    final sender = message['sender'] as Map<String, dynamic>?;
    final createdAt =
        DateTime.tryParse(message['created_at']?.toString() ?? '') ??
        DateTime.now();

    final isChannel = channel != null;
    final senderName = sender?['name']?.toString() ?? 'Unknown';

    return Card(
      margin: EdgeInsets.symmetric(vertical: Sizes.s4, horizontal: Sizes.s8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Sizes.s12),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.all(Sizes.s12),
        leading: Container(
          width: Sizes.s40,
          height: Sizes.s40,
          decoration: BoxDecoration(
            color: isChannel
                ? appColor(context).primary
                : Colors.green.withValues(alpha: 0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isChannel ? Icons.tag : Icons.person,
            color: isChannel ? appColor(context).primary : Colors.green,
            size: Sizes.s20,
          ),
        ),
        title: Text(
          isChannel
              ? '${channel['name']?.toString() ?? 'Channel'} • $senderName'
              : ' $senderName',
          style: appCss.dmSansMedium16.textColor(appColor(context).darkText),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Only show text if content is not empty
            if (content.isNotEmpty)
              RichText(
                text: TextSpan(
                  children: _highlightSearchText(
                    content,
                    _searchController.text,
                  ),
                  style: appCss.dmSansRegular14.textColor(
                    appColor(context).lightText,
                  ),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            if (content.isEmpty)
              Text(
                '[No text content]',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                  fontStyle: FontStyle.italic,
                ),
              ),
            SizedBox(height: Sizes.s4),
            Text(
              formatMessageTime(createdAt),
              style: TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ],
        ),
        onTap: () {
          _navigateToMessage(message);
        },
      ),
    );
  }

  List<TextSpan> _highlightSearchText(String content, String query) {
    if (query.isEmpty) return [TextSpan(text: content)];

    final matches = query.toLowerCase().allMatches(content.toLowerCase());
    if (matches.isEmpty) return [TextSpan(text: content)];

    final List<TextSpan> spans = [];
    int lastEnd = 0;
    log('content::$content');
    for (final match in matches) {
      // Text before match
      if (match.start > lastEnd) {
        spans.add(
          TextSpan(
            text: content.substring(lastEnd, match.start),
            style: appCss.dmSansRegular14.textColor(
              appColor(context).lightText,
            ),
          ),
        );
      }

      // Matched text
      spans.add(
        TextSpan(
          text: content.substring(match.start, match.end),
          style: TextStyle(
            color: appColor(context).primary,
            fontWeight: FontWeight.bold,
            backgroundColor: appColor(context).primary.withValues(alpha: 0.1),
          ),
        ),
      );

      lastEnd = match.end;
    }

    // Text after last match
    if (lastEnd < content.length) {
      spans.add(
        TextSpan(
          text: content.substring(lastEnd),
          style: appCss.dmSansRegular14.textColor(appColor(context).lightText),
        ),
      );
    }

    return spans;
  }

  bool isSearchNavigate = false;

  void _navigateToMessage(Map<String, dynamic> message) {
    final messageId = message['id']?.toString();
    log('Navigate to message: $messageId');

    setState(() {
      _highlightedMessageId = messageId;
      isSearchNavigate = true;
      _isSearching = false;
      _searchController.clear();
    });
    Future.delayed(Duration(seconds: 1)).then((value) {
      setState(() {
        _highlightedMessageId = null;
      });
    });
  }

  void _forceRejoinRooms() {
    log('🔄 Force rejoining rooms...');

    if (!SocketService().isConnected) {
      log('❌ Cannot rejoin - socket not connected');
      return;
    }

    final currentUserId = AuthService().userId;
    if (currentUserId == null) {
      log('❌ Cannot rejoin - no current user ID');
      return;
    }

    try {
      // Rejoin user room
      SocketService().emit('join-room', currentUserId);
      log('✅ Rejoined user room: $currentUserId');

      // Rejoin channel if needed
      if (widget.channelId != null) {
        SocketService().emit('join-channel', widget.channelId);
        SocketService().emit(SocketEvents.joinChannel, widget.channelId);
        log('✅ Rejoined channel: ${widget.channelId}');

        // Subscribe to channel updates
        SocketService().emit(SocketEvents.channelUpdates, {
          'channelId': widget.channelId,
          'userId': currentUserId,
          'action': 'subscribe',
        });
        log('✅ Resubscribed to channel updates');
      }

      // Set online
      SocketService().setOnline();
      log('✅ Set status to online');
    } catch (e) {
      log('❌ Error in force rejoin: $e');
    }
  }

  void _setupDirectMessageListener() {
    // Listen for message status updates
    SocketService().onSocketEvent(SocketEvents.messageStatusUpdated, (data) {
      log('🔔 [SOCKET] Message status updated event: $data');

      if (mounted) {
        context.read<ChatBloc>().add(SocketMessageStatusUpdated(data));
      }
    });

    // ✅ Listen for bulk read updates
    SocketService().onSocketEvent(SocketEvents.messagesRead, (data) {
      log('🔔 [SOCKET] Bulk messages read event: $data');

      if (mounted) {
        final messageIds = data['message_ids'] as List?;
        final userId =
            data['user_id']?.toString() ?? data['userId']?.toString();

        if (messageIds != null && userId != null) {
          log('   📦 Processing ${messageIds.length} messages');

          for (var messageId in messageIds) {
            context.read<ChatBloc>().add(
              SocketMessageStatusUpdated({
                'messageId': messageId.toString(),
                'message_id': messageId.toString(),
                'status': 'read',
                'userId': userId,
                'user_id': userId,
                'timestamp': DateTime.now().toIso8601String(),
              }),
            );
          }
        }
      }
    });

    SocketService().onSocketEvent(SocketEvents.messageDelivered, (data) {
      log('🔔 [SOCKET] Message delivered event: $data');

      if (mounted) {
        context.read<ChatBloc>().add(SocketMessageStatusUpdated(data));
      }
    });

    // Existing message received listener removed - redundant with ChatBloc
    // ChatBloc handles decryption and state updates for incoming messages.

    // Deletion listener
    SocketService().onSocketEvent(SocketEvents.messageDeleted, (data) {
      log('🗑️ [CHATSCREEN] Deletion event received');

      final messageId = data['id']?.toString() ?? data['messageId']?.toString();
      final messageChannelId = data['channel_id']?.toString();
      final messageRecipientId = data['recipient_id']?.toString();

      bool isRelevant = false;

      if (widget.channelId != null) {
        isRelevant = messageChannelId == widget.channelId;
      } else {
        isRelevant =
            (messageRecipientId == widget.recipientId) ||
            (data['sender_id']?.toString() == widget.recipientId);
      }

      if (isRelevant && messageId != null && mounted) {
        log('✅ [CHATSCREEN] Processing deletion');

        try {
          context.read<ChatBloc>().add(SocketMessageDeleted(data));
        } catch (e) {
          log('❌ [CHATSCREEN] Error: $e');
        }

        Future.delayed(Duration(milliseconds: 100), () {
          if (mounted) {
            context.read<ChatBloc>().add(RefreshMessages());
          }
        });
      }
    });
  }

  Widget _buildTypingIndicator() {
    if (_typingUsers.isEmpty) return SizedBox.shrink();

    String typingText;
    if (widget.channelId != null) {
      // Channel: Show multiple users typing
      final typingNames = _typingUsers.values.toList();
      if (typingNames.length == 1) {
        typingText = "${typingNames.first} is typing...";
      } else if (typingNames.length == 2) {
        typingText = "${typingNames.join(' and ')} are typing...";
      } else {
        typingText =
            "${typingNames.take(2).join(', ')} and ${typingNames.length - 2} others are typing...";
      }
    } else {
      // DM: Show single user typing
      typingText = "${widget.recipientName} is typing...";
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          typingText,
          style: const TextStyle(
            fontStyle: FontStyle.italic,
            color: Colors.grey,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  OverlayEntry? _reactionPickerOverlay; // Track current overlay
  String? _currentReactionMessageId; // Track which message's picker is open

  void _showReactionPicker(
    BuildContext context,
    Offset globalPosition,
    ChatMessageModel message,
  ) {
    // Get screen size
    final screenSize = MediaQuery.of(context).size;

    // Width/height of your reaction picker (approx)
    const pickerWidth = 250;
    const pickerHeight = 60;

    // Calculate safe X/Y
    double dx = globalPosition.dx - (pickerWidth / 2);
    double dy = globalPosition.dy - pickerHeight - 20;

    // Clamp X inside the screen
    dx = dx.clamp(10, screenSize.width - pickerWidth - 10);

    // Clamp Y inside screen
    dy = dy.clamp(10, screenSize.height - pickerHeight - 10);

    final messageId = message.id.toString();
    if (messageId == '') return;

    // ✅ If picker already open for this message, close it
    if (_currentReactionMessageId == messageId &&
        _reactionPickerOverlay != null) {
      _closeReactionPicker();
      return;
    }

    // ✅ Close any existing picker first
    _closeReactionPicker();

    final overlay = Overlay.of(context);

    _reactionPickerOverlay = OverlayEntry(
      builder: (context) => GestureDetector(
        // ✅ Detect taps outside the picker
        behavior: HitTestBehavior.translucent,
        onTap: () {
          log('👆 Tapped outside reaction picker - closing');
          _closeReactionPicker();
        },
        child: Stack(
          children: [
            // ✅ Transparent background to catch taps
            Positioned.fill(child: Container(color: Colors.transparent)),
            // ✅ Actual reaction picker
            Positioned(
              left: dx,
              top: dy,
              child: GestureDetector(
                // ✅ Prevent tap from propagating to background
                onTap: () {
                  log('👆 Tapped inside picker - not closing');
                },
                child: MessageReactionPicker(
                  messageId: messageId,
                  onReactionSelected: (msgId, emoji) {
                    _addReactionToMessage(msgId, emoji);
                    _closeReactionPicker(); // ✅ Close after selection
                  },
                  onClose: () {
                    _closeReactionPicker();
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );

    overlay.insert(_reactionPickerOverlay!);
    _currentReactionMessageId = messageId;
    log('✅ Reaction picker opened for message: $messageId');

    // ✅ Auto-close after 5 seconds
    Future.delayed(Duration(seconds: 5), () {
      if (_reactionPickerOverlay != null && _reactionPickerOverlay!.mounted) {
        _closeReactionPicker();
      }
    });
  }

  void _closeReactionPicker() {
    if (_reactionPickerOverlay != null) {
      if (_reactionPickerOverlay!.mounted) {
        _reactionPickerOverlay!.remove();
        log('✅ Reaction picker closed');
      }
      _reactionPickerOverlay = null;
      _currentReactionMessageId = null;
    }
  }

  void _closeHeaderOptions() {
    if (isLongPress) {
      setState(() {
        isLongPress = false;
        _selectedMessage = null;
        _selectedMessageIds.clear();
      });
    }
  }

  bool _isForwardedMessage(ChatMessageModel message) {
    // Check if message has forwarded metadata
    if (message.metadata != null) {
      if (message.metadata is Map) {
        return (message.metadata as Map)['forwarded'] == true;
      } else if (message.metadata is String) {
        try {
          final metadataJson = jsonDecode(message.metadata as String);
          return metadataJson['forwarded'] == true;
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  }

  Map<String, dynamic>? _getForwardMetadata(ChatMessageModel message) {
    if (message.metadata != null) {
      if (message.metadata is Map) {
        return message.metadata as Map<String, dynamic>;
      } else if (message.metadata is String) {
        try {
          return jsonDecode(message.metadata as String) as Map<String, dynamic>;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  String? _highlightedMessageId; // To track which message to highlight
  Timer? _highlightTimer; // To remove highlight after 1 second

  Future<void> _scrollToAndHighlightMessage(String messageId) async {
    try {
      final chatBloc = context.read<ChatBloc>();
      final chatState = chatBloc.state;

      log('📍 Attempting to scroll to message: $messageId');
      log('📊 Current state: ${chatState.runtimeType}');

      // Extract messages from current state
      List<ChatMessageModel> messages = [];
      if (chatState is MessagesLoaded) {
        messages = chatState.messages;
      } else if (chatState is NewMessageReceived) {
        messages = chatState.messages;
      } else if (chatState is MessageSent) {
        messages = chatState.messages;
      } else if (chatState is MessageSending) {
        messages = (chatState as dynamic).messages ?? [];
      }

      if (messages.isEmpty) {
        log('❌ No messages loaded yet');
        return;
      }

      log('🔍 Searching in ${messages.length} messages for ID: $messageId');

      // Find the message index
      final messageIndex = messages.indexWhere(
        (msg) => msg.id.toString() == messageId,
      );

      if (messageIndex == -1) {
        log('⚠️ Message not found with ID: $messageId');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Message not found'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
        return;
      }

      log('✅ Message found at index: $messageIndex');

      // Calculate reverse index (since ListView is reversed)
      final reverseIndex = messages.length - 1 - messageIndex;
      log('📍 Scroll to reverse index: $reverseIndex');

      // Set highlight
      setState(() {
        _highlightedMessageId = messageId;
      });

      // Add a small delay to ensure ListView is ready
      await Future.delayed(Duration(milliseconds: 100));

      // Scroll to the message
      await _scrollController.animateTo(
        reverseIndex * 120.0, // Approximate height per message
        duration: Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );

      // Remove highlight after 2 seconds
      _highlightTimer?.cancel();
      _highlightTimer = Timer(Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _highlightedMessageId = null;
          });
        }
      });

      log('✅ Successfully scrolled and highlighted message: $messageId');
    } catch (e, s) {
      log('❌ Error scrolling to message: $e');
      log('📋 Stack trace: $s');
    }
  }

  void debugMessageStatuses(ChatMessageModel message) {
    log('🔍 [DEBUG] Message ${message.id} statuses:');
    log('   Total: ${message.statuses.length}');

    for (var status in message.statuses) {
      log('   - User ${status.userId}: ${status.status}');
    }

    if (message.statuses.isEmpty) {
      log('   ⚠️ No statuses found!');
    }
  }

  Widget _buildMessageBubbleSafe(ChatMessageModel message) {
    String _formatDuration(int seconds) {
      final hours = seconds ~/ 3600;
      final minutes = (seconds % 3600) ~/ 60;
      final secs = seconds % 60;

      if (hours > 0) {
        return '${hours}h${minutes > 0 ? '${minutes}m' : ''}${secs > 0 ? '${secs}s' : ''}';
      } else if (minutes > 0) {
        return '${minutes}m${secs > 0 ? '${secs}s' : ''}';
      } else {
        return '${secs}s';
      }
    }

    final isHighlighted = _highlightedMessageId == message.id.toString();

    // Add null safety check at the start
    if (message == null) {
      log('⚠️ Null message in _buildMessageBubbleSafe');
      return SizedBox.shrink();
    }
    //
    // log(
    //   "📨 Building message bubble - ID: ${message.id}, Type: ${message.messageType}, Content: ${message.plainTextContent}",
    // );

    final chatBloc = context.read<ChatBloc>();
    final isMe =
        message.sender.id.toString() == chatBloc.currentUserId?.toString();
    final bubbleColor = message.messageType == 'reminder'
        ? appColor(context).primary.withValues(alpha: 0.3)
        : isMe
        ? appColor(context).primary
        : isDark(context)
        ? appColor(context).gray.withValues(alpha: 0.2)
        : Colors.white;
    final isForwarded = _isForwardedMessage(message);
    final forwardMetadata = _getForwardMetadata(message);

    // Handle system messages for channels
    if (widget.channelId != null &&
        message.content.contains('Everyone in the team')) {
      return Container(
        margin: EdgeInsets.symmetric(
          vertical: Sizes.s10,
          horizontal: Sizes.s20,
        ),
        child: Center(
          child: Text(
            textAlign: TextAlign.center,
            message.content,
            style: appCss.dmSansMedium13.textColor(appColor(context).gray),
          ),
        ),
      );
    }

    if (widget.channelId != null &&
        (message.metadata?['system_action'] == 'member_left' ||
            message.metadata?['system_action'] == 'member_removed' ||
            message.metadata?['system_action'] == 'member_added')) {
      return GestureDetector(
        onDoubleTap: () {
          // Do nothing on double tap for system messages
          return;
        },
        child: Container(
          margin: EdgeInsets.symmetric(
            vertical: Sizes.s5,
            horizontal: Sizes.s20,
          ),
          child: Center(
            child: Text(
              textAlign: TextAlign.center,
              message.content,
              style: appCss.dmSansMedium13.textColor(appColor(context).gray),
            ),
          ),
        ),
      );
    }
    log("message.messageType::${isSearchNavigate}//$isHighlighted");
    final statusKey = message.statuses
        .map((s) => '${s.userId}-${s.status}')
        .join('|');

    final uniqueKey =
        'msg-${message.id}-$statusKey-${DateTime.now().millisecondsSinceEpoch ~/ 1000}';

    log('🔑 [BUBBLE KEY] ${widget.profileColor}');
    return Container(
      key: ValueKey(uniqueKey), // ✅ Key changes when status changes
      color: isHighlighted
          ? appColor(context).primary.withValues(alpha: 0.3) // Highlight color
          : _selectedMessageIds.contains(message.id.toString()) && isLongPress
          ? appColor(context).black.withValues(alpha: 0.10)
          : null,
      margin: EdgeInsets.only(bottom: Sizes.s8),
      child: Stack(
        alignment: Alignment.bottomRight,
        children: [
          Column(
            crossAxisAlignment: isMe
                ? CrossAxisAlignment.end
                : CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: isMe
                    ? MainAxisAlignment.end
                    : MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar for non-me messages
                  if (!isMe) ...[
                    if (message.messageType == 'reminder')
                      Container(
                        width: Sizes.s30,
                        height: Sizes.s30,
                        decoration: BoxDecoration(
                          color: appColor(context).primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.notifications_active,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    if (message.messageType != 'reminder')
                      Container(
                        width: Sizes.s30,
                        height: Sizes.s30,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: _getProfileColor(widget.profileColor),
                        ),
                        child: Center(
                          child: Text(
                            message.senderName.isNotEmpty
                                ? message.senderName[0].toUpperCase()
                                : '',
                            style: TextStyle(
                              color: widget.chatType == 'channel'
                                  ? Colors.black
                                  : Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    HSpace(Sizes.s10),
                  ],

                  // Audio message
                  if (message.messageType == 'audio')
                    AudioMessageBubble(
                      audioUrl: "${AppConstants.appUrl}${message.fileUrl}",
                      isMe: isMe,
                      bubbleColor: bubbleColor,
                      onMoreTap: () {
                        setState(() {
                          isLongPress = true;
                          _selectedMessage = message;
                        });
                      },
                    ),

                  // Call message
                  if (message.messageType == 'call')
                    Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SvgPicture.asset(
                                  message.metadata!['call_status'] == 'ended'
                                      ? svgAssets.call
                                      : svgAssets.missedCall,
                                  width: Sizes.s24,
                                  colorFilter: ColorFilter.mode(
                                    appColor(context).white,
                                    BlendMode.srcIn,
                                  ),
                                )
                                .padding(all: Sizes.s8)
                                .decorated(
                                  color:
                                      message.metadata!['call_status'] ==
                                          'ended'
                                      ? appColor(context).green
                                      : appColor(context).red,
                                  shape: BoxShape.circle,
                                ),
                            HSpace(Sizes.s10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "${message.metadata!['call_kind'].toString().substring(0, 1).toUpperCase()}${message.metadata!['call_kind'].toString().substring(1)} Call",
                                  style: appCss.dmSansMedium14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                Text(
                                  message.metadata!['call_status'] ==
                                          'no_answer'
                                      ? 'No Answer'
                                      : message.metadata!['call_status'] ==
                                            'ended'
                                      ? _formatDuration(
                                          int.tryParse(
                                                message
                                                    .metadata!['duration_sec']
                                                    .toString(),
                                              ) ??
                                              0,
                                        )
                                      : message.metadata!['call_status'],
                                  style: appCss.dmSansMedium12.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        )
                        .padding(horizontal: Sizes.s10, vertical: Sizes.s10)
                        .decorated(
                          color: appColor(context).red.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(Sizes.s10),
                        ),

                  // Regular messages (text, image, video, file, reminder)
                  if (message.messageType != 'call' &&
                      message.messageType != 'audio')
                    Flexible(
                      child: CustomPaint(
                        painter: CustomChatBubble(
                          color: bubbleColor,
                          isOwn: isMe,
                        ),
                        child: Container(
                          // margin: EdgeInsets.only(right: isMe ? Sizes.s10 : 0),
                          padding: EdgeInsets.symmetric(
                            horizontal: Sizes.s10,
                            vertical: Sizes.s8,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Forwarded indicator
                              if (isForwarded && forwardMetadata != null) ...[
                                Container(
                                  margin: EdgeInsets.only(bottom: 8),
                                  padding: EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isMe
                                        ? Colors.white.withValues(alpha: 0.2)
                                        : appColor(
                                            context,
                                          ).primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      SvgPicture.asset(
                                        svgAssets.forwordIcon,
                                        height: 15,
                                        color: isMe
                                            ? Colors.white
                                            : appColor(context).primary,
                                      ),
                                      SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          'Forwarded',
                                          style: TextStyle(
                                            color: isMe
                                                ? Colors.white
                                                : appColor(context).primary,
                                            fontSize: 11,
                                            fontStyle: FontStyle.italic,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              // Show sender name for channels only
                              if (!isMe &&
                                  widget.channelId != null &&
                                  message.messageType != 'reminder')
                                Text(
                                  message.senderName,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    _getProfileColorHeader(context),
                                    /*isDark(context)?appColor(context).gray.withValues(alpha: 0.9):   appColor(context).black*/
                                  ),
                                ),

                              // ✅ Reply bubble — only when parent message exists
                              if (message.messageType == 'text' &&
                                  message.parentMessage != null &&
                                  message.parentId != null &&
                                  message.parentId != 0) ...[
                                InkWell(
                                  onTap: () {
                                    final parentMessageId = message.parentId
                                        .toString();
                                    log('🔄 Jump to parent: $parentMessageId');
                                    _scrollToAndHighlightMessage(
                                      parentMessageId,
                                    );
                                  },
                                  child: Container(
                                    width: Sizes.s230,
                                    margin: EdgeInsets.only(bottom: 8),
                                    padding: EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isMe
                                          ? Colors.white.withValues(alpha: 0.2)
                                          : appColor(
                                              context,
                                            ).gray.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border(
                                        left: BorderSide(
                                          color: isMe
                                              ? Colors.white
                                              : appColor(context).primary,
                                          width: 3,
                                        ),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.reply,
                                              size: 12,
                                              color: isMe
                                                  ? Colors.white70
                                                  : appColor(context).primary,
                                            ),
                                            SizedBox(width: 4),
                                            Flexible(
                                              child: Text(
                                                'Replying to ${ChatsLayout().getParentSenderName(message.parentMessage!, chatBloc.currentUserId)}',
                                                style: TextStyle(
                                                  color: isMe
                                                      ? Colors.white
                                                      : appColor(
                                                          context,
                                                        ).primary,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                        VSpace(Sizes.s4),
                                        if (message.messageType == 'image' &&
                                            message.fileUrl != null)
                                          Row(
                                            children: [
                                              CachedNetworkImage(
                                                imageUrl:
                                                    '${AppConstants.appUrl}${message.fileUrl}',
                                                width: 50,
                                                fit: BoxFit.cover,
                                                placeholder: (context, url) =>
                                                    Container(
                                                      width: 50,
                                                      height: 50,
                                                      color: Colors.grey[300],
                                                      child: Center(
                                                        child:
                                                            CircularProgressIndicator(
                                                              color: appColor(
                                                                context,
                                                              ).primary,
                                                            ),
                                                      ),
                                                    ),
                                                /*errorWidget: (context, url, error) {
                                                  log('❌ Image load error: $error');
                                                  return Container(
                                                    width: 50,
                                                    height: 50,
                                                    color: Colors.grey[300],
                                                    child: Column(
                                                      mainAxisAlignment:
                                                      MainAxisAlignment.center,
                                                      children: [
                                                    CircularProgressIndicator(color: appColor(context).primary,).center()
                                                      ],
                                                    ),
                                                  );
                                                },*/
                                              ),
                                              HSpace(Sizes.s8),
                                              Expanded(
                                                child: Text(
                                                  message
                                                      .metadata!['original_filename'],
                                                ),
                                              ),
                                            ],
                                          ).backgroundColor(Colors.red),
                                        if ((message.messageType == 'call' ||
                                            message.messageType == "audio" ||
                                            message.messageType == 'video'))
                                          Row(
                                                children: [
                                                  if (message.messageType ==
                                                      "audio")
                                                    Icon(Icons.audiotrack_outlined)
                                                        .padding(all: Sizes.s6)
                                                        .decorated(
                                                          color:
                                                              appColor(context)
                                                                  .primary
                                                                  .withValues(
                                                                    alpha: 0.2,
                                                                  ),
                                                          borderRadius:
                                                              BorderRadius.circular(
                                                                Sizes.s8,
                                                              ),
                                                        ),
                                                  if (message.messageType ==
                                                          'call' ||
                                                      message.messageType ==
                                                          'video')
                                                    SvgPicture.asset(
                                                          message.messageType ==
                                                                  'video'
                                                              ? svgAssets.video
                                                              : svgAssets.call,
                                                          colorFilter:
                                                              ColorFilter.mode(
                                                                appColor(
                                                                  context,
                                                                ).black,
                                                                BlendMode.srcIn,
                                                              ),
                                                        )
                                                        .padding(all: Sizes.s10)
                                                        .decorated(
                                                          color:
                                                              appColor(context)
                                                                  .primary
                                                                  .withValues(
                                                                    alpha: 0.2,
                                                                  ),
                                                          borderRadius:
                                                              BorderRadius.circular(
                                                                Sizes.s8,
                                                              ),
                                                        ),
                                                  HSpace(Sizes.s10),
                                                  if (message.messageType ==
                                                          'call' ||
                                                      message.messageType ==
                                                          'video')
                                                    Text(
                                                      message.messageType ==
                                                              'call'
                                                          ? "Call"
                                                          : message.messageType ==
                                                                'video'
                                                          ? "Video"
                                                          : "Audio",
                                                      style: appCss
                                                          .dmSansMedium12
                                                          .textColor(
                                                            appColor(
                                                              context,
                                                            ).gray,
                                                          ),
                                                      maxLines: 2,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                    ),
                                                ],
                                              )
                                              .padding(
                                                vertical: Sizes.s10,
                                                horizontal: Sizes.s10,
                                              )
                                              .decorated(
                                                borderRadius:
                                                    BorderRadius.circular(
                                                      Sizes.s8,
                                                    ),
                                                border: BoxBorder.all(
                                                  color: appColor(
                                                    context,
                                                  ).primary,
                                                  width: 1,
                                                ),
                                              ),
                                        if (message.messageType == 'text')
                                          Text(
                                            ChatsLayout()
                                                .getParentMessageContent(
                                                  message.parentMessage!,
                                                ),
                                            style: TextStyle(
                                              color: isMe
                                                  ? Colors.white.withValues(
                                                      alpha: 0.8,
                                                    )
                                                  : appColor(context).gray,
                                              fontSize: 12,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],

                              // Message content based on type
                              if (message.messageType == 'file')
                                ChatsLayout().buildDocumentMessage(
                                  context,
                                  message,
                                  isMe,
                                ),
                              if (message.messageType == 'image')
                                ChatsLayout().buildImageMessage(
                                  context,
                                  message,
                                  isMe,
                                ),
                              if (message.messageType == 'video')
                                ChatsLayout().buildVideoMessage(
                                  context,
                                  message,
                                  isMe,
                                ),
                              if (message.messageType == 'reminder')
                                SizedBox(
                                  width: Sizes.s250,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Header with title and sender info
                                      Text(
                                        'Reminder',
                                        style: appCss.dmSansBold12.textColor(
                                          appColor(context).primary,
                                        ),
                                      ),
                                      VSpace(Sizes.s2),
                                      Text(
                                        "${message.senderName} wanted me to remind you ${widget.channelId != null ? 'all' : ''}",
                                        style: appCss.dmSansMedium12.textColor(
                                          appColor(context).darkText,
                                        ),
                                      ),
                                      VSpace(Sizes.s8),
                                      // Content with left accent line
                                      Container(
                                        decoration: BoxDecoration(
                                          color: appColor(
                                            context,
                                          ).primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          border: Border.all(
                                            color: appColor(
                                              context,
                                            ).white.withValues(alpha: 0.2),
                                            width: 1,
                                          ),
                                        ),
                                        child: IntrinsicHeight(
                                          child: Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              // Left accent line (full height)
                                              Container(
                                                width: 3,
                                                decoration: BoxDecoration(
                                                  color: appColor(
                                                    context,
                                                  ).primary,
                                                  borderRadius:
                                                      BorderRadius.circular(2),
                                                ),
                                              ).paddingDirectional(
                                                vertical: Sizes.s4,
                                              ),
                                              HSpace(Sizes.s8),
                                              // Content text
                                              Expanded(
                                                child: Text(
                                                  message.plainTextContent,
                                                  style: appCss.dmSansMedium14
                                                      .textColor(
                                                        appColor(
                                                          context,
                                                        ).darkText,
                                                      ),
                                                ).padding(vertical: Sizes.s10),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                              /*  Text(message.content), */
                              if (message.messageType == 'text')
                                buildMessageContent(message, isMe),
                              VSpace(Sizes.s5),

                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      if (message.isFavorite == true)
                                        Icon(
                                          Icons.star,
                                          color: Colors.yellow,
                                          size: 16,
                                        ),
                                      if (message.isPinned == true)
                                        SvgPicture.asset(
                                          svgAssets.pin,
                                          colorFilter: ColorFilter.mode(
                                            isMe
                                                ? Colors.white
                                                : appColor(context).primary,
                                            BlendMode.srcIn,
                                          ),
                                        ),
                                      if ((message.isFavorite == true) ||
                                          (message.isPinned == true) ||
                                          isForwarded)
                                        HSpace(Sizes.s5),
                                      Text(
                                        ChatsLayout().formatTimestampSafe(
                                          message.createdAt,
                                        ),
                                        textAlign: isMe
                                            ? TextAlign.end
                                            : TextAlign.start,
                                        style: appCss.dmSansMedium11.textColor(
                                          isMe &&
                                                  message.messageType !=
                                                      'reminder'
                                              ? isDark(context)
                                                    ? Colors.white.withValues(
                                                        alpha: 0.6,
                                                      )
                                                    : appColor(
                                                        context,
                                                      ).white.withValues(
                                                        alpha: 0.5,
                                                      )
                                              : appColor(context).gray,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (isMe) ...[
                                    HSpace(Sizes.s15),
                                    if (widget.chatType == 'dm')
                                      _buildMessageStatusIcon(message),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ).paddingDirectional(
            bottom: message.reactions.isNotEmpty ? Sizes.s25 : Sizes.s5,
          ),
          // Reactions
          if (message.reactions.isNotEmpty)
            Positioned(
              bottom: 1,
              left: !isMe ? 50 : null,
              right: isMe ? 5 : null,
              child: Wrap(
                children: _buildReactionChips(
                  message.reactions,
                  message.id.toString(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // Replace this with your current user ID
  final int currentUserId = 3;

  Widget buildMessageContent(ChatMessageModel message, bool isMe) {
    if (message.messageType != 'text') return const SizedBox();

    final textSpans = <TextSpan>[];
    final currentUserIdInt = _getCurrentUserIdInt();

    // log("🔍 buildMessageContent - ID: ${message.id}");

    // Use decrypted content
    String content = message.content;

    if (QuillParser.isDeltaFormat(content)) {
      _parseDeltaFormat(message, textSpans, isMe, currentUserIdInt);
    } else {
      // If not delta, it's either plain text or we failed to recognize delta
      _parsePlainTextFormat(message, textSpans, isMe, currentUserIdInt);
    }

    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: Sizes.s230),
      child: RichText(
        text: TextSpan(
          children: textSpans.isNotEmpty
              ? textSpans
              : [TextSpan(text: message.plainTextContent)],
          style: appCss.dmSansMedium14.textColor(_getDefaultTextColor(isMe)),
        ),
      ),
    );
  }

  /// Get current user ID as integer
  int _getCurrentUserIdInt() {
    final currentUserIdString = _currentUserId ?? AuthService().userId ?? '';
    return int.tryParse(currentUserIdString) ?? 0;
  }

  /// Parse Quill Delta format message
  void _parseDeltaFormat(
    ChatMessageModel message,
    List<TextSpan> textSpans,
    bool isMe,
    int currentUserIdInt,
  ) {
    try {
      final ops = (json.decode(message.content)['ops'] as List<dynamic>);
      log("📝 Processing ${ops.length} ops in message");

      for (var i = 0; i < ops.length; i++) {
        final op = ops[i];
        final insert = op['insert'];

        if (insert is Map && insert.containsKey('mention')) {
          _addMentionSpan(insert['mention'], textSpans, isMe, currentUserIdInt);
        } else if (insert is String) {
          // Remove all newlines and trim whitespace
          final text = insert.replaceAll('\n', '').trim();
          _addTextSpan(text, textSpans, isMe);
        } else {
          final text = insert.toString().replaceAll('\n', '').trim();
          _addTextSpan(text, textSpans, isMe);
        }
      }
    } catch (e) {
      log("❌ Error parsing delta format: $e");
      _addTextSpan(message.content, textSpans, isMe);
    }
  }

  /// Parse plain text format message with mentions
  void _parsePlainTextFormat(
    ChatMessageModel message,
    List<TextSpan> textSpans,
    bool isMe,
    int currentUserIdInt,
  ) {
    log("⚠️ Message content is not Delta format - parsing plain text");

    final content = message.content;
    final mentionedUserIds = message.mentions ?? [];

    final isCurrentUserMentioned = mentionedUserIds.contains(currentUserIdInt);
    final isAllMention = content.toLowerCase().contains('@all');
    final shouldHighlight = isAllMention || isCurrentUserMentioned;

    log("👥 Mentioned user IDs: $mentionedUserIds | Is @all: $isAllMention");

    textSpans.add(
      TextSpan(
        text: content,
        style: TextStyle(
          color: shouldHighlight ? Colors.red : _getDefaultTextColor(isMe),
          fontWeight: shouldHighlight ? FontWeight.bold : FontWeight.normal,
          backgroundColor: shouldHighlight
              ? Colors.red.withValues(alpha: 0.1)
              : null,
        ),
      ),
    );
  }

  /// Add mention span with proper highlighting
  void _addMentionSpan(
    Map<String, dynamic> mention,
    List<TextSpan> textSpans,
    bool isMe,
    int currentUserIdInt,
  ) {
    final mentionValue = mention['value']?.toString() ?? '';
    final mentionIdRaw = mention['id']?.toString().toLowerCase() ?? '';
    final mentionId = int.tryParse(mention['id']?.toString() ?? '') ?? 0;

    final mentionText = '@$mentionValue';
    final isAllMention =
        mentionIdRaw == 'all' || mentionValue.toLowerCase() == 'all';
    final isCurrentUserMentioned =
        mentionId == currentUserIdInt && currentUserIdInt != 0;
    final shouldHighlight = isAllMention || isCurrentUserMentioned;

    log(
      "👤 Mention: $mentionText | All: $isAllMention | Current: $isCurrentUserMentioned",
    );

    textSpans.add(
      TextSpan(
        text: mentionText,
        style: TextStyle(
          color: shouldHighlight ? Colors.red : _getDefaultTextColor(isMe),
          fontWeight: FontWeight.bold,
          backgroundColor: shouldHighlight
              ? Colors.red.withValues(alpha: 0.1)
              : null,
        ),
      ),
    );
  }

  /// Add regular text span
  void _addTextSpan(String text, List<TextSpan> textSpans, bool isMe) {
    // Trim whitespace and newlines from text
    final trimmedText = text.trim();

    // Only add if there's actual content
    if (trimmedText.isNotEmpty) {
      textSpans.add(
        TextSpan(
          text: trimmedText,
          style: TextStyle(color: _getDefaultTextColor(isMe)),
        ),
      );
    }
  }

  /// Get default text color based on message sender and theme
  Color _getDefaultTextColor(bool isMe) {
    if (isMe) return Colors.white;
    return isDark(context) ? Colors.white : Colors.black.withValues(alpha: 0.6);
  }

  /*Widget buildMessageContent(ChatMessageModel message, bool isMe) {
    if (message.messageType != 'text') return SizedBox();

    final textSpans = <TextSpan>[];

    // Get current user ID with better fallback
    final currentUserIdString = _currentUserId ?? AuthService().userId ?? '';
    final currentUserIdInt = int.tryParse(currentUserIdString) ?? 0;

    log(
      "🔍 buildMessageContent - currentUserId: $currentUserIdString (int: $currentUserIdInt)",
    );

    // Check if content is Quill Delta
    if (QuillParser.isDeltaFormat(message.content)) {
      final delta = message.content;
      final ops = (json.decode(delta)['ops'] as List<dynamic>);

      log("📝 Processing ${ops.length} ops in message");
      log("📄 Full message content: ${message.content}");

      for (var i = 0; i < ops.length; i++) {
        final op = ops[i];
        log("🔍 Op $i: ${op.toString()}///${isDark(context)}");
        log("   - insert type: ${op['insert'].runtimeType}");
        log("   - insert value: ${op['insert']}");

        if (op['insert'] is Map && op['insert'].containsKey('mention')) {
          final mention = op['insert']['mention'];
          final mentionText = '@${mention['value']}';
          final mentionIdString = mention['id'].toString().toLowerCase();
          final mentionValue = mention['value'].toString().toLowerCase();
          final mentionId = int.tryParse(mention['id'].toString()) ?? 0;

          // Check if it's @all mention or current user is mentioned
          final isAllMention =
              mentionIdString == 'all' || mentionValue == 'all';
          final isCurrentUserMentioned =
              mentionId == currentUserIdInt && currentUserIdInt != 0;

          // Show red color if @all or if current user is mentioned
          final shouldHighlight = isAllMention || isCurrentUserMentioned;

          log("👤 Mention found: $mentionText");
          log("   - mentionId: $mentionId");
          log("   - isAll: $isAllMention");
          log("   - isCurrentUser: $isCurrentUserMentioned");
          log("   - shouldHighlight: $shouldHighlight");

          textSpans.add(
            TextSpan(
              text: mentionText,
              style: TextStyle(
                color: shouldHighlight
                    ? Colors.red
                    : (isMe ? Colors.white : Colors.black),
                fontWeight: FontWeight.bold,
                backgroundColor: shouldHighlight
                    ? Colors.red.withValues(alpha: 0.1)
                    : null,
              ),
            ),
          );
        } else {
          // log("   ❌ Not a mention - adding as regular text");
          textSpans.add(
            TextSpan(
              text: op['insert'].toString(),
              style: TextStyle(
                color: isMe
                    ? Colors.white
                    : isDark(context)?Colors.white:Colors.black.withValues(alpha: 0.6),
              ),
            ),
          );
        }
      }
    } else {
      // Plain text format - check for @mentions
      log("⚠️ Message content is not Delta format - parsing plain text");

      final content = message.content;
      final mentionedUserIds = message.mentions ?? [];

      // Check if current user is mentioned or if it's @all
      final isCurrentUserMentioned = mentionedUserIds.contains(
        currentUserIdInt,
      );
      final isAllMention = content.toLowerCase().contains('@all');

      log("👥 Mentioned user IDs: $mentionedUserIds");
      log("🎯 Current user ID: $currentUserIdInt");
      log("🎯 Current user mentioned: $isCurrentUserMentioned");
      log("🌍 Is @all mention: $isAllMention");

      textSpans.add(
        TextSpan(
          text: message.content,
          style: TextStyle(
            color: isAllMention || isCurrentUserMentioned
                ? Colors.red
                : isMe
                ? Colors.white
                : Colors.black.withValues(alpha: 0.6),
            fontWeight: isAllMention || isCurrentUserMentioned
                ? FontWeight.bold
                : FontWeight.normal,
            backgroundColor: isAllMention || isCurrentUserMentioned
                ? Colors.red.withValues(alpha: 0.1)
                : null,
          ),
        ),
      );
    }

    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: Sizes.s230),
      child: RichText(
        text: TextSpan(
          children: textSpans,
          style: appCss.dmSansMedium14.textColor(
            isMe ? Colors.white : Colors.black.withValues(alpha: 0.6),
          ),
        ),
      ),
    );
  }*/

  Widget _buildMessageStatusIcon(ChatMessageModel message) {
    final currentUserId = AuthService().userId;

    // Only show status for messages sent by current user
    if (message.senderId.toString() != currentUserId) {
      return SizedBox.shrink();
    }

    String status = 'S'; // Default: Sent
    Color statusColor = Colors.grey;

    log('🔍 [STATUS ICON] Message ${message.id}');
    log('   📊 Total statuses: ${message.statuses.length}');

    if (message.statuses.isNotEmpty) {
      // ✅ FIXED: Check for both 'read' AND 'seen'
      final hasRead = message.statuses.any((s) {
        final statusLower = s.status.toLowerCase();
        return statusLower == 'read' || statusLower == 'seen';
      });

      // ✅ Check for delivered status
      final hasDelivered = message.statuses.any((s) {
        final statusLower = s.status.toLowerCase();
        return statusLower == 'delivered';
      });

      // ✅ Check for sent status
      final hasSent = message.statuses.any((s) {
        final statusLower = s.status.toLowerCase();
        return statusLower == 'sent';
      });

      // Determine final status
      if (hasRead) {
        status = 'R';
        statusColor = Colors.white.withValues(alpha: 0.8);
        log('   ✅ STATUS: READ/SEEN');
      } else if (hasDelivered) {
        status = 'D';
        statusColor = Colors.white.withValues(alpha: 0.8);
        log('   ✅ STATUS: DELIVERED');
      } else if (hasSent) {
        status = 'S';
        statusColor = Colors.white.withValues(alpha: 0.8);
        log('   ✅ STATUS: SENT');
      } else {
        status = 'S';
        statusColor = Colors.grey;
        log('   ⚠️ STATUS: UNKNOWN - defaulting to SENT');
      }

      // Debug log all statuses
      for (var s in message.statuses) {
        log('   - User ${s.userId}: ${s.status}');
      }
    } else {
      log('   ⚠️ No statuses - defaulting to SENT');
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 2, vertical: 0),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: statusColor, width: 0.5),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: statusColor,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  List<Widget> _buildReactionChips(
    List<ReactionChat> reactions,
    String messageId,
  ) {
    final Map<String, ReactionChat> groupedReactions = {
      for (var r in reactions) r.emoji: r,
    };

    final currentUserId = AuthService().userId;

    return groupedReactions.entries.where((entry) => entry.value.count > 0).map(
      (entry) {
        final emoji = entry.key;
        final reaction = entry.value;
        final count = reaction.count;
        final hasUserReacted = reaction.users.contains(currentUserId);

        return GestureDetector(
          onTap: () {
            log('🎯 Reaction chip tapped: $emoji');

            // ✅ Close any open reaction picker first
            _closeReactionPicker();
            log("hasUserReacted::$hasUserReacted");
            if (hasUserReacted) {
              // ✅ Remove reaction if user already reacted
              _removeReactionFromMessage(messageId, emoji);
            } else {
              // ✅ Add reaction if user hasn't reacted
              _addReactionToMessage(messageId, emoji);
            }
          },
          child: AnimatedContainer(
            duration: Duration(milliseconds: 150),
            margin: const EdgeInsets.only(right: 4, bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: appColor(context).white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: hasUserReacted
                    ? appColor(context).primary
                    : Colors.grey.withValues(alpha: 0.5),
                width: hasUserReacted ? 1 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  emoji,
                  style: TextStyle(fontSize: hasUserReacted ? 16 : 14),
                ),
                const SizedBox(width: 4),
                Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 12,
                    color: hasUserReacted
                        ? appColor(context).primary
                        : isDark(context)
                        ? Colors.white
                        : Colors.grey[700],
                    fontWeight: hasUserReacted
                        ? FontWeight.bold
                        : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ).toList();
  }

  void debugSocketReactions() {
    final socketService = SocketService();

    log('=== REACTION SOCKET DEBUG ===');
    log('Socket connected: ${socketService.isConnected}');
    log('Current user ID: ${socketService.currentUserId}');
    log('Socket instance: ${socketService.socket != null}');

    if (socketService.socket != null) {
      log('Socket ID: ${socketService.socket!.id}');
    }

    log('==============================');
  }

  void _addReactionToMessage(String messageId, String emoji) {
    try {
      final currentUserId = AuthService().userId;
      if (currentUserId == null) {
        log('❌ Cannot add reaction: currentUserId is null');
        return;
      }

      log('😊 [INSTANT] Adding reaction $emoji to message $messageId');

      // STEP 1: INSTANT local UI update
      context.read<ChatBloc>().add(
        AddReactionLocally(
          messageId: messageId,
          emoji: emoji,
          userId: currentUserId,
        ),
      );

      // STEP 2: Socket emission (for other users)
      SocketService().emit(SocketEvents.addReaction, {
        'message_id': messageId,
        'messageId': messageId,
        'emoji': emoji,
        'userId': currentUserId,
        'user_id': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'channelId': widget.channelId,
        'recipientId': widget.recipientId,
      });

      // STEP 3: Background API call
      _performBackgroundReactionAPI(messageId, emoji, 'add');

      log('✅ [INSTANT] Reaction added with instant UI update');
    } catch (e) {
      log('❌ [INSTANT] Error in _addReactionToMessage: $e');
    }
  }

  void _removeReactionFromMessage(String messageId, String emoji) {
    try {
      final currentUserId = AuthService().userId;
      if (currentUserId == null) {
        log('❌ Cannot remove reaction: currentUserId is null');
        return;
      }

      log('😐 [INSTANT] Removing reaction $emoji from message $messageId');

      // STEP 1: INSTANT local UI update
      context.read<ChatBloc>().add(
        RemoveReactionLocally(
          messageId: messageId,
          emoji: emoji,
          userId: currentUserId,
        ),
      );

      // ✅ ADD THIS: Force UI refresh to hide empty reactions
      setState(() {}); // ✅ ADD THIS LINE

      // STEP 2: Socket emission (for other users)
      SocketService().emit(SocketEvents.removeReaction, {
        'message_id': messageId,
        'messageId': messageId,
        'emoji': emoji,
        'userId': currentUserId,
        'user_id': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'channelId': widget.channelId,
        'recipientId': widget.recipientId,
      });

      // STEP 3: Background API call
      _performBackgroundReactionAPI(messageId, emoji, 'remove');

      log('✅ [INSTANT] Reaction removed with instant UI update');
    } catch (e) {
      log('❌ [INSTANT] Error in _removeReactionFromMessage: $e');
    }
  }

  String? _currentUserId;

  void _loadCurrentUserId() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      _currentUserId = prefs.getString("userId");
    });
  }

  Widget _buildLongPressHeader() {
    final selectionCount = _selectedMessageIds.length;
    final isSingleSelection = selectionCount == 1;

    ChatMessageModel? selectedMsg = isSingleSelection ? _selectedMessage : null;
    final chatBloc = context.read<ChatBloc>();

    final isImageMessage = selectedMsg?.messageType == 'image';
    final isTextMessage = selectedMsg?.messageType == 'text';
    final isCallMessage = selectedMsg?.messageType == 'call';

    return Container(
      decoration: BoxDecoration(
        color: appColor(context).commonBgColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 5,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child:
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  SvgPicture.asset(
                    svgAssets.arrowLeft,
                    height: Sizes.s24,
                    width: Sizes.s24,
                    colorFilter: ColorFilter.mode(
                      appColor(context).black,
                      BlendMode.srcIn,
                    ),
                  ).inkWell(
                    onTap: () {
                      setState(() {
                        isLongPress = false;
                        _selectedMessage = null;
                        _selectedMessageIds.clear();
                      });
                    },
                  ),
                  HSpace(Sizes.s15),
                  Text(
                    '$selectionCount Selected',
                    style: appCss.dmSansSemiBold14.textColor(
                      appColor(context).black,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (isSingleSelection && !isCallMessage)
                    GlassButton(
                      height: Sizes.s36,
                      width: Sizes.s36,
                      icon: svgAssets.forwordIcon,
                      onTap: _handleForward,
                    ),
                  if (!isSingleSelection && selectionCount > 0)
                    GlassButton(
                      height: Sizes.s36,
                      width: Sizes.s36,
                      icon: svgAssets.forwordIcon,
                      onTap: () {
                        AppToast.showMessage('Multi-forward coming soon');
                      },
                    ),
                  SizedBox(width: 10),
                  if (isSingleSelection) ...[
                    SizedBox(width: 10),
                    GlassButton(
                      height: Sizes.s36,
                      width: Sizes.s36,
                      icon: svgAssets.replayIcon,
                      onTap: _handleReply,
                    ),
                  ],
                  if (selectionCount > 0) ...[
                    SizedBox(width: 10),
                    GlassButton(
                      height: Sizes.s36,
                      width: Sizes.s36,
                      icon: svgAssets.moreIcon,
                      onTap: () {
                        showMenu(
                          context: context,
                          position: RelativeRect.fromLTRB(
                            MediaQuery.of(context).size.width - Sizes.s80,
                            90,
                            Sizes.s20,
                            0.0,
                          ),
                          color: appColor(context).white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          items: [
                            if (isSingleSelection && !isCallMessage) ...[
                              PopupMenuItem(
                                value: 'pin',
                                child: Row(
                                  children: [
                                    SvgPicture.asset(
                                      svgAssets.pinIcon,
                                      color: appColor(context).black,
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      (selectedMsg?.isPinned ?? false)
                                          ? "Unpin"
                                          : "Pin",
                                      style: appCss.dmSansMedium12.textColor(
                                        appColor(context).black,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isTextMessage)
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Row(
                                    children: [
                                      SvgPicture.asset(
                                        svgAssets.editIcon,
                                        color: appColor(context).black,
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        "Edit message",
                                        style: appCss.dmSansMedium12.textColor(
                                          appColor(context).black,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              PopupMenuItem(
                                value: 'favorites',
                                child: Row(
                                  children: [
                                    SvgPicture.asset(
                                      (selectedMsg?.isFavorite ?? false)
                                          ? svgAssets.favoritesOutlineIcon
                                          : svgAssets.favoritesOutlineIcon,
                                      color: appColor(context).black,
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      (selectedMsg?.isFavorite ?? false)
                                          ? "Remove from favorites"
                                          : "Add to favorites",
                                      style: appCss.dmSansMedium12.textColor(
                                        appColor(context).black,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (widget.channelId != null)
                                PopupMenuItem(
                                  value: 'readBy',
                                  child: Row(
                                    children: [
                                      SvgPicture.asset(
                                        svgAssets.email,
                                        color: appColor(context).black,
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        "Read By",
                                        style: appCss.dmSansMedium12.textColor(
                                          appColor(context).black,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              if (widget.channelId != null)
                                PopupMenuItem(
                                  value: 'deliveredTo',
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.done_all,
                                        color: appColor(context).black,
                                        size: 18,
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        "Delivered To",
                                        style: appCss.dmSansMedium12.textColor(
                                          appColor(context).black,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                            if (isSingleSelection && isTextMessage)
                              PopupMenuItem(
                                value: 'copy',
                                child: Row(
                                  children: [
                                    SvgPicture.asset(
                                      svgAssets.copyIcon,
                                      color: appColor(context).black,
                                      height: 16,
                                      width: 16,
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      "Copy",
                                      style: appCss.dmSansMedium12.textColor(
                                        appColor(context).black,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (selectionCount > 0)
                              PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  children: [
                                    SvgPicture.asset(
                                      svgAssets.deleteIcon,
                                      color: Colors.red,
                                      height: 16,
                                      width: 16,
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      "Delete",
                                      style: appCss.dmSansMedium12.textColor(
                                        Colors.red,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ).then((value) {
                          if (value == 'pin') {
                            _toggleMessagePin();
                          } else if (value == 'favorites') {
                            _toggleMessageFavorite();
                          } else if (value == 'edit') {
                            _toggleMessageUpdate();
                          } else if (value == 'readBy') {
                            _toggleMessageReadBy();
                          } else if (value == 'deliveredTo') {
                            _toggleMessageDeliveredTo();
                          } else if (value == 'copy') {
                            _copyMessage();
                          } else if (value == 'delete') {
                            if (selectionCount > 1 &&
                                chatBloc.currentSubscription?['data']['subscription']["plan"]["allows_multiple_delete"] ==
                                    false) {
                              _showUpgradeMultipaleMessageDialog(context);
                            } else {
                              _handleMultiDelete();
                            }
                          }
                        });
                      },
                    ),
                  ],
                ],
              ),
            ],
          ).paddingDirectional(
            top: Sizes.s40,
            bottom: Sizes.s20,
            horizontal: Sizes.s20,
          ),
    );
  }

  Future<void> _handleMultiDelete() async {
    if (_selectedMessageIds.isEmpty) return;

    try {
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Delete Messages'),
          content: Text(
            'Are you sure you want to delete ${_selectedMessageIds.length} messages?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );

      if (shouldDelete != true) return;

      log(
        '🗑️ [CHATSCREEN] Starting multi-message deletion process for: $_selectedMessageIds',
      );

      context.read<ChatBloc>().add(
        DeleteMultipleMessages(messageIds: _selectedMessageIds.toList()),
      );

      setState(() {
        isLongPress = false;
        _selectedMessageIds.clear();
        _selectedMessage = null;
      });

      AppToast.showMessage('Messages deleted');
    } catch (e) {
      log('❌ [CHATSCREEN] Error in multi-delete: $e');
      AppToast.showError('Failed to delete messages');
    }
  }

  Future<void> _showUpgradeMultipaleMessageDialog(BuildContext context) async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                color: Colors.red,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Feature Not Available',
              style: appCss.dmSansSemiBold18.textColor(
                appColor(context).darkText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Bulk message delete is not available in your current plan. Please upgrade to enable this feature.',
              style: appCss.dmSansRegular14.textColor(appColor(context).gray),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(
                    0xFFFFB800,
                  ), // Matching the yellow from image
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Got it',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _copyMessage() async {
    if (_selectedMessage == null) return;
    log(
      '🔄 Opening forward screen for message: ${_selectedMessage!.plainTextContent}',
    );
    Clipboard.setData(ClipboardData(text: _selectedMessage!.plainTextContent));
    setState(() {
      _selectedMessage = null;
      isLongPress = false;
    });
  }

  Future<void> _handleForward() async {
    if (_selectedMessage == null) return;

    try {
      setState(() {
        isLongPress = false;
      });

      log(
        '🔄 Opening forward screen for message: ${_selectedMessage!.plainTextContent}',
      );

      // Navigate to forward screen
      final result = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (context) =>
              ForwardMessageScreen(messageToForward: _selectedMessage!),
        ),
      );

      // Reset selection
      setState(() {
        _selectedMessage = null;
      });

      // Show success message if forwarded
      if (result == true) {
        log('✅ Message forwarded successfully');

        // Optional: Refresh messages to show any updates
        context.read<ChatBloc>().add(RefreshMessages());
      }
    } catch (e) {
      log('❌ Error handling forward: $e');

      // Reset state
      setState(() {
        _selectedMessage = null;
        isLongPress = false;
      });
      AppToast.showError("Failed to open forward screen");
    }
  }

  ChatMessageModel? _replyToMessage;
  bool _isReplying = false;

  void _handleReply() {
    final selectedMessage = _selectedMessage;
    if (selectedMessage == null) return;

    setState(() {
      _replyToMessage = selectedMessage;
      _isReplying = true;
      isLongPress = false;
      _selectedMessage = null;
    });
  }

  void _cancelReply() {
    setState(() {
      _replyToMessage = null;
      _isReplying = false;
    });
    log("🔄 Reply cancelled");
  }

  Color _getProfileColor(dynamic color) {
    try {
      if (color == null) return appColor(context).primary;
      if (color is Color) return color;

      final colorCode = color.toString();
      if (colorCode.isEmpty) return appColor(context).primary;

      return Color(int.parse(colorCode.replaceFirst('#', '0xff')));
    } catch (_) {
      return appColor(context).primary;
    }
  }
}
