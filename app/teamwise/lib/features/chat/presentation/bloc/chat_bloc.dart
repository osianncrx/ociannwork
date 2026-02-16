import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:teamwise/config.dart' hide ChatError, ChatInitial, ChatLoading;
import 'package:teamwise/core/network/api_manger.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_api.dart';
import '../../../auth/data/auth_services.dart';
import '../../../../core/services/encryption_service.dart';
import '../../data/datasources/chat_Api.dart';
import '../../data/models/chat_message_model.dart';
import '../../socket_service.dart';
import 'chat_state.dart';

part 'chat_event.dart';

enum ChatType { dm, channel }

class ChatBloc extends Bloc<ChatEvent, ChatState> {
  final SocketService socketService;
  final ChatApi messageService;
  final String recipientId;
  final String? channelId;
  final AuthService _authService = AuthService(); // 🔹 ADD THIS
  final EncryptionService _encryptionService = EncryptionService();
  String? _myDerivedAESKey;
  final Map<int, String> _senderAESKeys =
      {}; // Cache for SenderId -> Derived AES Key

  String? authToken;
  dynamic teamId;
  String? currentUserId;
  String? currentUserName;
  String? chatType;
  Map<String, dynamic>? currentSubscription;

  bool _isInitialized = false;

  final List<ChatMessageModel> _messages = [];
  final Map<int, MessageUser> _recipients = {};
  List<dynamic> _conversations = [];

  Function()? _unsubscribeReceiveMessage;
  Function()? _unsubscribeMessageStatus;
  Function()? _unsubscribeMessageDeleted;
  Function()? _unsubscribeMessageUpdated;
  Function()? _unsubscribeMemberAdded;
  Function()? _unsubscribeMemberRemoved;
  Function()? _unsubscribeMemberRoleUpdated;
  Function()? _unsubscribeMemberLeft;
  Function()? _unsubscribeMessageReaction;

  ChatBloc({
    required this.socketService,
    required this.messageService,
    required this.recipientId,
    this.channelId,
    this.chatType, // default
  }) : super(ChatInitial()) {
    // Debug constructor parameters
    log('🏗️ ChatBloc created with:');
    log('   - Recipient ID: $recipientId');
    log('   - Channel ID: $channelId');
    log('   - Chat type: ${channelId != null ? 'CHANNEL' : 'DM'}');
    _initializeAuthFromService();

    on<InitializeChat>(_onInitialize);
    on<FetchCurrentSubscription>(_onFetchCurrentSubscription);
    on<LoadMessages>(_onLoadMessages);
    on<SendMessage>(_onSendMessage);
    on<EditMessage>(_onupdateMessage);
    on<RefreshMessages>(_onRefreshMessages);
    on<LoadConversations>(_onLoadConversations);
    on<DeleteMessage>(_onDeleteMessage);
    on<DeleteMultipleMessages>(_onDeleteMultipleMessages);
    on<SocketMessageReceived>(_onSocketMessageReceived);
    on<SocketMessageStatusUpdated>(_onSocketMessageStatusUpdated);
    on<SocketMessageDeleted>(_onSocketMessageDeleted);
    on<SocketMessageUpdated>(_onSocketMessageUpdated);
    on<SocketMessageReactionUpdated>(_onSocketMessageReactionUpdated);
    on<MessagePinUpdated>(_onMessagePinUpdated);
    on<MessageFavoriteUpdated>(_onMessageFavoriteUpdated);
    on<MessageReactionUpdated>(_onMessageReactionUpdated);
    on<AddReactionLocally>(_onAddReactionLocally);
    on<MarkMessagesAsReadLocally>((event, emit) {
      // if (state is MessagesLoaded) {
      //   final updatedMessages = state.messages.map((message) {
      //     if (event.messageIds.contains(message.id.toString())) {
      //       // Update the message status to 'read'
      //       final updatedStatuses = [...message.statuses];
      //
      //       // Check if current user already has a status
      //       final currentUserStatusIndex = updatedStatuses.indexWhere(
      //             (s) => s.userId.toString() == currentUserId,
      //       );
      //
      //       if (currentUserStatusIndex >= 0) {
      //         // Update existing status
      //         updatedStatuses[currentUserStatusIndex] = MessageStatus(
      //           userId: updatedStatuses[currentUserStatusIndex].userId,
      //           status: 'read',
      //           updatedAt: '',
      //         );
      //       } else {
      //         // Add new status
      //         updatedStatuses.add(MessageStatus(
      //           userId: int.parse(currentUserId ?? '0'),
      //           status: 'read',
      //           updatedAt: '',
      //         ));
      //       }
      //
      //       return message.copyWith(statuses: updatedStatuses);
      //     }
      //     return message;
      //   }).toList();
      //
      //   emit(MessagesLoaded( messages: updatedMessages));
      // }
    });

    on<RemoveReactionLocally>(_onRemoveReactionLocally);
    // Setup socket listeners once during bloc creation
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    log('Setting up socket listeners in ChatBloc...');

    // Listen for add reaction events
    socketService.onSocketEvent(SocketEvents.addReaction, (data) {
      log('📨 Socket add reaction event received: $data');

      final messageId =
          data['message_id']?.toString() ?? data['messageId']?.toString();
      final emoji = data['emoji']?.toString();
      final userId = data['userId']?.toString() ?? data['user_id']?.toString();

      if (messageId != null && emoji != null && userId != null) {
        log('✅ Processing add reaction from user: $userId');
        add(
          AddReactionLocally(
            messageId: messageId,
            emoji: emoji,
            userId: userId,
          ),
        );
      }
    });

    // Listen for remove reaction events
    socketService.onSocketEvent(SocketEvents.removeReaction, (data) {
      log('📨 Socket remove reaction event received: $data');
      log('📨 Full data: ${jsonEncode(data)}'); // ✅ Debug log

      final messageId =
          data['message_id']?.toString() ?? data['messageId']?.toString();
      final emoji = data['emoji']?.toString();
      final userId = data['userId']?.toString() ?? data['user_id']?.toString();

      log('🔍 Parsed - MessageID: $messageId, Emoji: $emoji, UserID: $userId');

      if (messageId != null && emoji != null && userId != null) {
        // ✅ Skip if it's our own action (already handled locally)
        if (userId != currentUserId) {
          log('✅ Processing remove reaction from OTHER user: $userId');
          add(
            RemoveReactionLocally(
              messageId: messageId,
              emoji: emoji,
              userId: userId,
            ),
          );
        } else {
          log('⏭️ Skipping own remove reaction (already handled locally)');
        }
      } else {
        log(
          '❌ Missing data - MessageID: $messageId, Emoji: $emoji, UserID: $userId',
        );
      }
    });

    // Listen for message pin events
    socketService.onSocketEvent(SocketEvents.messagePin, (data) {
      log('📌 [SOCKET] Message pin event received: $data');

      // Handle both ChatMessageModel and Map<String, dynamic> cases
      String? messageId;
      bool isPinned;
      List<MessagePin>? pinData;
      log("data['pins']::${data['pins']}");
      /* if (data is ChatMessageModel) {
          messageId = data.id.toString();
          isPinned = data.isPinned;
          pinData = data.pins;
        } else*/
      messageId =
          data['message_id']?.toString() ?? data['messageId']?.toString();
      isPinned = data['isPinned'] as bool? ?? true;
      pinData = data['pins'] != null
          ? (data['pins'] as List).map((p) => MessagePin.fromJson(p)).toList()
          : null;

      log('📌 Processed - Message ID: $messageId, Is Pinned: $isPinned');

      if (messageId != null) {
        // Update local state immediately
        for (var i = 0; i < _messages.length; i++) {
          if (_messages[i].id.toString() == messageId) {
            _messages[i].isPinned = isPinned;

            if (pinData != null && pinData.isNotEmpty) {
              _messages[i].pins = pinData;
            }

            log('✅ Updated local message $messageId pin status to $isPinned');
            break;
          }
        }

        // Emit UI update
        add(
          SocketMessageStatusUpdated({
            'message_id': messageId,
            'messageId': messageId,
            'isPinned': isPinned,
            'pins': pinData,
            'type': 'pin',
          }),
        );

        // Refresh messages from API for latest data
        add(RefreshMessages());
      } else {
        log('❌ No message ID found in pin event data');
      }
    });

    // Listen for message favorite events
    socketService.onSocketEvent(SocketEvents.messageFavorite, (data) {
      log('⭐ [SOCKET] Message favorite event received: $data');

      final messageId = data['message_id'];
      final isFavorite = data['isFavorite'];

      if (messageId != null) {
        // Update local state
        for (var i = 0; i < _messages.length; i++) {
          if (_messages[i].id.toString() == messageId) {
            _messages[i].isFavorite = isFavorite;
            log(
              '✅ Updated local message $messageId favorite status to $isFavorite',
            );
            break;
          }
        }

        // Emit UI update
        add(
          SocketMessageStatusUpdated({
            'messageId': messageId,
            'isFavorite': isFavorite,
            'type': 'favorite',
          }),
        );

        // Refresh messages from API
        add(RefreshMessages());
      }
    });

    // Listen for new messages
    _unsubscribeReceiveMessage = socketService.onSocketEvent(
      SocketEvents.receiveMessage,
      (data) async {
        try {
          final message = Map<String, dynamic>.from(data);
          log("data::${data}");
          log(
            '📨 Socket message received: ${message} from ${message['sender_id']}',
          );

          final messageChannelId = message['channel_id']?.toString();
          final messageRecipientId = message['recipient_id']?.toString();
          final messageSenderId = message['sender_id']?.toString();
          final messageParentId = message['parent_id']?.toString();

          bool isRelevant = false;
          log("channelId::$channelId");
          if (channelId != null) {
            isRelevant =
                (messageChannelId == channelId) ||
                (messageChannelId == null && messageRecipientId == channelId);
          } else if (currentUserId != null) {
            isRelevant =
                (messageSenderId == currentUserId &&
                    messageRecipientId == recipientId) ||
                (messageSenderId == recipientId &&
                    messageRecipientId == currentUserId);
          }

          if (isRelevant) {
            log('✅ Message is relevant to current conversation');

            // 🔹 Decrypt message if needed
            if (message['is_encrypted'] == true) {
              final sId = int.tryParse(message['sender_id']?.toString() ?? '');
              if (sId != null) {
                final pubKey = await messageService.getPublicKey(sId.toString());
                if (pubKey != null) {
                  final aesKey = _encryptionService.deriveAESKey(pubKey);
                  message['content'] = _encryptionService.decryptMessage(message['content'], aesKey);
                  message['is_encrypted'] = false;
                  log('🔓 Decrypted socket message content from $sId');
                }
              }
            }

            DashboardApi(
              serviceLocator<ApiManager>(),
              serviceLocator<AuthBloc>(),
            ).fetchChats();
            try {
              final messageModel = ChatMessageModel.fromJson(
                Map<String, dynamic>.from(message),
              );
              add(SocketMessageReceived(messageModel));
            } catch (e) {
              log(
                "❌ Failed to decode socket message into ChatMessageModel: $e",
              );
              return;
            }
          } else {
            log('❌ Message not relevant to current conversation');
          }
        } catch (e, s) {
          log('❌ Error processing socket message: $e///$s');
        }
      },
    );

    // Listen for message status updates
    _unsubscribeMessageStatus = socketService.onSocketEvent(
      SocketEvents.messageStatusUpdated,
      (data) {
        log('📝 Message status updated: $data');
        add(SocketMessageStatusUpdated(data));
      },
    );

    _unsubscribeMessageDeleted = socketService.onSocketEvent(
      SocketEvents.messageDeleted,
      (data) {
        log('🗑️ [SOCKET->CHATBLOC] Message deleted event received: $data');

        final messageId =
            data['id']?.toString() ?? data['messageId']?.toString();
        final deletedBy =
            data['deletedBy']?.toString() ?? data['userId']?.toString();
        final messageChannelId = data['channel_id']?.toString();
        final messageRecipientId = data['recipient_id']?.toString();

        log('🗑️ [SOCKET->CHATBLOC] Processing deletion:');
        log('   - Message ID: $messageId');
        log('   - Deleted by: $deletedBy');

        if (messageId != null) {
          final messageExists = _messages.any(
            (msg) => msg.id.toString() == messageId,
          );

          if (messageExists) {
            log(
              '✅ [SOCKET->CHATBLOC] Message $messageId found in current conversation, processing deletion',
            );
            add(SocketMessageDeleted(data));

            Future.delayed(Duration(milliseconds: 500), () {
              add(RefreshMessages());
            });
          } else {
            if ((channelId != null && messageChannelId == channelId) ||
                (channelId == null &&
                    (messageRecipientId == recipientId ||
                        deletedBy == recipientId))) {
              log(
                '🔄 [SOCKET->CHATBLOC] Relevant chat detected, forcing refresh',
              );
              add(RefreshMessages());
            }
          }
        }
      },
    );

    // Listen for message updates
    _unsubscribeMessageUpdated = socketService.onSocketEvent(
      SocketEvents.messageUpdated,
      (data) {
        log('✏️ Message updated: $data');
        add(SocketMessageUpdated(data));
      },
    );

    // Listen for reaction updates
    _unsubscribeMessageReaction = socketService.onSocketEvent(
      SocketEvents.messageReactionUpdated,
      (data) {
        log('😊 Message reaction updated: $data');
        add(MessageReactionUpdated(data));
      },
    );

    // Listen for member management events to refresh messages (system messages)
    _unsubscribeMemberAdded = socketService.onSocketEvent(
      SocketEvents.memberAddedToChannel,
      (data) {
        log('👥 [SOCKET->CHATBLOC] Member added event received: $data');
        final cid = data['channelId']?.toString() ?? data['channel_id']?.toString();
        if (channelId != null && cid == channelId) {
          log('✅ Relevant channel member addition, refreshing messages');
          add(RefreshMessages());
        }
      },
    );

    _unsubscribeMemberRemoved = socketService.onSocketEvent(
      SocketEvents.memberRemovedFromChannel,
      (data) {
        log('👥 [SOCKET->CHATBLOC] Member removed event received: $data');
        final cid = data['channelId']?.toString() ?? data['channel_id']?.toString();
        if (channelId != null && cid == channelId) {
          log('✅ Relevant channel member removal, refreshing messages');
          add(RefreshMessages());
        }
      },
    );

    _unsubscribeMemberRoleUpdated = socketService.onSocketEvent(
      SocketEvents.memberRoleUpdated,
      (data) {
        log('👥 [SOCKET->CHATBLOC] Member role updated event received: $data');
        final cid = data['channelId']?.toString() ?? data['channel_id']?.toString();
        if (channelId != null && cid == channelId) {
          log('✅ Relevant channel role update, refreshing messages');
          add(RefreshMessages());
        }
      },
    );

    _unsubscribeMemberLeft = socketService.onSocketEvent(
      SocketEvents.memberLeftChannel,
      (data) {
        log('👥 [SOCKET->CHATBLOC] Member left event received: $data');
        final cid = data['channelId']?.toString() ?? data['channel_id']?.toString();
        if (channelId != null && cid == channelId) {
          log('✅ Relevant channel member departure, refreshing messages');
          add(RefreshMessages());
        }
      },
    );

    log('Socket listeners setup completed');
  }

  void _onMessagePinUpdated(MessagePinUpdated event, Emitter<ChatState> emit) {
    bool messageFound = false;
    for (var i = 0; i < _messages.length; i++) {
      if (_messages[i].id.toString() == event.messageId) {
        _messages[i].isPinned = event.isPinned;
        messageFound = true;
        log(
          '✅ Updated message ${event.messageId} pin status to ${event.isPinned}',
        );
        break;
      }
    }

    if (!messageFound) {
      log('⚠️ Message ${event.messageId} not found for pin update');
    }

    emit(MessagesLoaded(messages: List.from(_messages)));
  }

  void _onMessageFavoriteUpdated(
    MessageFavoriteUpdated event,
    Emitter<ChatState> emit,
  ) {
    bool messageFound = false;
    for (var i = 0; i < _messages.length; i++) {
      if (_messages[i].id.toString() == event.messageId) {
        _messages[i].isFavorite = event.isFavorite;
        messageFound = true;
        log(
          '✅ Updated message ${event.messageId} favorite status to ${event.isFavorite}',
        );
        break;
      }
    }

    if (!messageFound) {
      log('⚠️ Message ${event.messageId} not found for favorite update');
    }

    emit(MessagesLoaded(messages: List.from(_messages)));
  }

  Future<void> _onInitialize(
    InitializeChat event,
    Emitter<ChatState> emit,
  ) async {
    if (_isInitialized) {
      emit(MessagesLoaded(messages: List.from(_messages)));
      return;
    }

    emit(ChatLoading());
    try {
      // 🔹 Initialize E2E Encryption
      await _initializeEncryption();

      if (!socketService.isConnected) {
        await socketService.initializeSocket(
          authToken!,
          teamId.toString(),
          currentUserId!,
          currentUserName!,
        );
      }

      await _joinUserRoom();

      _isInitialized = true;
      emit(MessagesLoaded(messages: List.from(_messages)));

      add(LoadMessages());
    } catch (e) {
      log('Chat initialization error: $e');
      emit(ChatError(error: 'Initialization failed: $e'));
    }
  }

  Future<void> _joinUserRoom() async {
    if (socketService.isConnected && currentUserId != null) {
      try {
        log('🏠 Joining rooms...');

        socketService.emit('join-room', currentUserId);
        log('✅ Joined user room: $currentUserId');

        if (channelId != null) {
          socketService.joinChannel(channelId!);
          log('✅ Joined channel room: $channelId');

          socketService.emit(SocketEvents.channelUpdates, {
            'channelId': channelId,
            'userId': currentUserId,
            'action': 'join',
          });
          log('✅ Subscribed to channel updates: $channelId');

          await Future.delayed(Duration(milliseconds: 100));
          socketService.setOnline();
          log('✅ Set user online after joining channel');
        } else {
          log('ℹ️ This is a DM conversation, no channel room to join');
          socketService.setOnline();
        }

        log('✅ All rooms joined successfully');
      } catch (e) {
        log('❌ Error joining rooms: $e');
        rethrow;
      }
    } else {
      log(
        '❌ Cannot join rooms - socket not connected or currentUserId is null',
      );
      throw Exception(
        'Cannot join rooms: Socket not connected or user ID missing',
      );
    }
  }

  void initializeAuth(
    String token,
    int teamId,
    String userId,
    String userName,
  ) {
    authToken = token;
    this.teamId = teamId;
    currentUserId = userId;
    currentUserName = userName;

    if (!_isInitialized) {
      add(InitializeChat());
    }
  }

  Future<void> _initializeEncryption() async {
    try {
      // 1. My keys
      String? myPub = await _encryptionService.getPublicKey();
      if (myPub == null) {
        log('🔑 Generating new RSA key pair...');
        final keys = await _encryptionService.generateKeyPair();
        myPub = keys['publicKey'];
        await messageService.savePublicKey(myPub!);
      }

      _myDerivedAESKey = _encryptionService.deriveAESKey(myPub);
      log('🔐 Initialized my derived AES key');

      // 2. Pre-fetch recipient's key for DM
      if (channelId == null && recipientId != currentUserId) {
        final rIdInt = int.tryParse(recipientId);
        if (rIdInt != null) {
          final rPubKey = await messageService.getPublicKey(recipientId);
          if (rPubKey != null) {
            _senderAESKeys[rIdInt] = _encryptionService.deriveAESKey(rPubKey);
            log('🔐 Cached recipient key for decryption: $recipientId');
          }
        }
      }
    } catch (e) {
      log('❌ Encryption initialization error: $e');
    }
  }

  int _currentPage = 1;
  bool _hasMoreMessages = true;
  bool _isLoadingMore = false;

  Future<void> _onLoadMessages(
    LoadMessages event,
    Emitter<ChatState> emit,
  ) async {
    emit(ChatLoading());
    try {
      // 🔹 Validate auth before loading
      if (!_authService.validateAuthState()) {
        emit(ChatError(error: 'User not authenticated'));
        return;
      }

      log(
        '📡 Loading messages - RecipientID: $recipientId, ChannelID: $channelId',
      );
      log('🔐 Using TeamID: ${_authService.teamId}');

      List<ChatMessageModel> response = await messageService.loadMessages(
        recipientId: recipientId.toString(),
        channelId: channelId,
      );

      // 🔹 Decrypt messages if needed
      await _decryptMessages(response);

      log("✅ Loaded ${response.length} messages");

      _messages
        ..clear()
        ..addAll(response);

      for (var msg in _messages) {
        if (msg.parentId != null && msg.parentId != 0) {
          final parent = _messages.firstWhereOrNull(
            (m) => m.id == msg.parentId,
          );

          if (parent != null) {
            msg.parentMessage = parent;
          } else {
            log(
              "⚠ Parent message not found for msgID ${msg.id}, parentId: ${msg.parentId}",
            );
          }
        }
      }

      _cacheRecipients();
      emit(MessagesLoaded(messages: List.from(_messages)));
    } catch (e, s) {
      log('❌ Error loading messages: $e\n$s');
      emit(ChatError(error: e.toString()));
    }
  }

  void _initializeAuthFromService() {
    if (_authService.isAuthenticated) {
      authToken = _authService.token;
      teamId = _authService.teamId;
      currentUserId = _authService.userId;
      currentUserName = _authService.userName;
      log(
        '✅ ChatBloc initialized from AuthService - UserID: $currentUserId, TeamID: $teamId',
      );
    } else {
      log('⚠️ ChatBloc: User not authenticated in AuthService');
    }
  }

  Timer? _debounceTimer;
  final Set<int> _sendingMessageIds = {};
  Future<void> _onSendMessage(
    SendMessage event,
    Emitter<ChatState> emit,
  ) async {
    // Validation
    final isTextMessage = event.messageType == 'text';
    final isMediaMessage = event.messageType != 'text';

    if (isTextMessage &&
        (event.message == null || event.message!.trim().isEmpty)) {
      return;
    }

    if (isMediaMessage && event.mediaFile == null) {
      return;
    }

    final tempId = -DateTime.now().millisecondsSinceEpoch;
    log("🆔 Generated tempId: $tempId");

    try {
      if (!_authService.validateAuthState()) {
        emit(ChatError(error: 'User not authenticated'));
        return;
      }

      currentUserId = _authService.userId;
      currentUserName = _authService.userName;
      teamId = _authService.teamId;

      // ✅ CRITICAL: Track temp ID immediately for self-chat
      final isSelfChat = recipientId == currentUserId;
      if (isSelfChat) {
        _sendingMessageIds.add(tempId.abs()); // Use positive version
        log("🔐 Tracking temp message: ${tempId.abs()} for self-chat");
      }

      log('📤 Sending ${event.mentions} message');

      // Create temporary message
      final tempMessageData = <String, dynamic>{
        'id': tempId,
        'sender_id': int.parse(currentUserId!),
        'team_id': teamId ?? 0,
        'recipient_id': int.tryParse(recipientId) ?? 0,
        'content': isTextMessage
            ? event.message
            : 'Uploading ${event.messageType}...',
        'message_type': event.messageType,
        'parent_id': event.parentId,
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
        'mentions': event.mentions,
        'sender': {
          'id': int.tryParse(currentUserId!) ?? 0,
          'name': currentUserName ?? 'You',
          'email': _authService.userEmail ?? '',
        },
        'recipient': {
          'id': int.tryParse(recipientId) ?? 0,
          'name': 'Recipient',
          'email': '',
        },
        'statuses': <Map<String, dynamic>>[],
        'reactions': <Map<String, dynamic>>[],
        'favorites': <Map<String, dynamic>>[],
        'pins': <Map<String, dynamic>>[],
        'isPinned': false,
        'isFavorite': false,
      };

      if (event.parentId != null && event.parentId != "0") {
        final parent = _messages.firstWhere(
          (m) => m.id.toString() == event.parentId,
        );

        tempMessageData['parent_id'] = int.parse(event.parentId!);

        if (parent != null) {
          tempMessageData['parent_message'] = parent.toJson(); // ✅ REAL DATA
        } else {
          tempMessageData['parent_message'] = null; // ✅ Fallback
        }
      }

      if (chatType == 'channel' && channelId != null) {
        tempMessageData['channel_id'] = int.parse(channelId!);
        tempMessageData['recipient_id'] = null;
      } else if (chatType == 'dm' && recipientId != null) {
        tempMessageData['recipient_id'] = int.parse(recipientId!);
        tempMessageData['channel_id'] = null;
      }

      final tempMessage = ChatMessageModel.fromJson(tempMessageData);
      _messages.add(tempMessage);

      log("✅ Added temp message. Total messages: ${_messages.length}");
      emit(MessageSending(messages: List.from(_messages)));

      // 🔹 Outgoing encryption disabled as per user request
      String finalContent = event.message ?? '';
      bool isEncrypted = false;
      /*
      if (isTextMessage && _myDerivedAESKey != null) {
        finalContent = _encryptionService.encryptMessage(
          finalContent,
          _myDerivedAESKey!,
        );
        isEncrypted = true;
      }
      */

      // API call
      final response = await messageService.sendMessage(
        recipientId: channelId == null
            ? (event.recipientId ?? recipientId)
            : '',
        channelId: channelId != null ? (event.channelId ?? channelId) : null,
        content: finalContent,
        messageType: event.messageType.toString(),
        mediaFile: event.mediaFile,
        parentId: event.parentId != null ? int.parse(event.parentId!) : null,
        mentions: event.mentions,
        additionalParams: {'is_encrypted': isEncrypted},
      );

      log("🟢 API Response received");

      // Remove temp message
      _messages.removeWhere((msg) => msg.id == tempId);
      log("✅ Temp message removed");

      // Process response
      if (response != null &&
          response['success'] == true &&
          response['messages'] != null) {
        final messagesList = response['messages'] as List;

        if (messagesList.isNotEmpty) {
          final messageData = messagesList.first;
          final apiMessageData = Map<String, dynamic>.from(messageData);

          if (apiMessageData['sender'] == null) {
            apiMessageData['sender'] = {
              'id': int.tryParse(currentUserId!) ?? 0,
              'name': currentUserName ?? '',
              'email': _authService.userEmail ?? '',
            };
          }

          final apiMessage = ChatMessageModel.fromJson(apiMessageData);
          final apiMessageId = apiMessage.id;

          log("🆔 API message ID: $apiMessageId");

          // ✅ TRACK REAL MESSAGE ID
          _sendingMessageIds.add(apiMessageId);

          // ✅ Remove temp ID tracking if it exists
          if (isSelfChat) {
            _sendingMessageIds.remove(tempId.abs());
          }

          // ✅ AUTO-CLEANUP AFTER 3 SECONDS
          Future.delayed(Duration(seconds: 1), () {
            _sendingMessageIds.remove(apiMessageId);
            log("🧹 Cleaned up tracking for message ID: $apiMessageId");
          });

          // Check for duplicates
          final isDuplicate = _messages.any((msg) => msg.id == apiMessageId);

          if (!isDuplicate) {
            _messages.add(apiMessage);
            // ✅ Attach parent message for immediate UI update
            if (apiMessage.parentId != null && apiMessage.parentId != 0) {
              apiMessage.parentMessage = _messages.firstWhere(
                (m) => m.id == apiMessage.parentId,
              );
            }

            log("✅ Added API message. Total: ${_messages.length}");
          } else {
            log("⚠️ Message already exists, skipping");
          }
        }
      }

      // Refresh dashboard
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(milliseconds: 500), () {
        DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).fetchChats();
      });

      emit(MessageSent(messages: List.from(_messages)));
    } catch (e, s) {
      log('❌ Error: $e\n$s');
      _messages.removeWhere((msg) => msg.id == tempId);
      emit(ChatError(error: 'Failed to send ${event.messageType}: $e'));
    }
  }
  // Future<void> _onSendMessage(
  //   SendMessage event,
  //   Emitter<ChatState> emit,
  // ) async {
  //   // Validation
  //   final isTextMessage = event.messageType == 'text';
  //   final isMediaMessage = event.messageType != 'text';
  //
  //   if (isTextMessage &&
  //       (event.message == null || event.message!.trim().isEmpty)) {
  //     return;
  //   }
  //
  //   if (isMediaMessage && event.mediaFile == null) {
  //     return;
  //   }
  //
  //   final tempId = -DateTime.now().millisecondsSinceEpoch;
  //
  //   try {
  //     // 🔹 CHANGED: Use AuthService instead of SharedPreferences
  //     if (!_authService.validateAuthState()) {
  //       emit(ChatError(error: 'User not authenticated'));
  //       return;
  //     }
  //
  //     currentUserId = _authService.userId;
  //     currentUserName = _authService.userName;
  //     teamId = _authService.teamId;
  //
  //     log('📤 Sending ${event.mentions} message');
  //     log('🔐 Auth - UserID: $currentUserId, TeamID: $teamId');
  //     log(
  //       '📍 Target - ${channelId != null ? 'Channel: $channelId' : 'DM: $recipientId'}//${chatType}',
  //     );
  //
  //     // Create temporary message
  //     final tempMessageData = <String, dynamic>{
  //       'id': tempId,
  //       'sender_id': int.parse(currentUserId!),
  //       'team_id': teamId ?? 0,
  //       'recipient_id': int.tryParse(recipientId) ?? 0,
  //       'content': isTextMessage
  //           ? event.message
  //           : 'Uploading ${event.messageType}...',
  //       'message_type': event.messageType,
  //       'parent_id': event.parentId,
  //       'created_at': DateTime.now().toIso8601String(),
  //       'updated_at': DateTime.now().toIso8601String(),
  //       'mentions': event.mentions,
  //
  //       'sender': {
  //         'id': int.tryParse(currentUserId!) ?? 0,
  //         'name': currentUserName ?? 'You',
  //         'email': _authService.userEmail ?? '',
  //       },
  //       'recipient': {
  //         'id': int.tryParse(recipientId) ?? 0,
  //         'name': 'Recipient',
  //         'email': '',
  //       },
  //       'statuses': <Map<String, dynamic>>[],
  //       'reactions': <Map<String, dynamic>>[],
  //       'favorites': <Map<String, dynamic>>[],
  //       'pins': <Map<String, dynamic>>[],
  //       'isPinned': false,
  //       'isFavorite': false,
  //     };
  //
  //     if (event.parentId != null) {
  //       tempMessageData['parent_id'] = int.parse(event.parentId!);
  //       tempMessageData['parent_message'] = {
  //         'id': int.parse(event.parentId!),
  //         'content': 'Replying to message...',
  //         'sender': {'id': 0, 'name': 'Original sender'},
  //       };
  //     }
  //
  //     // 🔹 Determine message target
  //     if (chatType == 'channel' && channelId != null) {
  //       tempMessageData['channel_id'] = int.parse(channelId!);
  //       tempMessageData['recipient_id'] = null;
  //       log("📢 Sending to CHANNEL: $channelId");
  //     } else if (chatType == 'dm' && recipientId != null) {
  //       tempMessageData['recipient_id'] = int.parse(recipientId!);
  //       tempMessageData['channel_id'] = null;
  //       log("💬 Sending to DM recipient: $recipientId");
  //     }
  //
  //     log("chatType::$chatType///$channelId");
  //     // API call:
  //     final response = await messageService.sendMessage(
  //       recipientId: channelId == null
  //           ? (event.recipientId ?? recipientId)
  //           : '', // 👈 null, not ''
  //       channelId: channelId != null ? (event.channelId ?? channelId) : null,
  //       content: event.message,
  //       messageType: event.messageType.toString(),
  //       mediaFile: event.mediaFile,
  //       parentId: event.parentId != null ? int.parse(event.parentId!) : null,
  //       mentions: event.mentions, // ✅ Add this line
  //     );
  //
  //     final tempMessage = ChatMessageModel.fromJson(tempMessageData);
  //     _messages.add(tempMessage);
  //     emit(MessageSending(messages: List.from(_messages)));
  //
  //     log("🟢 Starting ${event.channelId?.toUpperCase()} send...");
  //
  //     // // Single API call - handles both text and media
  //     // final response = await messageService.sendMessage(
  //     //   recipientId: recipientId,
  //     //   channelId: channelId, // 🔹 This determines channel vs DM
  //     //   content: event.message,
  //     //   messageType: event.messageType.toString(),
  //     //   mediaFile: event.mediaFile,
  //     //   parentId: event.parentId != null ? int.parse(event.parentId!) : null,
  //     // );
  //
  //     log("🟢 API response: $response");
  //
  //     // Remove temp message
  //     _messages.removeWhere((msg) => msg.id == tempId);
  //
  //     // Process response
  //     if (response != null &&
  //         response['success'] == true &&
  //         response['messages'] != null) {
  //       final messagesList = response['messages'] as List;
  //       if (messagesList.isNotEmpty) {
  //         final messageData = messagesList.first;
  //         final apiMessageData = Map<String, dynamic>.from(messageData);
  //
  //         if (apiMessageData['sender'] == null) {
  //           apiMessageData['sender'] = {
  //             'id': int.tryParse(currentUserId!) ?? 0,
  //             'name': currentUserName ?? 'You',
  //             'email': _authService.userEmail ?? '',
  //           };
  //         }
  //
  //         final apiMessage = ChatMessageModel.fromJson(apiMessageData);
  //         _messages.add(apiMessage);
  //         log(
  //           "🟢 ${event.messageType?.toUpperCase()} message added to ${channelId != null ? 'CHANNEL' : 'DM'}",
  //         );
  //       }
  //     }
  //
  //     // Refresh dashboard
  //     _debounceTimer?.cancel();
  //     _debounceTimer = Timer(const Duration(milliseconds: 500), () {
  //       DashboardApi(
  //         serviceLocator<ApiManager>(),
  //         serviceLocator<AuthBloc>(),
  //       ).fetchChats();
  //     });
  //
  //     emit(MessageSent(messages: List.from(_messages)));
  //   } catch (e, s) {
  //     log('❌ Error: $e\n$s');
  //     _messages.removeWhere((msg) => msg.id == tempId);
  //     emit(ChatError(error: 'Failed to send ${event.messageType}: $e'));
  //   }
  // }

  Future<void> _onupdateMessage(
    EditMessage event,
    Emitter<ChatState> emit,
  ) async {
    // Validation

    final tempId = -DateTime.now().millisecondsSinceEpoch;

    try {
      // 🔹 CHANGED: Use AuthService instead of SharedPreferences
      if (!_authService.validateAuthState()) {
        emit(ChatError(error: 'User not authenticated'));
        return;
      }

      currentUserId = _authService.userId;
      currentUserName = _authService.userName;
      teamId = _authService.teamId;

      // log('📤 Sending ${event.mentions} message');
      log('🔐 Auth - UserID: $currentUserId, TeamID: $teamId');
      log(
        '📍 Target - ${channelId != null ? 'Channel: $channelId' : 'DM: $recipientId'}//${chatType}',
      );

      // Create temporary message
      final tempMessageData = <String, dynamic>{
        "message_id": event.messageId,
        "content": event.content,
      };

      // 🔹 Determine message target
      if (chatType == 'channel' && channelId != null) {
        tempMessageData['channel_id'] = int.parse(channelId!);
        tempMessageData['recipient_id'] = null;
        log("📢 Sending to CHANNEL: $channelId");
      } else if (chatType == 'dm' && recipientId != null) {
        tempMessageData['recipient_id'] = int.parse(recipientId!);
        tempMessageData['channel_id'] = null;
        log("💬 Sending to DM recipient: $recipientId");
      }

      log("chatType::$chatType///$channelId");
      // API call:
      final response = await messageService.updateMessage(
        messageId: event.messageId,

        content: event.content,
      );

      final tempMessage = ChatMessageModel.fromJson(tempMessageData);
      _messages.add(tempMessage);
      emit(MessageSending(messages: List.from(_messages)));

      // // Single API call - handles both text and media
      // final response = await messageService.sendMessage(
      //   recipientId: recipientId,
      //   channelId: channelId, // 🔹 This determines channel vs DM
      //   content: event.message,
      //   messageType: event.messageType.toString(),
      //   mediaFile: event.mediaFile,
      //   parentId: event.parentId != null ? int.parse(event.parentId!) : null,
      // );

      log("🟢 API response: $response");

      // Remove temp message
      _messages.removeWhere((msg) => msg.id == tempId);

      // Process response
      /* if (response != null &&
          response['success'] == true &&
          response['messages'] != null) {
        final messagesList = response['messages'] as List;
        if (messagesList.isNotEmpty) {
          final messageData = messagesList.first;
          final apiMessageData = Map<String, dynamic>.from(messageData);

          if (apiMessageData['sender'] == null) {
            apiMessageData['sender'] = {
              'id': int.tryParse(currentUserId!) ?? 0,
              'name': currentUserName ?? 'You',
              'email': _authService.userEmail ?? '',
            };
          }

          final apiMessage = ChatMessageModel.fromJson(apiMessageData);
          _messages.add(apiMessage);
          log(
            "🟢 ${event.messageType?.toUpperCase()} message added to ${channelId != null ? 'CHANNEL' : 'DM'}",
          );
        }
      } */

      // Refresh dashboard
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(milliseconds: 500), () {
        DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).fetchChats();
      });

      emit(MessageSent(messages: List.from(_messages)));
    } catch (e, s) {
      log('❌ Error: $e\n$s');
      _messages.removeWhere((msg) => msg.id == tempId);
      emit(ChatError(error: 'Failed to send : $e'));
    }
  }

  /*  Future<void> _onSendMessage(
    SendMessage event,
    Emitter<ChatState> emit,
  ) async {
    if (event.message.trim().isEmpty) return;

    final tempId = -DateTime.now().millisecondsSinceEpoch;

    try {
      // Create temporary message data
      final tempMessageData = <String, dynamic>{
        'id': tempId,
        'sender_id': int.parse(currentUserId!) ?? 0,
        'team_id': teamId ?? 0,
        'recipient_id': int.tryParse(recipientId) ?? 0,
        'content': event.message,
        'message_type': 'text',
        'parent_id': event.parentId,
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
        'mentions': <String>[],
        'sender': {
          'id': int.tryParse(currentUserId!) ?? 0,
          'name': currentUserName ?? 'You',
          'email': '',
        },
        'recipient': {
          'id': int.tryParse(recipientId) ?? 0,
          'name': 'Recipient',
          'email': '',
        },
        'statuses': <Map<String, dynamic>>[],
        'reactions': <Map<String, dynamic>>[],
        'favorites': <Map<String, dynamic>>[],
        'pins': <Map<String, dynamic>>[],
        'isPinned': false,
        'isFavorite': false,
      };

      // Add parent_id if replying
      if (event.parentId != null) {
        tempMessageData['parent_id'] = int.parse(event.parentId!);
        tempMessageData['parent_message'] = {
          'id': int.parse(event.parentId!),
          'content':
              'Replying to message...', // You might want to store actual content
          'sender': {'id': 0, 'name': 'Original sender'},
        };
      }

      // Add channel_id or ensure recipient_id based on chat type
        if (channelId != null) {
          tempMessageData['channel_id'] = int.tryParse(channelId!) ?? 0;
          log("🟡 Creating temp CHANNEL message for channel: $channelId");
        } else {
          log("🟡 Creating temp DM message for recipient: $recipientId");
        }

      final tempMessage = ChatMessageModel.fromJson(tempMessageData);

      _messages.add(tempMessage);
      emit(MessageSending(messages: List.from(_messages)));

      log("🟢 Starting API call...///${event.parentId}");
      final response = await messageService.sendMessage(
        recipientId: recipientId,
        channelId: channelId,
        content: event.message,
        parentId: event.parentId != null ? int.parse(event.parentId!) : null,
      );

      log("🟢 API response received: $response");

      // Remove temp message
      _messages.removeWhere((msg) => msg.id == tempId);

      // Process API response
      if (response != null &&
          response['success'] == true &&
          response['messages'] != null) {
        final messagesList = response['messages'] as List;
        if (messagesList.isNotEmpty) {
          final messageData = messagesList.first;
          final apiMessageData = Map<String, dynamic>.from(messageData);

          // Ensure sender info
          if (apiMessageData['sender'] == null) {
            apiMessageData['sender'] = {
              'id': int.tryParse(currentUserId!) ?? 0,
              'name': currentUserName ?? 'You',
              'email': '',
            };
          }

          final apiMessage = ChatMessageModel.fromJson(apiMessageData);
          _messages.add(apiMessage);
          log(
            "🟢 API message added. Message type: ${channelId != null ? 'CHANNEL' : 'DM'}",
          );
        }
      }

      // Refresh dashboard
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(milliseconds: 500), () {
        DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).fetchChats();
      });

      emit(MessageSent(messages: List.from(_messages)));
    } catch (e, s) {
      log('❌ Error in _onSendMessage: $e//$s');
      _messages.removeWhere((msg) => msg.id.toString() == tempId);
      emit(ChatError(error: 'Failed to send message: ${e.toString()}'));
    }
  }*/
  // ChatBloc - _onSocketMessageReceived() को update करो

  void _onSocketMessageReceived(
    SocketMessageReceived event,
    Emitter<ChatState> emit,
  ) {
    ChatMessageModel msg = event.message;

    log('📨 [BLOC] Processing socket message:');
    log('   - ID: ${msg.id}');
    log('   - Type: ${msg.messageType}');
    log('   - Sender: ${msg.senderId}');

    // ✅ FIX: Check for valid content based on message type
    bool hasValidContent = false;

    if (msg.messageType == 'image' ||
        msg.messageType == 'video' ||
        msg.messageType == 'file') {
      hasValidContent = msg.fileUrl != null && msg.fileUrl!.isNotEmpty;
    } else if (msg.messageType == 'text') {
      hasValidContent =
          msg.plainTextContent != null && msg.plainTextContent!.isNotEmpty;
    } else if (msg.messageType == 'audio' || msg.messageType == 'call') {
      hasValidContent = msg.fileUrl != null && msg.fileUrl!.isNotEmpty;
    } else {
      hasValidContent = true;
    }

    // Validate
    if (msg.id == 0 || !hasValidContent || msg.senderId == null) {
      log('❌ [BLOC] Invalid message structure');
      return;
    }

    final messageChannelId = msg.channelId?.toString();
    final messageRecipientId = msg.recipientId?.toString();
    final messageSenderId = msg.senderId?.toString();

    // Check relevance
    bool isRelevant = false;

    if (channelId != null) {
      isRelevant = messageChannelId == channelId;
      log('📢 [BLOC] Channel check: $isRelevant');
    } else {
      isRelevant =
          (messageSenderId == currentUserId &&
              messageRecipientId == recipientId) ||
          (messageSenderId == recipientId &&
              messageRecipientId == currentUserId);
      log('💬 [BLOC] DM check: $isRelevant');
    }

    if (!isRelevant) {
      log('❌ [BLOC] Message not relevant');
      return;
    }

    // Check for duplicate
    final messageId = msg.id.toString();
    bool exists = _messages.any((m) => m.id.toString() == messageId);
    if (exists) {
      log('⚠️ [BLOC] Duplicate ignored: $messageId');
      return;
    }

    // 🔥 SKIP own messages in DMs
    if (channelId == null && messageSenderId == currentUserId) {
      log('⏭️ [BLOC] Skipping own DM message');
      return;
    }

    // 🔥 SKIP if we just sent this (by tracking ID)
    if (_sendingMessageIds.contains(msg.id)) {
      log('⏭️ [BLOC] Skipping - we sent this message ID: ${msg.id}');
      return;
    }

    // Process message
    ChatMessageModel processedMessage = msg;

    // Ensure sender
    if (processedMessage.sender == null || processedMessage.sender?.id == 0) {
      final senderId = int.tryParse(messageSenderId ?? '') ?? 0;
      if (_recipients.containsKey(senderId)) {
        processedMessage.sender =
            _recipients[senderId]!.toJson() as MessageUser;
      } else {
        processedMessage.sender = MessageUser(
          id: senderId,
          name: 'User $senderId',
          email: '',
        );
      }
    }

    // Attach parent message
    if (processedMessage.parentId != null && processedMessage.parentId != 0) {
      try {
        processedMessage.parentMessage = _messages.firstWhere(
          (m) => m.id == processedMessage.parentId,
        );
      } catch (e) {
        log('⚠️ [BLOC] Parent not found: ${processedMessage.parentId}');
      }
    }

    // Ensure recipient
    if (processedMessage.recipient == null ||
        processedMessage.recipient?.id == 0) {
      final recipientIdInt = int.tryParse(recipientId) ?? 0;
      processedMessage.recipient = MessageUser(
        id: recipientIdInt,
        name: 'Recipient',
        email: '',
      );
    }

    // Set defaults
    processedMessage.teamId ??= teamId ?? 0;
    processedMessage.messageType ??= 'text';
    processedMessage.mentions ??= [];
    processedMessage.statuses ??= [];
    processedMessage.reactions ??= [];
    processedMessage.favorites ??= [];
    processedMessage.pins ??= [];
    processedMessage.isPinned ??= false;
    processedMessage.isFavorite ??= false;

    if (processedMessage.createdAt == null) {
      processedMessage.createdAt = DateTime.now().toIso8601String();
    }
    processedMessage.updatedAt ??= processedMessage.createdAt;

    try {
      // ✅ ADD MESSAGE
      _messages.add(processedMessage);
      _cacheRecipients();

      log('✅ [BLOC] Message added - Total: ${_messages.length}');

      // ✅ EMIT NewMessageReceived STATE FIRST (Prioritize UI update)
      if (!isClosed) {
        log('📬 [BLOC] Emitting NewMessageReceived state');
        emit(NewMessageReceived(messages: List.from(_messages)));
      }

      // Refresh dashboard (Background task)
      Future.delayed(Duration.zero, () {
        DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).fetchChats();
      });
    } catch (e, s) {
      log('❌ [BLOC] Error: $e\n$s');
    }
  }

  // void _onSocketMessageReceived(
  //   SocketMessageReceived event,
  //   Emitter<ChatState> emit,
  // ) {
  //   ChatMessageModel msg = event.message;
  //   log('📨 Processing socket message in bloc: ${msg.plainTextContent}');
  //
  //   final messageChannelId = msg.channelId?.toString();
  //   final messageRecipientId = msg.recipientId?.toString();
  //   final messageSenderId = msg.senderId?.toString();
  //   final messageParentId = msg.parentId?.toString();
  //
  //   // Validate essential message fields
  //   if (msg.id == 0 || msg.plainTextContent == '' || messageSenderId == null) {
  //     log('❌ Invalid message structure - missing essential fields');
  //     return;
  //   }
  //
  //   bool isRelevant = false;
  //
  //   if (channelId != null) {
  //     isRelevant = messageChannelId == channelId;
  //   } else {
  //     isRelevant =
  //         (messageSenderId == currentUserId &&
  //             messageRecipientId == recipientId) ||
  //         (messageSenderId == recipientId &&
  //             messageRecipientId == currentUserId);
  //   }
  //
  //   if (!isRelevant) {
  //     log('❌ Message not relevant to current conversation');
  //     return;
  //   }
  //
  //   // Check for duplicates
  //   final messageId = msg.id.toString();
  //   if (messageId != null) {
  //     bool exists = _messages.any((m) => m.id.toString() == messageId);
  //     if (exists) {
  //       log('⚠️ Duplicate message ignored by ID: $messageId');
  //       return;
  //     }
  //   }
  //
  //   // For DMs: Don't process messages from current user to prevent echo
  //   if (channelId == null && messageSenderId == currentUserId) {
  //     log('⚠️ Ignoring DM socket message from current user to prevent echo');
  //     return;
  //   }
  //
  //   // Process and add message
  //   ChatMessageModel processedMessage = msg;
  //
  //   // Ensure proper sender information
  //   if (processedMessage.sender == null) {
  //     final senderId =
  //         int.tryParse(processedMessage.senderId?.toString() ?? '') ?? 0;
  //     if (_recipients.containsKey(senderId)) {
  //       processedMessage.sender =
  //           _recipients[senderId]!.toJson() as MessageUser;
  //     } else {
  //       processedMessage.sender =
  //           {'id': senderId, 'name': 'User $senderId', 'email': ''}
  //               as MessageUser;
  //     }
  //   }
  //
  //   // Ensure recipient information
  //   if (processedMessage.recipient == null) {
  //     final recipientIdInt = int.tryParse(recipientId) ?? 0;
  //     processedMessage.recipient =
  //         {
  //               'id': recipientIdInt,
  //               'name': 'Recipient $recipientIdInt',
  //               'email': '',
  //             }
  //             as MessageUser;
  //   }
  //
  //   // Ensure required fields with defaults
  //   processedMessage.teamId ??= teamId ?? 0;
  //   processedMessage.messageType ??= 'text';
  //   processedMessage.mentions ??= [];
  //   processedMessage.statuses ??= [];
  //   processedMessage.reactions ??= [];
  //   processedMessage.favorites ??= [];
  //   processedMessage.pins ??= [];
  //   processedMessage.isPinned ??= false;
  //   processedMessage.isFavorite ??= false;
  //
  //   // Ensure timestamp
  //   if (processedMessage.createdAt == null &&
  //       processedMessage.createdAtDateTime == null) {
  //     processedMessage.createdAt = DateTime.now().toIso8601String();
  //   }
  //   processedMessage.updatedAt ??= processedMessage.createdAt;
  //
  //   try {
  //     final messageModel = processedMessage;
  //     _messages.add(messageModel);
  //     _cacheRecipients();
  //
  //     log(
  //       '✅ New message added successfully. Total messages: ${_messages.length}',
  //     );
  //
  //     // Refresh dashboard
  //     DashboardApi(
  //       serviceLocator<ApiManager>(),
  //       serviceLocator<AuthBloc>(),
  //     ).fetchChats();
  //     if (isClosed) {
  //       log("⚠️ Bloc closed — skipping socket message emit");
  //       return;
  //     }
  //
  //     emit(NewMessageReceived(messages: List.from(_messages)));
  //   } catch (e) {
  //     log('❌ Error creating ChatMessageModel from socket data: $e');
  //     log('❌ Problematic data: $processedMessage');
  //   }
  // }
  // ============================================
  // FIX in chat_bloc.dart - Status Update Handler
  // ============================================

  void _onSocketMessageStatusUpdated(
    SocketMessageStatusUpdated event,
    Emitter<ChatState> emit,
  ) {
    final data = event.data;
    final messageId =
        data['messageId']?.toString() ?? data['message_id']?.toString();
    final status = data['status']
        ?.toString()
        ?.toLowerCase(); // ✅ Convert to lowercase
    final userId = data['user_id']?.toString() ?? data['userId']?.toString();

    log('🔄 [BLOC STATUS] Update received:');
    log('   - Message ID: $messageId');
    log('   - Status: $status');
    log('   - User ID: $userId');

    if (messageId == null || status == null) {
      log('❌ [BLOC STATUS] Missing data');
      return;
    }

    bool messageUpdated = false;

    for (var i = 0; i < _messages.length; i++) {
      if (_messages[i].id.toString() == messageId) {
        log('✅ [BLOC STATUS] Message found');

        if (userId != null) {
          final userIdInt = int.tryParse(userId) ?? 0;

          // ✅ Create mutable copy
          List<MessageStatus> updatedStatuses = List.from(
            _messages[i].statuses,
          );

          // Find existing status for this user
          final existingIndex = updatedStatuses.indexWhere(
            (s) => s.userId == userIdInt,
          );

          if (existingIndex != -1) {
            // Update existing
            final oldStatus = updatedStatuses[existingIndex].status;
            updatedStatuses[existingIndex] = MessageStatus(
              userId: userIdInt,
              status: status, // ✅ Use lowercase status
              updatedAt: DateTime.now().toIso8601String(),
            );
            log('   ✏️ Updated: $oldStatus → $status');
          } else {
            // Add new
            updatedStatuses.add(
              MessageStatus(
                userId: userIdInt,
                status: status, // ✅ Use lowercase status
                updatedAt: DateTime.now().toIso8601String(),
              ),
            );
            log('   ➕ Added: $status');
          }

          // ✅ Create new message instance
          final messageJson = _messages[i].toJson();
          messageJson['statuses'] = updatedStatuses
              .map(
                (s) => {
                  'user_id': s.userId,
                  'status': s.status,
                  'updated_at': s.updatedAt,
                },
              )
              .toList();

          _messages[i] = ChatMessageModel.fromJson(messageJson);
          messageUpdated = true;

          log('   📊 Updated statuses: ${_messages[i].statuses.length}');
        }
        break;
      }
    }

    // ✅ Emit state to trigger UI rebuild
    if (!isClosed && messageUpdated) {
      log('📤 [BLOC STATUS] Emitting MessagesLoaded');
      emit(MessagesLoaded(messages: List.from(_messages)));

      // ✅ Force UI rebuild with small delay
      Future.delayed(Duration(milliseconds: 50), () {
        if (!isClosed) {
          emit(MessagesLoaded(messages: List.from(_messages)));
        }
      });
    }
  }

  // void _onSocketMessageStatusUpdated(
  //   SocketMessageStatusUpdated event,
  //   Emitter<ChatState> emit,
  // ) {
  //   final data = event.data;
  //   final messageId = data['messageId']?.toString();
  //
  //   if (messageId != null) {
  //     // Find and update message - you may need to add status field to your model
  //     for (var i = 0; i < _messages.length; i++) {
  //       if (_messages[i].id.toString() == messageId) {
  //         // Handle status updates based on your model structure
  //         break;
  //       }
  //     }
  //     emit(MessagesLoaded(messages: List.from(_messages)));
  //   }
  // }

  void _onSocketMessageDeleted(
    SocketMessageDeleted event,
    Emitter<ChatState> emit,
  ) {
    final data = event.data;
    final messageId = data['id']?.toString() ?? data['messageId']?.toString();

    log('🗑️ [CHATBLOC] Processing message deletion for ID: $messageId');

    if (messageId != null) {
      final initialCount = _messages.length;

      _messages.removeWhere((msg) => msg.id.toString() == messageId);

      final finalCount = _messages.length;
      log(
        '🗑️ [CHATBLOC] Messages count after deletion: $initialCount -> $finalCount',
      );

      emit(MessagesLoaded(messages: List.from(_messages)));
    }
  }

  void _onSocketMessageUpdated(
    SocketMessageUpdated event,
    Emitter<ChatState> emit,
  ) {
    final data = event.data;
    final messageId = data['id']?.toString() ?? data['messageId']?.toString();
    final newContent = data['content']?.toString();

    log('✏️ [SOCKET UPDATE] Message updated: $messageId');
    log('✏️ New content: $newContent');

    if (messageId != null && newContent != null) {
      bool messageUpdated = false;

      // ✅ Find and update message
      for (var i = 0; i < _messages.length; i++) {
        if (_messages[i].id.toString() == messageId) {
          try {
            // ✅ Create new message object from old one with updated content
            final messageData = _messages[i].toJson();
            messageData['content'] = newContent;
            messageData['updated_at'] =
                data['timestamp']?.toString() ??
                DateTime.now().toIso8601String();

            _messages[i] = ChatMessageModel.fromJson(messageData);

            messageUpdated = true;

            log('✅ [SOCKET UPDATE] Message $messageId content updated');
            log('✅ Updated at: ${_messages[i].updatedAt}');
          } catch (e) {
            log('❌ [SOCKET UPDATE] Error creating updated message: $e');
          }
          break;
        }
      }

      if (messageUpdated) {
        // ✅ Emit state to trigger UI rebuild
        emit(MessagesLoaded(messages: List.from(_messages)));
        log('📤 [SOCKET UPDATE] Emitting MessagesLoaded state');
      } else {
        log('⚠️ [SOCKET UPDATE] Message $messageId not found in local list');
      }
    } else {
      log('❌ [SOCKET UPDATE] Missing messageId or content in data');
    }
  }

  /*void _onSocketMessageUpdated(
    SocketMessageUpdated event,
    Emitter<ChatState> emit,
  ) {
    final updatedMessageData = event.data;
    final messageId = updatedMessageData['id']?.toString();

    if (messageId != null) {
      for (var i = 0; i < _messages.length; i++) {
        if (_messages[i].id.toString() == messageId) {
          try {
            _messages[i] = ChatMessageModel.fromJson(updatedMessageData);
            break;
          } catch (e) {
            log('❌ Error updating message from socket data: $e');
          }
        }
      }
      emit(MessagesLoaded(messages: List.from(_messages)));
    }
  }
*/
  void _onSocketMessageReactionUpdated(
    SocketMessageReactionUpdated event,
    Emitter<ChatState> emit,
  ) {
    final data = event.data;
    final messageId = data['message_id']?.toString();
    final reactions = data['reactions'];

    if (messageId != null && reactions != null) {
      for (var i = 0; i < _messages.length; i++) {
        if (_messages[i].id.toString() == messageId) {
          try {
            final updatedData = _messages[i].toJson();
            updatedData['reactions'] = reactions.map((r) {
              return {
                "emoji": r['emoji'],
                "count": r['count'],
                "users": r['users'],
              };
            }).toList();

            _messages[i] = ChatMessageModel.fromJson(updatedData);

            log(
              "🎉 Final reactions for msg $messageId => ${jsonEncode(updatedData['reactions'])}",
            );
            break;
          } catch (e) {
            log('❌ Error updating reactions: $e');
          }
        }
      }
      emit(MessagesLoaded(messages: List.from(_messages)));
    }
  }

  Future<void> _onRefreshMessages(
    RefreshMessages event,
    Emitter<ChatState> emit,
  ) async {
    try {
      log('🔄 Refreshing messages from API (delayed 1s)... $channelId');
      
      // ✅ Add delay to allow server-side transaction to complete
      await Future.delayed(const Duration(seconds: 1));

      List<ChatMessageModel> messages = (await messageService.loadMessages(
        recipientId: recipientId,
        channelId: channelId,
      )).cast<ChatMessageModel>();

      // 🔹 Decrypt refreshed messages
      await _decryptMessages(messages);

      // log('✅ Loaded ${messages.length} messages with latest pin/favorite status');

      _messages.clear();
      _messages.addAll(messages);
      _cacheRecipients();

      emit(MessagesLoaded(messages: List.from(_messages)));
    } catch (e) {
      // log('❌ Error refreshing messages: $e');
      // // emit(ChatError(error: 'Failed to refresh messages: $e'));
    }
  }

  Future<void> _onLoadConversations(
    LoadConversations event,
    Emitter<ChatState> emit,
  ) async {
    try {
      _conversations = await messageService.getConversations();
      emit(ConversationsLoaded(conversations: List.from(_conversations)));
    } catch (e) {
      emit(ChatError(error: 'Failed to load conversations: $e'));
    }
  }

  Future<void> _onDeleteMessage(
    DeleteMessage event,
    Emitter<ChatState> emit,
  ) async {
    try {
      if (!_authService.validateAuthState()) {
        emit(ChatError(error: 'User not authenticated'));
        return;
      }

      log('🗑️ Processing deletion for message: ${event.messageId}');

      final deleteData = {
        'messageId': event.messageId,
        'id': event.messageId,
        'userId': currentUserId,
        'recipientId': recipientId,
        'channelId': channelId,
        'timestamp': DateTime.now().toIso8601String(),
        'deletedBy': currentUserId,
        'type': channelId != null ? 'channel' : 'dm',
        'socketFirst': true,
      };

      socketService.emit(SocketEvents.messageDeleted, deleteData);
      log('📡 Socket delete event emitted');

      // Immediate local state update
      final initialCount = _messages.length;
      _messages.removeWhere((msg) => msg.id.toString() == event.messageId);
      final finalCount = _messages.length;

      if (initialCount > finalCount) {
        log('✅ Message ${event.messageId} removed from local state');
        emit(MessagesLoaded(messages: List.from(_messages)));
      }

      // Background API call
      _performBackgroundDelete(event.messageId);
    } catch (e) {
      log('❌ Error in delete: $e');
      emit(ChatError(error: 'Failed to delete message: $e'));
    }
  }

  Future<void> _onDeleteMultipleMessages(
    DeleteMultipleMessages event,
    Emitter<ChatState> emit,
  ) async {
    try {
      if (!_authService.validateAuthState()) {
        emit(ChatError(error: 'User not authenticated'));
        return;
      }

      log(
        '🗑️ Processing bulk deletion for ${event.messageIds.length} messages',
      );

      for (final messageId in event.messageIds) {
        final deleteData = {
          'messageId': messageId,
          'id': messageId,
          'userId': currentUserId,
          'recipientId': recipientId,
          'channelId': channelId,
          'timestamp': DateTime.now().toIso8601String(),
          'deletedBy': currentUserId,
          'type': channelId != null ? 'channel' : 'dm',
          'socketFirst': true,
        };

        socketService.emit(SocketEvents.messageDeleted, deleteData);
        log('📡 Socket delete event emitted for: $messageId');

        _messages.removeWhere((msg) => msg.id.toString() == messageId);
      }

      // Single emit after all local updates
      emit(MessagesLoaded(messages: List.from(_messages)));

      // Background API calls
      for (final messageId in event.messageIds) {
        _performBackgroundDelete(messageId);
      }
    } catch (e) {
      log('❌ Error in bulk delete: $e');
      emit(ChatError(error: 'Failed to delete messages: $e'));
    }
  }

  void _performBackgroundDelete(String messageId) async {
    try {
      log('📡 Starting background API delete in ChatBloc');
      final success = await messageService.deleteMessage(messageId);
      if (success) {
        log('✅ Background ChatBloc API delete successful');
      } else {
        log('⚠️ Background ChatBloc API delete failed');
      }
    } catch (e) {
      log('⚠️ Background ChatBloc API delete error: $e');
    }
  }

  void _cacheRecipients() {
    for (var msg in _messages) {
      if (msg.senderId != int.tryParse(currentUserId ?? '0')) {
        _recipients[msg.senderId] = msg.sender;
      }
      _recipients[msg.recipientId] = msg.recipient;
    }
  }

  @override
  Future<void> close() {
    log('🚪 Closing ChatBloc and cleaning up socket listeners...');
    // Unsubscribe from all socket events
    _unsubscribeReceiveMessage?.call();
    _unsubscribeMessageStatus?.call();
    _unsubscribeMessageDeleted?.call();
    _unsubscribeMessageUpdated?.call();
    _unsubscribeMessageReaction?.call();

    // ✅ Added missing unsubscriptions
    socketService.off(SocketEvents.addReaction);
    socketService.off(SocketEvents.removeReaction);
    socketService.off(SocketEvents.messagePin);
    socketService.off(SocketEvents.messageFavorite);

    return super.close();
  }

  void _onAddReactionLocally(
    AddReactionLocally event,
    Emitter<ChatState> emit,
  ) {
    try {
      log(
        '🔄 [LOCAL] Processing add reaction ${event.emoji} to message ${event.messageId} for user ${event.userId}',
      );

      bool messageUpdated = false;

      for (var i = 0; i < _messages.length; i++) {
        if (_messages[i].id.toString() == event.messageId) {
          // Get current reactions and create a mutable copy
          List<ReactionChat> reactions = List.from(_messages[i].reactions);

          // Find the reaction for this emoji if it exists
          ReactionChat? existingReaction = reactions.firstWhere(
            (r) => r.emoji == event.emoji,
            orElse: () => ReactionChat(emoji: event.emoji, count: 0, users: []),
          );

          // If this emoji is new, add to reactions list
          if (!reactions.contains(existingReaction)) {
            reactions.add(existingReaction);
          }

          // Add user to this emoji if not already present
          if (!existingReaction.users.contains(event.userId.toString())) {
            existingReaction.users.add(event.userId.toString());
            existingReaction.count = existingReaction.users.length;
          }

          // Remove user's reaction from other emojis (only one allowed per message)
          for (var r in reactions) {
            if (r.emoji != event.emoji &&
                r.users.contains(event.userId.toString())) {
              r.users.remove(event.userId.toString());
              r.count = r.users.length;
            }
          }

          // Update the message with new reactions
          final updatedData = _messages[i].toJson();
          updatedData['reactions'] = reactions.map((r) => r.toJson()).toList();
          _messages[i] = ChatMessageModel.fromJson(updatedData);

          messageUpdated = true;
          log(
            '✅ [LOCAL] Reaction added. Total reactions for message: ${reactions.length}',
          );
          break;
        }
      }

      if (messageUpdated) {
        emit(MessagesLoaded(messages: List.from(_messages)));
        log('✅ [LOCAL] UI updated instantly with reaction');
      } else {
        log('⚠️ [LOCAL] Message not found for reaction addition');
      }
    } catch (e) {
      log('❌ [LOCAL] Error adding reaction: $e');
    }
  }

  void _onRemoveReactionLocally(
    RemoveReactionLocally event,
    Emitter<ChatState> emit,
  ) {
    try {
      log(
        '🔄 [LOCAL] Processing remove reaction ${event.emoji} from message ${event.messageId} for user ${event.userId}',
      );

      bool messageUpdated = false;

      for (var i = 0; i < _messages.length; i++) {
        if (_messages[i].id.toString() == event.messageId) {
          // Get current reactions and create a mutable copy
          List<ReactionChat> reactions = List.from(_messages[i].reactions);

          // Find the reaction with this emoji
          final reactionIndex = reactions.indexWhere(
            (r) => r.emoji == event.emoji,
          );

          if (reactionIndex != -1) {
            final reaction = reactions[reactionIndex];

            // Remove the user from this emoji's users list
            if (reaction.users.contains(event.userId.toString())) {
              // Create a new copy with updated users
              final updatedUsers = List<String>.from(reaction.users)
                ..remove(event.userId.toString());

              final updatedCount = updatedUsers.length;

              // ✅ If no users remain, remove the emoji reaction completely
              if (updatedCount == 0) {
                reactions.removeAt(reactionIndex);
                log('✅ [LOCAL] Removed empty reaction ${event.emoji}');
              } else {
                // Update the reaction with new count and users
                reactions[reactionIndex] = ReactionChat(
                  emoji: reaction.emoji,
                  count: updatedCount,
                  users: updatedUsers,
                );
                log(
                  '✅ [LOCAL] Updated reaction ${event.emoji} count to $updatedCount',
                );
              }

              // Update the message with new reactions
              final updatedData = _messages[i].toJson();
              updatedData['reactions'] = reactions
                  .where(
                    (r) => r.count > 0,
                  ) // ✅ Extra safety - filter out count=0
                  .map((r) => r.toJson())
                  .toList();

              _messages[i] = ChatMessageModel.fromJson(updatedData);

              messageUpdated = true;
              log(
                '✅ [LOCAL] Reaction removed. Remaining reactions: ${reactions.length}',
              );
            } else {
              log(
                '⚠️ [LOCAL] User ${event.userId} not found in reaction ${event.emoji}',
              );
            }
          } else {
            log(
              '⚠️ [LOCAL] Reaction ${event.emoji} not found for message ${event.messageId}',
            );
          }

          break;
        }
      }

      if (messageUpdated) {
        emit(MessagesLoaded(messages: List.from(_messages)));
        log('✅ [LOCAL] UI updated instantly after reaction removal');
      } else {
        log('⚠️ [LOCAL] Message not found for reaction removal');
      }
    } catch (e, stackTrace) {
      log('❌ [LOCAL] Error removing reaction: $e');
      log('Stack trace: $stackTrace');
    }
  }

  void _onMessageReactionUpdated(
    MessageReactionUpdated event,
    Emitter<ChatState> emit,
  ) {
    final data = event.data;
    final messageId =
        data['message_id']?.toString() ?? data['messageId']?.toString();
    final reactions = data['reactions'];

    if (messageId == null) return;

    for (var i = 0; i < _messages.length; i++) {
      if (_messages[i].id.toString() == messageId) {
        try {
          if (reactions != null) {
            // ✅ Convert full updated list from socket
            final updatedReactions = (reactions as List)
                .map((r) => ReactionChat.fromJson(r))
                .toList();

            // Replace message reactions completely
            final updatedData = _messages[i].toJson();
            updatedData['reactions'] = updatedReactions
                .map((r) => r.toJson())
                .toList();

            _messages[i] = ChatMessageModel.fromJson(updatedData);

            log('✅ Updated reactions (full replace) for message $messageId');
          } else {
            // ✅ If no reactions in payload, clear all
            _messages[i].reactions = [];
            log('✅ Cleared all reactions for message $messageId (none left)');
          }
        } catch (e) {
          log('❌ Error updating message reactions: $e');
        }
        break;
      }
    }

    emit(MessagesLoaded(messages: List.from(_messages)));
  }

  Future<void> _onFetchCurrentSubscription(
    FetchCurrentSubscription event,
    Emitter<ChatState> emit,
  ) async {
    try {
      log('📡 Fetching current subscription...');
      final response = await messageService.fetchCurrentSubscription();
      currentSubscription = response;
      log('✅ Subscription data stored: $currentSubscription');
      log(
        '✅ Subscription data stored: ${currentSubscription?['data']['subscription']["plan"]["allows_video_calls"]}',
      );
      if (state is MessagesLoaded) {
        emit(MessagesLoaded(messages: List.from(_messages)));
      }
    } catch (e, s) {
      log('❌ Error fetching subscription: $e=--=-=$s');
    }
  }

  Future<void> _decryptMessages(List<ChatMessageModel> messages) async {
    for (var msg in messages) {
      await _decryptMessage(msg);
    }
  }

  Future<void> _decryptMessage(ChatMessageModel msg) async {
    if (!msg.isEncrypted) return;

    try {
      String? aesKey = _senderAESKeys[msg.senderId];
      if (aesKey == null) {
        final pubKey =
            await messageService.getPublicKey(msg.senderId.toString());
        if (pubKey != null) {
          aesKey = _encryptionService.deriveAESKey(pubKey);
          _senderAESKeys[msg.senderId] = aesKey;
        }
      }

      if (aesKey != null) {
        msg.content = _encryptionService.decryptMessage(msg.content, aesKey);
        msg.isEncrypted = false;
        log('🔓 Decrypted message ${msg.id} from sender ${msg.senderId}');
      }
    } catch (e) {
      log('❌ Failed to decrypt message ${msg.id}: $e');
    }
  }
}
