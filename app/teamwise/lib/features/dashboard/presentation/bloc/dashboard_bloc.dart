import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:teamwise/core/utils/custom_snack_bar.dart';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../auth/data/auth_services.dart';
import '../../../chat/socket_service.dart';
import '../../data/datasources/dashboard_api.dart';
import '../../domain/usecases/get_chats_usecase.dart';
import '../../domain/usecases/search_chats_usecase.dart';
import '../../../../core/services/encryption_service.dart';
import '../../../chat/data/datasources/chat_Api.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final GetChatsUseCase getChatsUseCase;
  final SearchChatsUseCase searchChatsUseCase;
  DashboardApi? dashboardApi;
  final EncryptionService _encryptionService = EncryptionService();
  final Map<int, String> _senderAESKeys =
      {}; // Cache for SenderId -> Derived AES Key
  StreamSubscription<bool>? _connectionSubscription;
  DateTime? _lastLoadTime;

  // Socket event listener cleanup handles
  bool _socketListenersSetup = false;
  Function()? _unsubscribeReceiveMessage;
  Function()? _unsubscribeMessagesRead;
  Function()? _unsubscribeChatPin;
  Function()? _unsubscribeChatMuted;
  Function()? _unsubscribeChatUnmuted;
  Function()? _unsubscribeChannelCreated;
  Function()? _unsubscribeNewChannel;

  // Buffer for incoming channel payloads that arrive before chats are loaded
  final List<Map<String, dynamic>> _pendingChannelPayloads = [];

  DashboardBloc({
    required this.getChatsUseCase,
    required this.searchChatsUseCase,
    this.dashboardApi,
  }) : super(ChatInitial()) {
    on<LoadChats>(_onLoadChats);
    on<RefreshChats>(_onRefreshChats);
    on<SearchChats>(_onSearchChats);
    on<SelectChat>(_onSelectChat);
    on<ClearSearch>(_onClearSearch);
    on<ResetSelection>(_onResetSelection);
    on<TogglePinChat>(_onTogglePinChat);
    on<MarkReadChat>(_onMarkReadChat);
    on<UpdateUnreadCount>(_onUpdateUnread);
    on<UpdateLastMessage>(_onUpdateLastMessage);
    on<IncrementUnreadCount>(_onIncrementUnreadCount);
    on<ToggleMuteChat>(_onToggleMuteChat);
    on<NewChannelReceivedEvent>(_onNewChannelReceived);
    on<ExternalPinUpdateReceived>(_onExternalPinUpdate);
    on<ExternalMuteUpdateReceived>(_onExternalMuteUpdate);
    on<ChangePassword>(_onChangePassword);
    on<ToggleDashboardPasswordVisibility>(_onTogglePasswordVisibility);

    // Setup socket listeners (idempotent)
    _setupSocketListenersOnce();

    // Listen for connection changes so listeners can be re-registered after reconnect
    try {
      _connectionSubscription = serviceLocator<SocketService>().connectionStream
          .listen((connected) {
            if (connected) {
              log('Socket connected -> resetting dashboard listeners');
              resetSocketListeners();
            }
          });
    } catch (e, s) {
      log('Connection stream subscribe failed: $e\n$s');
    }
  }

  // Reset socket listeners (useful after reconnection)
  void resetSocketListeners() {
    log("Resetting socket listeners due to reconnection...");
    _cleanupSocketListeners();
    _setupSocketListenersOnce();
  }

  // ---- Event handlers ----
  FutureOr<void> _onNewChannelReceived(
    NewChannelReceivedEvent event,
    Emitter<DashboardState> emit,
  ) {
    try {
      _handleIncomingChannelPayload(event.payload, emit);
    } catch (e, s) {
      log('❌ _onNewChannelReceived error: $e\n$s');
    }
  }

  void _onExternalPinUpdate(
    ExternalPinUpdateReceived event,
    Emitter<DashboardState> emit,
  ) {
    _handleExternalPinUpdate(event.payload, emit);
  }

  void _onExternalMuteUpdate(
    ExternalMuteUpdateReceived event,
    Emitter<DashboardState> emit,
  ) {
    _handleExternalMuteUpdate(
      event.targetId,
      event.muted,
      event.mutedUntil,
      emit,
    );
  }

  void _onSelectChat(SelectChat event, Emitter<DashboardState> emit) {
    if (state is ChatLoaded) {
      final currentState = state as ChatLoaded;

      // Find the selected chat by BOTH ID and TYPE to avoid conflicts
      MessageModel? selectedChat;

      try {
        selectedChat = currentState.filteredChats.firstWhere(
          (chat) => chat.id == event.chatId && chat.chatType == event.chatType,
        );
      } catch (e) {
        // If not found in filteredChats, try in all chats
        try {
          selectedChat = currentState.chats.firstWhere(
            (chat) =>
                chat.id == event.chatId && chat.chatType == event.chatType,
          );
        } catch (e) {
          log(
            '❌ Chat with ID ${event.chatId} and type ${event.chatType} not found',
          );
          return;
        }
      }

      log('🎯 Chat Selected: ${selectedChat.name}');
      log('   - ID: ${selectedChat.id}');
      log('   - Type: ${selectedChat.chatType}');
      log('   - Channel ID: ${selectedChat.channelId}');
      log('   - Recipient ID: ${selectedChat.recipientId}');

      // Update unread counts for the specific chat (match by both ID and type)
      final updatedChats = currentState.chats
          .map(
            (c) => (c.id == event.chatId && c.chatType == event.chatType)
                ? c.copyWith(unreadCount: 0)
                : c,
          )
          .toList();
      final updatedFiltered = currentState.filteredChats
          .map(
            (c) => (c.id == event.chatId && c.chatType == event.chatType)
                ? c.copyWith(unreadCount: 0)
                : c,
          )
          .toList();

      emit(
        currentState.copyWith(
          selectedChatId: event.chatId,
          selectedChatType: selectedChat.chatType,
          chats: updatedChats,
          filteredChats: updatedFiltered,
        ),
      );
    }
  }

  Future<void> _onSearchChats(
    SearchChats event,
    Emitter<DashboardState> emit,
  ) async {
    if (state is ChatLoaded) {
      final currentState = state as ChatLoaded;
      if (event.query.isEmpty) {
        final allChats = await getChatsUseCase();
        emit(currentState.copyWith(filteredChats: allChats, searchQuery: ''));
      } else {
        final filtered = await searchChatsUseCase(event.query);
        emit(
          currentState.copyWith(
            filteredChats: filtered,
            searchQuery: event.query,
          ),
        );
      }
    }
  }

  void _onClearSearch(ClearSearch event, Emitter<DashboardState> emit) {
    if (state is ChatLoaded) {
      final currentState = state as ChatLoaded;
      emit(
        currentState.copyWith(
          filteredChats: currentState.chats,
          searchQuery: '',
        ),
      );
    }
  }

  void _onResetSelection(ResetSelection event, Emitter<DashboardState> emit) {
    if (state is ChatLoaded) {
      final currentState = state as ChatLoaded;
      emit(currentState.copyWith(selectedChatId: null, selectedChatType: null));
    }
  }

  void _onUpdateLastMessage(
    UpdateLastMessage event,
    Emitter<DashboardState> emit,
  ) {
    if (state is ChatLoaded) {
      final s = state as ChatLoaded;

      log(
        '📨 Updating last message for chat ${event.chatId}: ${event.message}',
      );

      final updatedChats = s.chats.map((chat) {
        if (chat.id == event.chatId) {
          return chat.copyWith(
            lastMessage: event.message,
            lastMessageType: event.messageType,
            lastMessageTime: event.timestamp,
          );
        }
        return chat;
      }).toList();

      updatedChats.sort((a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.lastMessageTime ?? DateTime(1970)).compareTo(
          a.lastMessageTime ?? DateTime(1970),
        );
      });

      final updatedFiltered = s.searchQuery.isEmpty
          ? updatedChats
          : updatedChats
                .where(
                  (chat) => chat.name.toLowerCase().contains(
                    s.searchQuery.toLowerCase(),
                  ),
                )
                .toList();

      emit(
        ChatLoaded(
          chats: updatedChats,
          filteredChats: updatedFiltered,
          searchQuery: s.searchQuery,
          selectedChatId: s.selectedChatId,
          selectedChatType: s.selectedChatType,
        ),
      );
    }
  }

  void _onIncrementUnreadCount(
    IncrementUnreadCount event,
    Emitter<DashboardState> emit,
  ) {
    if (state is ChatLoaded) {
      final s = state as ChatLoaded;
      log('📨 Incrementing unread count for chat ${event.chatId}');

      final updatedChats = s.chats.map((chat) {
        if (chat.id == event.chatId && s.selectedChatId != event.chatId) {
          return chat.copyWith(unreadCount: (chat.unreadCount ?? 0) + 1);
        }
        return chat;
      }).toList();

      final updatedFiltered = s.searchQuery.isEmpty
          ? updatedChats
          : updatedChats
                .where(
                  (chat) => chat.name.toLowerCase().contains(
                    s.searchQuery.toLowerCase(),
                  ),
                )
                .toList();

      emit(
        ChatLoaded(
          chats: updatedChats,
          filteredChats: updatedFiltered,
          searchQuery: s.searchQuery,
          selectedChatId: s.selectedChatId,
          selectedChatType: s.selectedChatType,
        ),
      );
    }
  }

  // ---- Socket listeners setup ----
  void _setupSocketListenersOnce() {
    if (_socketListenersSetup) {
      log("Socket listeners already setup, skipping...");
      return;
    }

    log("Setting up socket listeners for DashboardBloc...");
    _cleanupSocketListeners();

    // IMPORTANT: use the singleton instance everywhere
    final _socket = serviceLocator<SocketService>();

    log(
      '📡 Socket status: Connected: ${_socket.isConnected}, UserID: ${_socket.currentUserId}, TeamID: ${_socket.currentTeamId}',
    );

    // (Optional) enable onAny debugging temporarily
    try {
      _socket.onAny((event, data) {
        log('SOCKET onAny -> event: $event, data: $data');
      });
    } catch (_) {}

    // PIN listener
    _unsubscribeChatPin = _socket.onSocketEvent(SocketEvents.chatPinUpdate, (
      payload,
    ) {
      try {
        final targetIdStr =
            payload['target_id']?.toString() ??
            payload['targetId']?.toString() ??
            payload['chatId']?.toString() ??
            payload['chat_id']?.toString() ??
            payload['id']?.toString();
        if (targetIdStr == null) return;
        final targetId = int.tryParse(targetIdStr);
        if (targetId == null) return;
        dynamic pinnedValue =
            payload['pinned'] ?? payload['is_pinned'] ?? payload['pin'];
        final bool isPinned = pinnedValue is bool
            ? pinnedValue
            : (pinnedValue?.toString().toLowerCase() == 'true');
        add(
          ExternalPinUpdateReceived({
            'target_id': targetId,
            'pinned': isPinned,
          }),
        );
      } catch (e, s) {
        log('❌ Error in pin handler: $e\n$s');
      }
    });
    log('✅ PIN listener registered');

    // MUTE listener
    _unsubscribeChatMuted = _socket.onSocketEvent(SocketEvents.chatMuted, (
      payload,
    ) {
      try {
        final targetIdStr =
            payload['target_id']?.toString() ??
            payload['targetId']?.toString() ??
            payload['chatId']?.toString();
        if (targetIdStr == null) return;
        final targetId = int.tryParse(targetIdStr);
        if (targetId == null) return;
        final mutedUntil =
            payload['muted_until']?.toString() ??
            payload['mutedUntil']?.toString();
        add(ExternalMuteUpdateReceived(targetId, true, mutedUntil));
      } catch (e, s) {
        log('❌ Error in mute handler: $e\n$s');
      }
    });
    log('✅ MUTE listener registered');

    // UNMUTE listener
    _unsubscribeChatUnmuted = _socket.onSocketEvent(SocketEvents.chatUnmuted, (
      payload,
    ) {
      try {
        final targetIdStr =
            payload['target_id']?.toString() ??
            payload['targetId']?.toString() ??
            payload['chatId']?.toString();
        if (targetIdStr == null) return;
        final targetId = int.tryParse(targetIdStr);
        if (targetId == null) return;
        add(ExternalMuteUpdateReceived(targetId, false, null));
      } catch (e, s) {
        log('❌ Error in unmute handler: $e\n$s');
      }
    });
    log('✅ UNMUTE listener registered');

    // NEW: subscribe to new-channel and refresh dashboard list after handling
    _unsubscribeNewChannel = _socket.onSocketEvent(SocketEvents.newChannel, (
      rawPayload,
    ) {
      try {
        final Map<String, dynamic> payload = _normalizePayload(rawPayload);
        log('*** SOCKET raw new-channel payload: $rawPayload');
        log('*** SOCKET normalized new-channel payload: $payload');

        // 1) queue or handle locally (keeps UI snappy)
        _queueOrHandleChannel(payload);

        // 2) Ask the bloc to refresh authoritative data from server
        // Use add(...) so changes go through Bloc event handlers (safe & testable)
        // We call RefreshChats instead of LoadChats to avoid showing loader; change if you want loader.
        add(RefreshChats());
      } catch (e, s) {
        log('❌ Error handling new-channel payload: $e\n$s');
      }
    });
    log(
      '✅ DashboardBloc subscribed to SocketEvents.newChannel (and will trigger refresh)',
    );

    log('✅ DashboardBloc subscribed to SocketEvents.newChannel');

    // channelCreated (if backend uses different name)
    _unsubscribeChannelCreated = _socket.onSocketEvent(
      SocketEvents.channelCreated,
      (data) {
        try {
          final payload = _normalizePayload(data);
          log('DashboardBloc received channel-created payload: $payload');
          _queueOrHandleChannel(payload);
        } catch (e, s) {
          log('❌ channel-created parse error: $e\n$s');
        }
      },
    );
    log('✅ DashboardBloc subscribed to SocketEvents.channelCreated');

    // RECEIVE MESSAGE
    _unsubscribeReceiveMessage = _socket.onSocketEvent(
      SocketEvents.receiveMessage,
      (data) async {
        try {
          log("📨 Dashboard received message: $data");
          final messageId = data['id']?.toString();
          final senderId = data['sender_id']?.toString();
          final recipientId = data['recipient_id']?.toString();
          final channelId = data['channel_id']?.toString();
          final messageContent =
              data['message']?.toString() ?? data['content']?.toString() ?? '';
          final messageType = data['message_type']?.toString() ?? 'text';
          final timestampStr = data['created_at']?.toString();
          final timestamp = timestampStr != null
              ? DateTime.tryParse(timestampStr)
              : DateTime.now();
          if (timestamp == null) return;

          int? chatId;
          if (channelId != null) {
            chatId = int.tryParse(channelId);
          } else if (senderId != null && recipientId != null) {
            final currentUserId = AuthService().userId;
            chatId = int.tryParse(
              senderId == currentUserId ? recipientId : senderId,
            );
          }
          if (chatId == null) return;

          // 🔹 Decrypt message if needed
          String finalContent = messageContent;
          final isEncrypted =
              data['is_encrypted'] == true ||
              data['is_encrypted'] == 1 ||
              data['is_encrypted']?.toString() == '1' ||
              data['is_encrypted']?.toString().toLowerCase() == 'true' ||
              messageContent.startsWith('U2FsdGVkX18');

          if (isEncrypted) {
            try {
              final sId = int.tryParse(senderId ?? '');
              if (sId != null && sId != 0) {
                String? aesKey = _senderAESKeys[sId];
                if (aesKey == null) {
                  final chatApi = serviceLocator<ChatApi>();
                  final pubKey = await chatApi.getPublicKey(sId.toString());
                  if (pubKey != null) {
                    aesKey = _encryptionService.deriveAESKey(pubKey);
                    _senderAESKeys[sId] = aesKey;
                  }
                }

                if (aesKey != null) {
                  finalContent = _encryptionService.decryptMessage(
                    messageContent,
                    aesKey,
                  );
                  log(
                    '🔓 Dashboard: Decrypted incoming socket message: $finalContent',
                  );
                } else {
                  log(
                    '⚠️ Dashboard: No AES key for sender $sId, skipping decryption',
                  );
                }
              }
            } catch (e) {
              log('❌ Dashboard: Failed to decrypt socket message: $e');
            }
          }

          add(
            UpdateLastMessage(
              chatId: chatId,
              message: finalContent,
              messageType: messageType,
              timestamp: timestamp,
            ),
          );

          if (state is ChatLoaded) {
            final s = state as ChatLoaded;
            if (s.selectedChatId != chatId) add(IncrementUnreadCount(chatId));
          } else {
            add(IncrementUnreadCount(chatId));
          }

          if (state is ChatLoaded) {
            final s = state as ChatLoaded;
            if (s.selectedChatId == chatId &&
                senderId != AuthService().userId &&
                messageId != null) {
              SocketService().sendMessageSeen([messageId]);
            }
          }
        } catch (e, stackTrace) {
          log("❌ Error processing socket message: $e");
          log("❌ Stack trace: $stackTrace");
        }
      },
    );

    // MESSAGES READ
    _unsubscribeMessagesRead = _socket.onSocketEvent(
      SocketEvents.messagesRead,
      (data) {
        try {
          log("📖 Messages marked as read: $data");
          final chatId = int.tryParse(data['chatId']?.toString() ?? '');
          if (chatId != null) add(UpdateUnreadCount(chatId, reset: true));
        } catch (e, s) {
          log('❌ messagesRead handler error: $e\n$s');
        }
      },
    );

    // userStatusUpdate forwarded by SocketService, no local processing needed
    try {
      _socket.onSocketEvent(SocketEvents.userStatusUpdate, (data) {});
    } catch (_) {}

    _socketListenersSetup = true;
    log("✅ Socket listeners setup completed for DashboardBloc");
  }

  // Queue or handle incoming channel payload
  void _queueOrHandleChannel(Map<String, dynamic> payload) {
    if (state is! ChatLoaded) {
      _pendingChannelPayloads.add(payload);
      log(
        'Queued channel payload (chats not loaded). Queue length: ${_pendingChannelPayloads.length}',
      );
      return;
    }
    add(NewChannelReceivedEvent(payload));
  }

  void _flushPendingChannels() {
    if (_pendingChannelPayloads.isEmpty) return;
    final pending = List<Map<String, dynamic>>.from(_pendingChannelPayloads);
    _pendingChannelPayloads.clear();
    for (final p in pending) {
      add(NewChannelReceivedEvent(p));
    }
  }

  // Helper: normalize incoming socket payloads safely
  Map<String, dynamic> _normalizePayload(dynamic data) {
    if (data is Map<String, dynamic>) return Map<String, dynamic>.from(data);
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is String) {
      try {
        final decoded = json.decode(data);
        if (decoded is Map) return Map<String, dynamic>.from(decoded);
        return {'_raw': decoded};
      } catch (_) {
        return {'_raw': data};
      }
    }
    return {'_raw': data};
  }

  // Existing _handleIncomingChannelPayload (unchanged in effect)
  void _handleIncomingChannelPayload(
    Map<String, dynamic> payload,
    Emitter<DashboardState> emit,
  ) {
    try {
      if (state is! ChatLoaded) {
        log(
          '🔔 Incoming channel but chats not loaded yet; queueing or ignoring.',
        );
        return;
      }

      final current = state as ChatLoaded;
      final idStr =
          payload['channel_id']?.toString() ?? payload['id']?.toString();
      if (idStr == null) {
        log('❌ channel payload missing id: $payload');
        return;
      }
      final id = int.tryParse(idStr) ?? 0;

      MessageModel newChannel;
      try {
        final normalized = Map<String, dynamic>.from(payload);
        normalized['type'] = normalized['type'] ?? 'channel';
        normalized['id'] = normalized['id'] ?? normalized['channel_id'] ?? id;
        newChannel = MessageModel.fromJson(normalized);
      } catch (e) {
        final mapped = {
          'id': id,
          'name': payload['name'] ?? payload['title'] ?? 'Channel',
          'avatar': payload['avatar'] ?? payload['channel_avatar'],
          'type': 'channel',
          'description': payload['description'] ?? payload['desc'],
          'latest_message_at':
              payload['created_at'] ?? DateTime.now().toIso8601String(),
          'unread_count': 0,
          'pinned': false,
          'is_muted': false,
          'profile_color': payload['profile_color'],
          'team_id': payload['team_id'],
        };
        newChannel = MessageModel.fromJson(mapped);
      }

      final alreadyExists = current.chats.any(
        (c) => c.id == newChannel.id && c.isChannel,
      );
      if (alreadyExists) {
        log('🔁 Channel ${newChannel.id} already present — skipping insert.');
        return;
      }

      final pinnedList = current.chats.where((c) => c.pinned).toList();
      final restList = current.chats.where((c) => !c.pinned).toList();
      final updatedRest = [newChannel, ...restList];
      final updatedChats = [...pinnedList, ...updatedRest];
      updatedChats.sort((a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.lastMessageTime ?? DateTime(1970)).compareTo(
          a.lastMessageTime ?? DateTime(1970),
        );
      });

      final updatedFiltered = _filterChats(updatedChats, current.searchQuery);
      emit(
        current.copyWith(chats: updatedChats, filteredChats: updatedFiltered),
      );
      log(
        '✅ Inserted new channel ${newChannel.id} into dashboard state (no refresh).',
      );
    } catch (e, s) {
      log('❌ _handleIncomingChannelPayload error: $e\n$s');
    }
  }

  // Pin/mute handlers
  void _handleExternalPinUpdate(
    Map<String, dynamic> payload,
    Emitter<DashboardState> emit,
  ) {
    try {
      if (state is! ChatLoaded) return;
      final current = state as ChatLoaded;
      final targetIdStr = payload['target_id']?.toString();
      if (targetIdStr == null) return;
      final targetId = int.tryParse(targetIdStr);
      if (targetId == null) return;

      final bool? pinnedFromPayload = payload.containsKey('pinned')
          ? (payload['pinned'] == true)
          : null;
      final updatedChats = current.chats.map((chat) {
        if (chat.id == targetId) {
          final newPinned = pinnedFromPayload ?? !chat.pinned;
          return chat.copyWith(pinned: newPinned);
        }
        return chat;
      }).toList();

      updatedChats.sort((a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.lastMessageTime ?? DateTime(1970)).compareTo(
          a.lastMessageTime ?? DateTime(1970),
        );
      });

      emit(
        current.copyWith(
          chats: updatedChats,
          filteredChats: _filterChats(updatedChats, current.searchQuery),
        ),
      );
    } catch (e, s) {
      log('❌ handleExternalPinUpdate error: $e $s');
    }
  }

  void _handleExternalMuteUpdate(
    int targetId,
    bool muted,
    String? mutedUntil,
    Emitter<DashboardState> emit,
  ) {
    try {
      if (state is! ChatLoaded) return;
      final current = state as ChatLoaded;

      final updatedChats = current.chats.map((chat) {
        if (chat.id == targetId) {
          return chat.copyWith(muted: muted);
        }
        return chat;
      }).toList();

      emit(
        current.copyWith(
          chats: updatedChats,
          filteredChats: _filterChats(updatedChats, current.searchQuery),
        ),
      );
    } catch (e, s) {
      log('❌ handleExternalMuteUpdate error: $e $s');
    }
  }

  // Toggle pin implementation (optimistic update)
  Future<void> _onTogglePinChat(
    TogglePinChat event,
    Emitter<DashboardState> emit,
  ) async {
    if (state is! ChatLoaded) return;
    final currentState = state as ChatLoaded;
    final int index = currentState.chats.indexWhere(
      (c) => c.id == event.chatId,
    );
    if (index == -1) return;

    final originalChat = currentState.chats[index];
    final bool optimisticPinned = !originalChat.pinned;

    final updatedChatsOptimistic = currentState.chats.map((chat) {
      if (chat.id == originalChat.id)
        return chat.copyWith(pinned: optimisticPinned);
      return chat;
    }).toList();

    updatedChatsOptimistic.sort((a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastMessageTime ?? DateTime(1970)).compareTo(
        a.lastMessageTime ?? DateTime(1970),
      );
    });

    emit(
      currentState.copyWith(
        chats: updatedChatsOptimistic,
        filteredChats: _filterChats(
          updatedChatsOptimistic,
          currentState.searchQuery,
        ),
      ),
    );

    try {
      await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).pinChat(
        originalChat.id.toString(),
        pin: optimisticPinned,
        type: originalChat.chatType,
      );

      final userId = AuthService().userId;
      final payload = {
        'id': userId,
        'target_id': originalChat.id.toString(),
        'type': originalChat.chatType,
        'pinned': optimisticPinned,
        'timestamp': DateTime.now().toIso8601String(),
      };
      try {
        serviceLocator<SocketService>().emit(
          SocketEvents.chatPinUpdate,
          payload,
        );
      } catch (_) {}
    } catch (e, s) {
      log('❌ Pin API failed, reverting optimistic update: $e\n$s');
      final reverted = currentState.chats.map((chat) {
        if (chat.id == originalChat.id)
          return chat.copyWith(pinned: originalChat.pinned);
        return chat;
      }).toList();
      reverted.sort((a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.lastMessageTime ?? DateTime(1970)).compareTo(
          a.lastMessageTime ?? DateTime(1970),
        );
      });
      emit(
        currentState.copyWith(
          chats: reverted,
          filteredChats: _filterChats(reverted, currentState.searchQuery),
        ),
      );
    }
  }

  Future<void> _onToggleMuteChat(
    ToggleMuteChat event,
    Emitter<DashboardState> emit,
  ) async {
    if (state is! ChatLoaded) return;
    final currentState = state as ChatLoaded;

    MessageModel? targetChat;
    try {
      targetChat = currentState.chats.firstWhere(
        (chat) => chat.id == event.chatId,
      );
    } catch (e) {
      log('❌ Chat with ID ${event.chatId} not found for mute toggle');
      return;
    }

    final bool optimisticMuted = event.mute;
    final List<MessageModel> optimisticChats = currentState.chats.map((chat) {
      if (chat.id == targetChat!.id)
        return chat.copyWith(muted: optimisticMuted);
      return chat;
    }).toList();

    emit(
      currentState.copyWith(
        chats: optimisticChats,
        filteredChats: _filterChats(optimisticChats, currentState.searchQuery),
      ),
    );

    try {
      if (event.mute) {
        await DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).muteNotification(
          targetId: targetChat.id,
          targetType: targetChat.chatType == 'channel' ? 'channel' : 'user',
          duration: event.duration,
        );
      } else {
        await DashboardApi(
          serviceLocator<ApiManager>(),
          serviceLocator<AuthBloc>(),
        ).unmuteNotification(
          targetId: targetChat.id,
          targetType: targetChat.chatType == 'channel' ? 'channel' : 'user',
        );
      }
    } catch (e) {
      log('❌ Mute/Unmute API failed, reverting optimistic update: $e');
      emit(
        currentState.copyWith(
          chats: currentState.chats,
          filteredChats: currentState.filteredChats,
        ),
      );
    }
  }

  void _onMarkReadChat(MarkReadChat event, Emitter<DashboardState> emit) {
    if (state is ChatLoaded) {
      final s = state as ChatLoaded;
      final updated = s.chats.map((c) {
        if (c.id == event.chatId && c.chatType == event.chatType) {
          return c.copyWith(unreadCount: 0);
        }
        return c;
      }).toList();
      emit(
        s.copyWith(
          chats: updated,
          filteredChats: _filterChats(updated, s.searchQuery),
        ),
      );
    }
  }

  void _onUpdateUnread(UpdateUnreadCount event, Emitter<DashboardState> emit) {
    if (state is ChatLoaded) {
      final s = state as ChatLoaded;
      final updated = s.chats.map((c) {
        if (c.id == event.chatId) {
          return c.copyWith(unreadCount: event.reset ? 0 : event.count);
        }
        return c;
      }).toList();
      emit(
        s.copyWith(
          chats: updated,
          filteredChats: _filterChats(updated, s.searchQuery),
        ),
      );
    }
  }

  List<MessageModel> _filterChats(List<MessageModel> chats, String query) {
    if (query.isEmpty) return chats;
    return chats
        .where((chat) => chat.name.toLowerCase().contains(query.toLowerCase()))
        .toList();
  }

  Future<void> _onLoadChats(
    LoadChats event,
    Emitter<DashboardState> emit,
  ) async {
    if (event.showLoader) emit(ChatLoading());

    try {
      log("🔄 Loading chats from API...");
      final allChats = await getChatsUseCase();
      _lastLoadTime = DateTime.now();

      log("✅ Loaded ${allChats.length} chats");

      // 🔹 Decrypt last messages if needed
      final decryptedChats = await Future.wait(
        allChats.map((chat) async {
          final bool isActuallyEncrypted =
              chat.isEncrypted ||
              (chat.lastMessage?.startsWith('U2FsdGVkX18') == true);

          if (isActuallyEncrypted && chat.lastMessage != null) {
            final lastMsg = chat.unreadMessages.isNotEmpty
                ? chat.unreadMessages.first
                : null;

            String? sIdStr = lastMsg?.senderId;

            // Fallbacks for missing senderId
            if (sIdStr == null || sIdStr == '0' || sIdStr == 'null') {
              if (chat.isDM) {
                sIdStr = chat.recipientId;
              }
            }
            final sId = int.tryParse(sIdStr ?? '');
            log(
              "🔍 Dashboard: Decrypting ${chat.name}, senderId: $sId, lastMsgSenderId: ${lastMsg?.senderId}",
            );

            if (sId != null && sId != 0) {
              String? aesKey = _senderAESKeys[sId];
              if (aesKey == null) {
                final chatApi = serviceLocator<ChatApi>();
                final pubKey = await chatApi.getPublicKey(sId.toString());
                if (pubKey != null) {
                  aesKey = _encryptionService.deriveAESKey(pubKey);
                  _senderAESKeys[sId] = aesKey;
                }
              }

              if (aesKey != null) {
                final decrypted = _encryptionService.decryptMessage(
                  chat.lastMessage!,
                  aesKey,
                );
                log(
                  "🔓 Dashboard: Decrypted last message for ${chat.name}: $decrypted",
                );
                return chat.copyWith(lastMessage: decrypted);
              } else {
                log(
                  "⚠️ Dashboard: Missing AES key for ${chat.name} (sId: $sId)",
                );
              }
            } else {
              log(
                "⚠️ Dashboard: Could not determine valid sender ID for ${chat.name}",
              );
            }
          }
          return chat;
        }),
      );

      emit(
        ChatLoaded(
          chats: decryptedChats,
          filteredChats: decryptedChats,
          searchQuery: '',
          selectedChatId: null,
          selectedChatType: null,
        ),
      );

      // flush any pending channel payloads
      _flushPendingChannels();
    } catch (e, s) {
      log("❌ Failed to load chats: $e///$s");
      if (e.toString().contains("Session expired"))
        serviceLocator<AuthBloc>().add(LogoutPressed());
      emit(ChatError('Failed to load chats: ${e.toString()}'));
    }
  }

  Future<void> _onRefreshChats(
    RefreshChats event,
    Emitter<DashboardState> emit,
  ) async {
    add(LoadChats(showLoader: false));
  }

  Future<void> _onChangePassword(
    ChangePassword event,
    Emitter<DashboardState> emit,
  ) async {
    try {
      emit(PasswordChangeLoading());

      // Validate passwords match
      if (event.newPassword != event.confirmPassword) {
        emit(
          PasswordChangeError(
            'Confirm password must be same as new password',
            visibilityMap: state.visibilityMap,
          ),
        );
        return;
      }

      // Validate password length
      if (event.newPassword.length < 6) {
        emit(PasswordChangeError('Password must be at least 6 characters'));
        return;
      }

      // Call API to change password
      final response = await dashboardApi?.changePassword(
        currentPassword: event.currentPassword,
        newPassword: event.newPassword,
      );
      log(" response is ----->, $response");
      
      emit(
        PasswordChangeSuccess(
          response?['message'] ?? 'Password changed successfully',
        ),
      );
    } catch (e) {
      log('❌ Error changing password: $e');
      emit(
        PasswordChangeError(
          'An error occurred: $e',
          visibilityMap: state.visibilityMap,
        ),
      );
    }
  }

  void _onTogglePasswordVisibility(
    ToggleDashboardPasswordVisibility event,
    Emitter<DashboardState> emit,
  ) {
    final currentMap = Map<String, bool>.from(state.visibilityMap);
    final currentVisibility = currentMap[event.fieldKey] ?? false;
    currentMap[event.fieldKey] = !currentVisibility;

    if (state is ChatLoaded) {
      emit((state as ChatLoaded).copyWith(visibilityMap: currentMap));
    } else if (state is PasswordChangeLoading) {
      emit(PasswordChangeLoading(visibilityMap: currentMap));
    } else if (state is PasswordChangeSuccess) {
      emit(
        PasswordChangeSuccess(
          (state as PasswordChangeSuccess).message,
          visibilityMap: currentMap,
        ),
      );
    } else if (state is PasswordChangeError) {
      emit(
        PasswordChangeError(
          (state as PasswordChangeError).error,
          visibilityMap: currentMap,
        ),
      );
    } else {
      emit(DashboardPasswordVisibilityToggled(currentMap));
    }
  }

  @override
  Future<void> close() {
    _cleanupSocketListeners();
    _connectionSubscription?.cancel();
    return super.close();
  }

  void _cleanupSocketListeners() {
    try {
      _unsubscribeReceiveMessage?.call();
      _unsubscribeMessagesRead?.call();
      _unsubscribeChatPin?.call();
      _unsubscribeChatPin = null;
      _unsubscribeChatMuted?.call();
      _unsubscribeChatMuted = null;
      _unsubscribeChannelCreated?.call();
      _unsubscribeChannelCreated = null;

      _unsubscribeNewChannel?.call();
      _unsubscribeNewChannel = null;

      _unsubscribeChatUnmuted?.call();
      _unsubscribeChatUnmuted = null;

      _unsubscribeReceiveMessage = null;
      _unsubscribeMessagesRead = null;
    } catch (e) {
      log('Error during cleanup: $e');
    }
    _socketListenersSetup = false;
  }
}
