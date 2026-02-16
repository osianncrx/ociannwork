import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:flutter/scheduler.dart';
import 'package:logger/logger.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:teamwise/features/chat/presentation/widgets/WebRTCCallService.dart';

import '../../config.dart';
import '../../core/network/api_manger.dart';
import '../../core/network/app_constants.dart';
import '../dashboard/data/datasources/dashboard_api.dart';

// Socket Events Constants - Match with Backend
class SocketEvents {
  // Channel Updates
  static const String channelUpdates = 'channel-updates';

  // Listeners (Events we listen to)
  static const String bulkStatusUpdate = 'bulk-user-status-update';
  static const String userStatusUpdate = 'user-status-update';
  static const String receiveMessage = 'receive-message'; // MAIN EVENT
  static const String channelAdded = 'channel-added';
  static const String newChannel = 'new-channel';
  static const String membersAdded = 'members-added';
  static const String messageStatusUpdated = 'message-status-updated';
  static const String messageDeleted = 'message-deleted';
  static const String messagePin = 'message-pin';
  static const String messageUpdated = 'message-updated';
  static const String messageReactionUpdated = 'message-reaction-updated';
  static const String messageFavorite = 'message-favorite';
  static const String typing = 'typing';
  static const String messagesRead = 'messages-read';
  static const String memberAddedToChannel = "member-added-to-channel";
  static const String memberRoleUpdated = "member-role-updated";
  static const String memberRemovedFromChannel = "member-removed-from-channel";
  static const String memberLeftChannel = "member-left-channel";
  static const String channelLeft = "channel-left";

  // Call events
  static const String incomingCall = 'incoming-call';
  static const String callAccepted = 'call-accepted';
  static const String callDeclined = 'call-declined';
  static const String callEnded = 'call-ended';
  static const String callBusy = 'call-busy';
  static const String initiateCall = 'initiate-call';
  static const String iceCandidate = 'ice-candidate';

  // Emitters (Events we send)
  static const String messageDelivered = 'message-delivered';
  static const String messageSeen = 'message-seen';
  static const String joinRoom = 'join-room';
  static const String joinChannel = 'join-channel';
  static const String sendMessage = 'send-message';
  static const String channelCreated = 'channel-created';
  static const String setOnline = 'set-online';
  static const String setAway = 'set-away';
  static const String addReaction = 'add-reaction';
  static const String removeReaction = 'remove-reaction';
  static const String markMessagesRead = 'mark-messages-read';
  static const String chatPinUpdate = 'chat-pin-updated';
  static const String chatUnmuted = 'chat-unmuted';
  static const String chatMuted = 'chat-muted';
}

// Singleton SocketService with reference counting
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? socket;
  final Logger logger = Logger();
  static const String serverUrl = 'http://${AppConstants.serverUrl}:3000';

  bool _isInitialized = false;
  String? _currentToken;
  String? _currentTeamId;
  String? _currentUserId;
  String? _currentUserName;

  // Reference counting for active connections
  int _activeConnections = 0;
  ValueNotifier<Set<String>> onlineUsers = ValueNotifier({});

  // Event callbacks management
  final Map<String, List<Function(Map<String, dynamic>)>> _eventCallbacks = {};
  // SocketService class માં ઉમેરો
  void initiateCall(Map<String, dynamic> callData) {
    if (!isConnected) {
      log('Cannot initiate call: socket not connected');
      return;
    }

    try {
      socket!.emit('initiate-call', callData);
      logger.d('Call initiated: $callData');
    } catch (e) {
      log('Error initiating call: $e');
    }
  }

  // call this to register a global inspector
  void onAny(void Function(String event, dynamic data) callback) {
    // If using socket_io_client: socket.onAny((ev, args) => callback(ev, args));
    try {
      socket?.onAny((event, args) => callback(event, args));
    } catch (e) {
      log('onAny registration error: $e');
    }
  }

  // Accept call method
  void acceptCall(Map<String, dynamic> acceptData) {
    if (!isConnected) {
      log('Cannot accept call: socket not connected');
      return;
    }

    try {
      socket!.emit('accept-call', acceptData);
      logger.d('Call accepted: $acceptData');
    } catch (e) {
      log('Error accepting call: $e');
    }
  }

  // Decline call method
  void declineCall(Map<String, dynamic> declineData) {
    if (!isConnected) {
      log('Cannot decline call: socket not connected');
      return;
    }

    try {
      socket!.emit('decline-call', declineData);
      logger.d('Call declined: $declineData');
    } catch (e) {
      log('Error declining call: $e');
    }
  }

  // End call method
  void endCall(Map<String, dynamic> endData) {
    if (!isConnected) {
      log('Cannot end call: socket not connected');
      return;
    }

    try {
      socket!.emit('end-call', endData);
      logger.d('Call ended: $endData');
    } catch (e) {
      log('Error ending call: $e');
    }
  }

  // WebRTC signaling methods
  void sendWebRTCOffer(Map<String, dynamic> offerData) {
    if (!isConnected) return;

    try {
      socket!.emit('webrtc-offer', offerData);
      logger.d('WebRTC offer sent: $offerData');
    } catch (e) {
      log('Error sending WebRTC offer: $e');
    }
  }

  void sendWebRTCAnswer(Map<String, dynamic> answerData) {
    if (!isConnected) return;

    try {
      socket!.emit('webrtc-answer', answerData);
      logger.d('WebRTC answer sent: $answerData');
    } catch (e) {
      log('Error sending WebRTC answer: $e');
    }
  }

  void sendIceCandidate(Map<String, dynamic> candidateData) {
    if (!isConnected) return;

    try {
      socket!.emit('ice-candidate', candidateData);
      logger.d('ICE candidate sent: $candidateData');
    } catch (e) {
      log('Error sending ICE candidate: $e');
    }
  }

  // Audio/Video toggle methods
  void toggleAudio(String callId, bool isAudioEnabled) {
    if (!isConnected) return;

    try {
      socket!.emit('toggle-audio', {
        'callId': callId,
        'isAudioEnabled': isAudioEnabled,
      });
      log('Audio toggled: $isAudioEnabled for call $callId');
    } catch (e) {
      log('Error toggling audio: $e');
    }
  }

  void toggleVideo(String callId, bool isVideoEnabled) {
    if (!isConnected) return;

    try {
      socket!.emit('toggle-video', {
        'callId': callId,
        'isVideoEnabled': isVideoEnabled,
      });
      log('Video toggled: $isVideoEnabled for call $callId');
    } catch (e) {
      log('Error toggling video: $e');
    }
  }

  // Add this method to SocketService
  void requestOnlineUsers() {
    if (!isConnected) {
      log('Cannot request online users: socket not connected');
      return;
    }

    try {
      // Emit an event to request online users
      socket!.emit('online');
      log('📡 Requested online users from server');
    } catch (e) {
      log('❌ Error requesting online users: $e');
    }
  }

  Future<void> initializeSocket(
    String token,
    String teamId,
    String userId,
    String userName,
  ) async {
    int retryCount = 0;
    const maxRetries = 5;

    try {
      // Increment active connections
      _activeConnections++;
      log('Active connections: $_activeConnections');
      requestOnlineUsers();
      // Don't reconnect if already connected with same credentials
      if (_isInitialized &&
          _currentToken == token &&
          _currentTeamId == teamId &&
          _currentUserId == userId &&
          _currentUserName == userName &&
          socket?.connected == true) {
        log('Socket already connected with same credentials');
        return;
      }

      // Store current credentials
      _currentToken = token;
      _currentTeamId = teamId;
      _currentUserId = userId; // Direct assignment from parameter

      // Disconnect existing socket if any (only if different credentials)
      if (_isInitialized ||
          (_currentToken != token || _currentTeamId != teamId)) {
        await _forceDisconnect();
      }

      log('Initializing socket connection...');

      socket = IO.io(
        serverUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionAttempts(5)
            .setQuery({'token': token, 'teamId': teamId, 'EIO': '4'})
            .build(),
      );

      // Set up event listeners
      _setupEventListeners();
      WebRTCCallService().initialize();
      // Connect
      socket!.connect();

      _isInitialized = true;
      log('Socket initialization completed');
    } catch (e) {
      if (retryCount < maxRetries) {
        retryCount++;
        final delay = Duration(seconds: 2);
        print('Retrying connection in ${delay.inSeconds} seconds...');
        await Future.delayed(delay);
      } else {
        log('Socket initialization error: $e');
      }
      _activeConnections--; // Decrement on error
      _isInitialized = false;
      rethrow;
    }
  }

  void _setupEventListeners() {
    socket!.onConnect((_) async {
      log('Socket Connected Successfully!');
      logger.i('Socket connected to server');
      _connectionController.add(true);

      // ✅ IMPORTANT: Set user online IMMEDIATELY on connection
      setOnline();
      log('✅ User set to online on connection');

      // Join user room after connection
      if (_currentUserId != null) {
        _joinUserRoom(_currentUserId!);
        log('✅ Joined room for user: $_currentUserId');
      } else {
        log(
          'Warning: _currentUserId is null, manual setCurrentUserId call needed',
        );
      }

      // Request online users list after setting self online
      requestOnlineUsers();

      // IMPORTANT: Initialize WebRTC after socket connects
      try {
        WebRTCCallService().initialize();
        log('✅ WebRTCCallService initialized after socket connection');
      } catch (e) {
        log('❌ Error initializing WebRTCCallService: $e');
      }
    });

    socket!.onDisconnect((reason) {
      log('Socket Disconnected: $reason');
      logger.w('Socket disconnected: $reason');
      _connectionController.add(false);

      if (_currentUserId != null) {
        SchedulerBinding.instance.addPostFrameCallback((_) {
          final updated = Set<String>.from(onlineUsers.value);
          updated.remove(_currentUserId);
          SchedulerBinding.instance.addPostFrameCallback((_) {
            onlineUsers.value = updated;
          });
          log(
            'Removed current user $_currentUserId from online users on disconnect',
          );
        });
      }

      _isInitialized = false;
    });

    socket!.onError((error) {
      log('Socket Error: $error');
      logger.e('Socket error: $error');
    });

    socket!.onReconnect((attempt) {
      log('Socket Reconnected (attempt: $attempt)');
      logger.i('Socket reconnected on attempt: $attempt');
      _isInitialized = true;

      // IMPORTANT: Rejoin ALL rooms on reconnect
      if (_currentUserId != null) {
        _joinUserRoom(_currentUserId!);

        socket!.emit('rejoin-all-rooms', {
          'userId': _currentUserId,
          'timestamp': DateTime.now().toIso8601String(),
        });
        log('✅ Rejoined all rooms after reconnection');
      }

      setOnline();
      log('User automatically set to online on reconnection');
    });

    socket!.onReconnectError((error) {
      log('Socket Reconnection Error: $error');
      logger.e('Socket reconnection error: $error');
    });
    // Setup all socket event listeners (call events forwarded via onSocketEvent registrations)
    _setupMessageListeners();
    _setupStatusListeners();
    _setupChannelListeners();

    // Listen for any event (debugging purpose)
    socket!.onAny((event, data) {
      log('ANY EVENT: $event with data: $data');
    });

    debugCallEvents();
  }
  /*
  void _setupEventListeners() {
    socket!.onConnect((_) async {
      log('Socket Connected Successfully!');
      logger.i('Socket connected to server');
      _connectionController.add(true); // <-- notify listeners

      // Join user room after connection
      if (_currentUserId != null) {
        _joinUserRoom(_currentUserId!);
      } else {
        // અગર userId નથી મળતો token માંથી, તો manual join કરવાનું છે
        log(
          'Warning: _currentUserId is null, manual setCurrentUserId call needed',
        );
      }

      requestOnlineUsers();

    });

    socket!.onDisconnect((reason) {
      log('Socket Disconnected: $reason');
      logger.w('Socket disconnected: $reason');
      _connectionController.add(false);

      // અત્યારના યુઝરને local online users list માંથી remove કરો
      if (_currentUserId != null) {
        // Use SchedulerBinding to avoid setState during build
        SchedulerBinding.instance.addPostFrameCallback((_) {
          final updated = Set<String>.from(onlineUsers.value);
          updated.remove(_currentUserId??'');
          SchedulerBinding.instance.addPostFrameCallback((_) {
            onlineUsers.value = updated;
          });          log('Removed current user $_currentUserId from online users on disconnect');
        });
      }

      _isInitialized = false;
    });
    socket!.onError((error) {
      log('Socket Error: $error');
      logger.e('Socket error: $error');
    });

    socket!.onReconnect((attempt) {
      log('Socket Reconnected (attempt: $attempt)');
      logger.i('Socket reconnected on attempt: $attempt');
      _isInitialized = true;

      // Rejoin room on reconnect
      if (_currentUserId != null) {
        _joinUserRoom(_currentUserId!);
      }

      // રિકનેક્ટ થાય ત્યારે પણ ઓનલાઇન સેટ કરો
      setOnline();
      log('User automatically set to online on reconnection');
    });

    socket!.onReconnectError((error) {
      log('Socket Reconnection Error: $error');
      logger.e('Socket reconnection error: $error');
    });

    // Setup all socket event listeners
    _setupMessageListeners();
    _setupStatusListeners();
    _setupChannelListeners();_setupCallListeners();

    // Listen for any event (debugging purpose)
    socket!.onAny((event, data) {
      log('ANY EVENT: $event with data: $data');
    });
    debugCallEvents();
  }
*/

  void debugCallEvents() {
    log('=== SOCKET CALL EVENT DEBUG ===');
    log('Socket connected: ${isConnected}');
    log('Call events registered:');
    log('  - ${SocketEvents.incomingCall}');
    log('  - ${SocketEvents.callAccepted}');
    log('  - ${SocketEvents.callDeclined}');
    log('  - ${SocketEvents.callEnded}');
    log('  - ${SocketEvents.callBusy}');
    log('  - ${SocketEvents.initiateCall}');
    log('==============================');
  }

  void _setupCallListeners() {
    socket!.on('incoming-call', (data) {
      log('[incoming-call] Incoming call: $data');
      log('Call data structure:');
      logger.d('incoming-call: $data');
      data.forEach((key, value) {
        log('  $key: $value (${value.runtimeType})');
      });
      _notifyEventCallbacks('incoming-call', data);
    });

    socket!.on('call-accepted', (data) {
      log('[call-accepted] Call accepted: $data');
      logger.d('Call accepted: $data');
      _notifyEventCallbacks('call-accepted', data);
    });

    socket!.on('call-declined', (data) {
      logger.d('call-declined : $data');
      log('[call-declined] Call declined: $data');
      _notifyEventCallbacks('call-declined', data);
    });

    socket!.on('call-ended', (data) {
      logger.d('[call-ended] Call ended: $data');
      _notifyEventCallbacks('call-ended', data);
    });

    socket!.on('call-busy', (data) {
      logger.d('[call-busy] Call busy: $data');
      _notifyEventCallbacks('call-busy', data);
    });

    // WebRTC specific events
    socket!.on('webrtc-offer', (data) {
      logger.d('[webrtc-offer] WebRTC offer: $data');
      _notifyEventCallbacks('webrtc-offer', data);
    });

    socket!.on('webrtc-answer', (data) {
      logger.d('[webrtc-answer] WebRTC answer: $data');
      _notifyEventCallbacks('webrtc-answer', data);
    });

    socket!.on('ice-candidate', (data) {
      logger.d('[ice-candidate] ICE candidate: $data');
      _notifyEventCallbacks('ice-candidate', data);
    });

    // Additional call events from your backend
    socket!.on('participant-left', (data) {
      logger.d('[participant-left] Participant left: $data');
      _notifyEventCallbacks('participant-left', data);
    });

    socket!.on('call-participants-sync', (data) {
      logger.d('[call-participants-sync] Participants sync: $data');
      _notifyEventCallbacks('call-participants-sync', data);
    });

    socket!.on('participant-toggle-audio', (data) {
      logger.d('[participant-toggle-audio] Audio toggled: $data');
      _notifyEventCallbacks('participant-toggle-audio', data);
    });

    socket!.on('participant-toggle-video', (data) {
      logger.d('[participant-toggle-video] Video toggled: $data');
      _notifyEventCallbacks('participant-toggle-video', data);
    });
  }

  void _setupMessageListeners() {
    socket!.on(SocketEvents.addReaction, (data) {
      log('[reaction-added] Reaction added: $data');
      _notifyEventCallbacks(SocketEvents.addReaction, data);
    });

    socket!.on(SocketEvents.removeReaction, (data) {
      log('[reaction-removed] Reaction removed: $data');
      _notifyEventCallbacks(SocketEvents.removeReaction, data);
    });
    socket!.on(SocketEvents.receiveMessage, (data) {
      log('[SOCKET DEBUG] Raw message data: $data');
      log('[SOCKET DEBUG] Data type: ${data.runtimeType}');
      log(
        '[SOCKET DEBUG] Keys: ${data is Map ? data.keys.toList() : 'Not a map'}',
      );
      // Check if this is a call-type message
      final messageType = data['message_type']?.toString();
      if (messageType == 'call') {
        log('📞 Detected call message, processing...');
        _handleCallMessage(data);
        return; // Don't process as regular message
      }
      // Your existing code
      DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).fetchChats();
      _notifyEventCallbacks(SocketEvents.receiveMessage, data);
    });

    // Message status updates
    socket!.on(SocketEvents.messageStatusUpdated, (data) {
      log('[${SocketEvents.messageStatusUpdated}] Status updated: $data');
      _notifyEventCallbacks(SocketEvents.messageStatusUpdated, data);
    });

    // Message deleted
    socket!.on(SocketEvents.messageDeleted, (data) {
      log('[${SocketEvents.messageDeleted}] Message deleted: $data');
      _notifyEventCallbacks(SocketEvents.messageDeleted, data);
    });

    // Message updated
    socket!.on(SocketEvents.messageUpdated, (data) {
      log('[${SocketEvents.messageUpdated}] Message updated: $data');
      _notifyEventCallbacks(SocketEvents.messageUpdated, data);
    });

    // Message reaction updated
    socket!.on(SocketEvents.messageReactionUpdated, (data) {
      log('[${SocketEvents.messageReactionUpdated}] Reaction updated: $data');
      _notifyEventCallbacks(SocketEvents.messageReactionUpdated, data);
    });

    // Message favorite
    socket!.on(SocketEvents.messageFavorite, (data) {
      log('[${SocketEvents.messageFavorite}] Message favorite: $data');
      _notifyEventCallbacks(SocketEvents.messageFavorite, data);
    });

    // Message pin
    socket!.on(SocketEvents.messagePin, (data) {
      log('[${SocketEvents.messagePin}] Message pin: $data');
      _notifyEventCallbacks(SocketEvents.messagePin, data);
    });

    socket!.on(SocketEvents.typing, handleIncomingTyping);

    // Messages read
    socket!.on(SocketEvents.messagesRead, (data) {
      log('[${SocketEvents.messagesRead}] Messages read: $data');
      _notifyEventCallbacks(SocketEvents.messagesRead, data);
    });
  }

  // Add a StreamController to broadcast connection changes
  final _connectionController = StreamController<bool>.broadcast();
  Stream<bool> get connectionStream => _connectionController.stream;
  // NEW METHOD: Handle call messages and convert to incoming-call events
  void _handleCallMessage(Map<String, dynamic> data) {
    log('📞 Processing call message: $data');

    final metadata = data['metadata'] as Map<String, dynamic>?;
    if (metadata == null) {
      log('❌ No metadata in call message');
      return;
    }

    final callId = metadata['call_id']?.toString();
    final callKind = metadata['call_kind']?.toString(); // 'audio' or 'video'
    final callStatus = metadata['call_status']
        ?.toString(); // 'calling', 'accepted', etc.
    final senderId = data['sender_id']?.toString();
    final senderName = data['sender']?['name']?.toString() ?? 'Unknown';

    if (callId == null || callKind == null || senderId == null) {
      log(
        '❌ Invalid call message data - callId: $callId, callKind: $callKind, senderId: $senderId',
      );
      return;
    }

    log(
      '📞 Call details - ID: $callId, Kind: $callKind, Status: $callStatus, From: $senderId',
    );

    // Only process "calling" status for incoming calls from other users
    if (callStatus == 'calling' && senderId != currentUserId) {
      log('📞 Converting call message to incoming-call event');

      final hasChannel = data['channel_id'] != null;
      final chatType = hasChannel
          ? 'channel'
          : ((data['chat_type'] ?? data['chatType'] ?? data['chat_kind'])
                    ?.toString() ??
                'dm');
      final chatId =
          (data['channel_id'] ?? data['chat_id'] ?? data['chatId'])
              ?.toString() ??
          senderId;
      final incomingCallData = {
        'callId': callId,
        'callType': callKind,
        'chatType': chatType,
        'chatName': senderName,
        'chatId': chatId,
        'initiator': {
          'userId': senderId,
          'name': senderName,
          'avatar': data['sender']?['avatar'],
          'isAudioEnabled': true,
          'isVideoEnabled': callKind == 'video',
        },
        'timestamp': data['created_at'] ?? DateTime.now().toIso8601String(),
        'originalMessage': data,
        'metadata': metadata,
      };

      log('📞 Emitting converted incoming-call event: $incomingCallData');

      // Emit as incoming-call event to trigger WebRTCCallService
      _notifyEventCallbacks('incoming-call', incomingCallData);

      // Also emit the direct socket event in case any component listens to it
      socket?.emit('incoming-call-processed', incomingCallData);
    } else if (callStatus == 'calling' && senderId == currentUserId) {
      log('📞 Ignoring call message from self');
    } else {
      log('📞 Call status "$callStatus" not processed (not incoming call)');
    }
  }

  void _setupStatusListeners() {
    log('========================================');
    log('📡 Setting up Status Listeners');
    log('========================================');

    // 1️⃣ User Status Updates (આ already કામ કરે છે)
    socket!.on(SocketEvents.userStatusUpdate, (data) {
      log('👤 [user-status-update] $data');
      _updateOnlineUsers(data);
      _notifyEventCallbacks(SocketEvents.userStatusUpdate, data);
    });

    socket!.on(SocketEvents.bulkStatusUpdate, (data) {
      log('👥 [bulk-status-update] $data');
      if (data is List) {
        final online = <String>{};
        for (var user in data) {
          if (user['status'] == 'online') {
            online.add(user['userId'].toString());
          }
        }
        onlineUsers.value = online;
      }
      _notifyEventCallbacks(SocketEvents.bulkStatusUpdate, data);
    });

    // 2️⃣ Chat Pin Update - Multiple event name attempts
    final pinEventNames = [
      'chat-pin-updated', // Standard
      'chat-pin-update', // Alternative
      'pin-chat-updated', // Alternative
      'chat:pin:updated', // Colon format
    ];

    for (var eventName in pinEventNames) {
      socket!.on(eventName, (data) {
        log('🔔🔔🔔 [$eventName] RECEIVED! 🔔🔔🔔');
        log('   Raw Data: $data');
        log('   Data Type: ${data.runtimeType}');

        try {
          Map<String, dynamic> normalized = _normalizePayload(data);
          log('   Normalized: $normalized');

          // Forward to DashboardBloc
          _notifyEventCallbacks(SocketEvents.chatPinUpdate, normalized);
          log('   ✅ Forwarded to callbacks');
        } catch (e, s) {
          log('   ❌ Error: $e\n$s');
        }
      });
      log('✅ Registered listener: $eventName');
    }

    // 3️⃣ Chat Muted - Multiple event name attempts
    final muteEventNames = [
      'chat-muted',
      'chat-mute',
      'mute-chat',
      'chat:muted',
    ];

    for (var eventName in muteEventNames) {
      socket!.on(eventName, (data) {
        log('🔕🔕🔕 [$eventName] RECEIVED! 🔕🔕🔕');
        log('   Raw Data: $data');

        try {
          Map<String, dynamic> normalized = _normalizePayload(data);
          log('   Normalized: $normalized');
          _notifyEventCallbacks(SocketEvents.chatMuted, normalized);
          log('   ✅ Forwarded to callbacks');
        } catch (e, s) {
          log('   ❌ Error: $e\n$s');
        }
      });
      log('✅ Registered listener: $eventName');

      socket!.on(SocketEvents.userStatusUpdate, (data) {
        // log('[${SocketEvents.userStatusUpdate}] User status: $data');
        _updateOnlineUsers(data);
        _notifyEventCallbacks(SocketEvents.userStatusUpdate, data);
      });

      socket!.on(SocketEvents.bulkStatusUpdate, (data) {
        log('[${SocketEvents.bulkStatusUpdate}] Bulk status: $data');
        if (data is List) {
          final online = <String>{};
          for (var user in data) {
            if (user['status'] == 'online') {
              online.add(user['userId'].toString());
            }
          }
          onlineUsers.value = online;
        }
        _notifyEventCallbacks(SocketEvents.bulkStatusUpdate, data);
      });
    }
  }

  void deleteMessage(
    String messageId, {
    String? recipientId,
    String? channelId,
  }) {
    if (!isConnected) {
      log('Cannot delete message: socket not connected');
      return;
    }

    try {
      final deleteData = {
        'messageId': messageId,
        'id': messageId, // Some backends expect 'id'
        'userId': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'deletedBy': currentUserId,
      };

      if (channelId != null) {
        deleteData['channelId'] = channelId;
        deleteData['type'] = 'channel';
      } else if (recipientId != null) {
        deleteData['recipientId'] = recipientId;
        deleteData['type'] = 'dm';
      }

      socket!.emit(SocketEvents.messageDeleted, deleteData);
      log('Message delete event emitted: $deleteData');
    } catch (e) {
      log('Error emitting message delete: $e');
    }
  }

  void _updateOnlineUsers(Map<String, dynamic> data) {
    final userId = data['userId']?.toString();
    final status = data['status']?.toString();
    if (userId == null || status == null) return;

    final updated = Set<String>.from(onlineUsers.value);
    if (status == 'online') {
      updated.add(userId);
    } else {
      updated.remove(userId);
    }
    SchedulerBinding.instance.addPostFrameCallback((_) {
      onlineUsers.value = updated;
    });
  }

  bool isUserOnline(String userId) => onlineUsers.value.contains(userId);

  void _setupChannelListeners() {
    socket!.on(SocketEvents.channelAdded, (data) {
      log('[${SocketEvents.channelAdded}] Channel added: $data');
      _notifyEventCallbacks(SocketEvents.channelAdded, data);
    });

    socket!.on(SocketEvents.newChannel, (data) {
      log('[${SocketEvents.newChannel}] New channel: $data');
      _notifyEventCallbacks(SocketEvents.newChannel, data);
    });

    socket!.on(SocketEvents.membersAdded, (data) {
      log('[${SocketEvents.membersAdded}] Members added: $data');
      _notifyEventCallbacks(SocketEvents.membersAdded, data);
    });

    socket!.on(SocketEvents.memberAddedToChannel, (data) {
      log('[${SocketEvents.memberAddedToChannel}] Member added: $data');
      log("member added event call block");
      _notifyEventCallbacks(SocketEvents.memberAddedToChannel, data);
    });

    socket!.on(SocketEvents.memberRoleUpdated, (data) {
      log('[${SocketEvents.memberRoleUpdated}] Member role updated: $data');
      log("member role update event call block");
      _notifyEventCallbacks(SocketEvents.memberRoleUpdated, data);
    });

    socket!.on(SocketEvents.memberRemovedFromChannel, (data) {
      log('[${SocketEvents.memberRemovedFromChannel}] Member removed: $data');
      log("member removed from channel event call block");
      _notifyEventCallbacks(SocketEvents.memberRemovedFromChannel, data);
    });

    socket!.on(SocketEvents.memberLeftChannel, (data) {
      log('[${SocketEvents.memberLeftChannel}] Member left: $data');

      _notifyEventCallbacks(SocketEvents.memberLeftChannel, data);
    });

    socket!.on(SocketEvents.channelLeft, (data) {
      log('[${SocketEvents.channelLeft}] Channel left: $data');
      _notifyEventCallbacks(SocketEvents.channelLeft, data);
    });
  }

  /*void _setupCallListeners() {
    socket!.on(SocketEvents.incomingCall, (data) {
      log('[${SocketEvents.incomingCall}] Incoming call: $data');
      _notifyEventCallbacks(SocketEvents.incomingCall, data);
    });

    socket!.on(SocketEvents.callAccepted, (data) {
      log('[${SocketEvents.callAccepted}] Call accepted: $data');
      _notifyEventCallbacks(SocketEvents.callAccepted, data);
    });

    socket!.on(SocketEvents.callDeclined, (data) {
      log('[${SocketEvents.callDeclined}] Call declined: $data');
      _notifyEventCallbacks(SocketEvents.callDeclined, data);
    });

    socket!.on(SocketEvents.callEnded, (data) {
      log('[${SocketEvents.callEnded}] Call ended: $data');
      _notifyEventCallbacks(SocketEvents.callEnded, data);
    });

    socket!.on(SocketEvents.callBusy, (data) {
      log('[${SocketEvents.callBusy}] Call busy: $data');
      _notifyEventCallbacks(SocketEvents.callBusy, data);
    });
  }*/

  Map<String, dynamic> _normalizePayload(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    } else if (data is Map) {
      return Map<String, dynamic>.from(data);
    } else if (data is String) {
      try {
        final decoded = json.decode(data);
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (_) {}
    }

    // Fallback
    return {'_raw': data};
  }

  void _notifyEventCallbacks(String eventName, dynamic data) {
    try {
      Map<String, dynamic> eventData;

      // Convert data to Map<String, dynamic>
      if (data is Map<String, dynamic>) {
        eventData = data;
      }
      if (data is Map<String, dynamic>) {
        eventData = data;
      } else if (data is List) {
        // pass the whole list as a field
        eventData = {'_list': data};
      } else if (data is String) {
        try {
          final decoded = json.decode(data);
          if (decoded is Map<String, dynamic>) {
            eventData = decoded;
          } else {
            eventData = {'_raw': decoded};
          }
        } catch (e) {
          eventData = {'_raw': data};
        }
      } else {
        eventData = {'_raw': data};
      }

      // Add event type
      eventData['eventType'] = eventName;

      // Notify all callbacks for this event
      final callbacks = _eventCallbacks[eventName];
      if (callbacks != null) {
        for (var callback in callbacks) {
          try {
            // log("eventData::$eventData");
            callback(eventData);
          } catch (e, s) {
            log('Error in event callback for $eventName: $e $s');
          }
        }
      }
    } catch (e) {
      log('Error processing event $eventName: $e');
    }
  }

  // ✅ Test method to verify socket listeners
  void testSocketListeners() {
    log('=== TESTING SOCKET LISTENERS ===');
    log('Registered events: ${_eventCallbacks.keys.toList()}');

    _eventCallbacks.forEach((event, callbacks) {
      log('Event: $event -> ${callbacks.length} callback(s)');
    });

    log('Socket connected: ${isConnected}');
    log('================================');
  }

  // Join user room for receiving messages
  void _joinUserRoom(String userId) {
    log("_currentTeamId::$_currentTeamId//$userId");
    if (isConnected) {
      // Backend expects just userId, not an object with teamId
      socket!.emit(SocketEvents.joinRoom, userId);
      log('Joined room for user: $userId');
    } else {
      log('Cannot join room: socket not connected');
    }
  }

  Function()? onSocketEvent(
    String eventName,
    Function(Map<String, dynamic>) callback,
  ) {
    if (!_eventCallbacks.containsKey(eventName)) {
      _eventCallbacks[eventName] = [];
      // If socket exists, ensure we have a socket-level listener forwarding to _notifyEventCallbacks
      try {
        socket?.on(eventName, (data) {
          log('Socket-level forwarder for [$eventName] received: $data');
          _notifyEventCallbacks(eventName, data);
        });
      } catch (e) {
        log('Failed to attach socket.on for $eventName: $e');
      }
    }

    _eventCallbacks[eventName]!.add(callback);
    log(
      'Callback registered for event: $eventName. Total callbacks: ${_eventCallbacks[eventName]!.length}',
    );

    // Return unsubscribe function
    return () {
      _eventCallbacks[eventName]?.remove(callback);
      if (_eventCallbacks[eventName]?.isEmpty == true) {
        _eventCallbacks.remove(eventName);
        // Also detach socket-level listener to avoid duplicate handling
        try {
          socket?.off(eventName);
          log('socket.off called for $eventName');
        } catch (e) {
          log('socket.off failed for $eventName: $e');
        }
      }
      log('Callback unregistered for event: $eventName');
    };
  }

  // ✅ ADDED: Manual unsubscription
  void off(String eventName) {
    _eventCallbacks.remove(eventName);
    try {
      socket?.off(eventName);
      log('socket.off called for $eventName');
    } catch (e) {
      log('socket.off failed for $eventName: $e');
    }
  }

  /*// Subscribe to socket events
  Function()? onSocketEvent(
      String eventName,
      Function(Map<String, dynamic>) callback,
      ) {
    if (!_eventCallbacks.containsKey(eventName)) {
      _eventCallbacks[eventName] = [];
    }

    _eventCallbacks[eventName]!.add(callback);
    log(
      'Callback registered for event: $eventName. Total callbacks: ${_eventCallbacks[eventName]!.length}',
    );

    // Return unsubscribe function
    return () {
      _eventCallbacks[eventName]?.remove(callback);
      if (_eventCallbacks[eventName]?.isEmpty == true) {
        _eventCallbacks.remove(eventName);
      }
      log('Callback unregistered for event: $eventName');
    };
  }*/
  void socketFirstDelete(
    String messageId, {
    String? recipientId,
    String? channelId,
  }) {
    if (!isConnected) {
      log('Cannot perform socket-first delete: socket not connected');
      return;
    }

    try {
      final deleteData = {
        'messageId': messageId,
        'id': messageId,
        'userId': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'deletedBy': currentUserId,
        'socketFirst': true, // Flag to indicate socket-first approach
      };

      if (channelId != null) {
        deleteData['channelId'] = channelId;
        deleteData['type'] = 'channel';
      } else if (recipientId != null) {
        deleteData['recipientId'] = recipientId;
        deleteData['type'] = 'dm';
      }

      socket!.emit(SocketEvents.messageDeleted, deleteData);
      log('📡 Socket-first delete emitted: $deleteData');
    } catch (e) {
      log('❌ Error in socket-first delete: $e');
    }
  }

  // In SocketService.dart, update the reaction methods
  void socketFirstAddReaction(String messageId, String emoji) {
    if (!isConnected) return;

    try {
      final reactionData = {
        'message_id': messageId,
        'messageId': messageId,
        'emoji': emoji,
        'user_id': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'socketFirst': true,
      };

      socket!.emit('add-reaction', reactionData);
      log('📡 Socket add reaction emitted: $emoji to $messageId');

      // Also emit to local listeners for immediate UI update
      _notifyEventCallbacks('reaction-added', reactionData);
    } catch (e) {
      log('❌ Error in socket add reaction: $e');
    }
  }

  void socketFirstRemoveReaction(String messageId, String emoji) {
    if (!isConnected) return;

    try {
      final reactionData = {
        'message_id': messageId,
        'messageId': messageId,
        'emoji': emoji,
        'user_id': currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
        'socketFirst': true,
      };

      socket!.emit('remove-reaction', reactionData);
      log('📡 Socket remove reaction emitted: $emoji from $messageId');

      // Also emit to local listeners for immediate UI update
      _notifyEventCallbacks('reaction-removed', reactionData);
    } catch (e) {
      log('❌ Error in socket remove reaction: $e');
    }
  }

  // Send message to specific user room
  void sendMessageToUser(String userId, Map<String, dynamic> messageData) {
    if (!isConnected) {
      throw Exception('Socket not connected');
    }

    try {
      log('Sending message to user $userId: $messageData');
      // Your backend doesn't seem to have a direct "send-message" socket event
      // Messages are sent via HTTP API and then broadcasted via socket
      // So we'll just emit for debugging/testing
      socket!.emit('send-message', {'recipient': userId, ...messageData});
    } catch (e) {
      logger.e('Error sending message to user: $e');
      throw Exception('Failed to send message: $e');
    }
  }

  // Send typing indicator
  // In SocketService
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get typingStream => _typingController.stream;

  void handleIncomingTyping(dynamic data) {
    _typingController.add(Map<String, dynamic>.from(data));
  }

  // Send typing indicator
  void sendTyping({
    String? recipientId,
    String? channelId,
    required String userId,
    required String userName,
    required bool isTyping,
  }) {
    if (!isConnected) return;

    try {
      final typingData = {
        'userId': userId,
        'userName': userName,
        'isTyping': isTyping,
      };

      if (channelId != null) {
        typingData['channelId'] = channelId;
      } else if (recipientId != null) {
        typingData['recipientId'] = recipientId;
        typingData['senderId'] = userId;
      }

      socket!.emit(SocketEvents.typing, typingData);
      log('Typing indicator sent: $typingData');
    } catch (e) {
      log('Error sending typing indicator: $e');
    }
  }

  // Send message delivered status
  void sendMessageDelivered(
    String messageId,
    String senderId,
    String? parentId,
  ) {
    if (!isConnected) return;

    try {
      socket!.emit(SocketEvents.messageDelivered, {
        'messageId': messageId,
        'senderId': senderId,
        'parentId': parentId,
      });
      log('Message delivered status sent for: $messageId');
    } catch (e) {
      log('Error sending message delivered status: $e');
    }
  }

  // Send message seen status
  void sendMessageSeen(List<String> messageIds) {
    if (!isConnected) return;
    log("MessageId:::$messageIds///");
    try {
      socket!.emit(SocketEvents.messageSeen, {
        'messageIds': messageIds,
        'userId': currentUserId,
      });
      log('Message seen status sent for: $messageIds');
    } catch (e) {
      log('Error sending message seen status: $e');
    }
  }

  // Mark messages as read
  void markMessagesAsRead(String chatId, String type) {
    if (!isConnected) return;

    try {
      socket!.emit(SocketEvents.markMessagesRead, {
        'chatId': chatId,
        'type': type, // 'dm' or 'channel'
      });
      log('Messages marked as read for $type: $chatId');
    } catch (e) {
      log('Error marking messages as read: $e');
    }
  }

  void joinChannel(String channelId) {
    if (!isConnected) {
      log('Cannot join channel: socket not connected');
      return;
    }

    try {
      // Emit join-channel event
      socket!.emit(SocketEvents.joinChannel, channelId);
      log('✅ Joined channel via joinChannel method: $channelId');

      // Also emit the direct event that your backend might expect
      socket!.emit('join-channel', channelId);
      log('✅ Joined channel via direct emit: $channelId');

      // Subscribe to channel updates
      socket!.emit(SocketEvents.channelUpdates, {
        'channelId': channelId,
        'action': 'subscribe',
      });
      log('✅ Subscribed to channel updates: $channelId');
    } catch (e) {
      log('❌ Error joining channel: $e');
    }
  }

  void ensureRoomsJoined(String userId, {String? channelId}) {
    if (!isConnected) {
      log('Cannot ensure rooms: socket not connected');
      return;
    }

    try {
      log('🔄 Ensuring rooms are joined...');

      // Always rejoin user room
      socket!.emit(SocketEvents.joinRoom, userId);
      log('✅ Re-joined user room: $userId');

      // Rejoin channel if specified
      if (channelId != null) {
        joinChannel(channelId);
      }

      // Set online status
      setOnline();

      log('✅ Room rejoin completed');
    } catch (e) {
      log('❌ Error ensuring rooms: $e');
    }
  }

  // Set user online
  void setOnline() {
    if (isConnected) {
      socket!.emit(SocketEvents.setOnline, {});
      // log('User set to online');
    }
  }

  // Set user away
  void setAway() {
    if (isConnected) {
      socket!.emit(SocketEvents.setAway, {});
      log('User set to away');
    }
  }

  // Add reaction to message
  void addReaction(String messageId, String emoji) {
    if (!isConnected) return;

    try {
      socket!.emit(SocketEvents.addReaction, {
        'message_id': messageId,
        'emoji': emoji,
      });
      log('Reaction added: $emoji to message $messageId');
    } catch (e) {
      log('Error adding reaction: $e');
    }
  }

  // Remove reaction from message
  void removeReaction(String messageId, String emoji) {
    if (!isConnected) return;

    try {
      socket!.emit(SocketEvents.removeReaction, {
        'message_id': messageId,
        'emoji': emoji,
      });
      log('Reaction removed: $emoji from message $messageId');
    } catch (e) {
      log('Error removing reaction: $e');
    }
  }

  // Generic emit method
  void emit(String event, dynamic data) {
    if (!isConnected) {
      throw Exception('Socket not connected');
    }

    try {
      socket!.emit(event, data);
      logger.d('Event "$event" emitted: $data');
    } catch (e) {
      logger.e('Error emitting event "$event": $e');
      throw Exception('Failed to emit event: $e');
    }
  }

  // Enable debug mode to see all events
  void enableDebugMode() {
    if (socket != null) {
      socket!.onAny((event, data) {
        log('DEBUG - Event received: $event, Data: $data');
      });
    }
  }

  // Test connection with ping
  void testConnection() {
    if (isConnected) {
      socket!.emit('ping', {'timestamp': DateTime.now().toIso8601String()});
      log('Ping sent to test connection');

      socket!.on('pong', (data) {
        log('Pong received: $data');
      });
    }
  }

  // Update current user ID (call this after login)
  void setCurrentUserId(String userId) {
    _currentUserId = userId;
    log('Current user ID set to: $userId');
  }

  // Decrement connection and disconnect if no active connections
  Future<void> decrementConnection() async {
    if (_activeConnections > 0) {
      _activeConnections--;
    }

    log('Active connections after decrement: $_activeConnections');

    // Only disconnect if no active connections remain
    if (_activeConnections <= 0) {
      log('No active connections remaining, disconnecting socket');
      await _forceDisconnect();
    } else {
      log('Socket kept alive, $_activeConnections active connections remain');
    }
  }

  // Force disconnect (private method)
  Future<void> _forceDisconnect() async {
    try {
      if (socket != null) {
        // યુઝરને ઓફલાઇન સેટ કરો ડિસ્કનેક્ટ કરતા પહેલા
        setAway();

        // અત્યારના યુઝરને local online users list માંથી remove કરો
        if (_currentUserId != null) {
          final updated = Set<String>.from(onlineUsers.value);
          updated.remove(_currentUserId!);
          SchedulerBinding.instance.addPostFrameCallback((_) {
            onlineUsers.value = updated;
          });
          log('Removed current user ${_currentUserId} from online users list');
        }

        socket!.disconnect();
        socket!.dispose();
        socket = null;
        _isInitialized = false;
        _activeConnections = 0;
        _eventCallbacks.clear();

        // Clear stored credentials
        _currentToken = null;
        _currentTeamId = null;
        _currentUserId = null;

        logger.i('Socket forcefully disconnected and disposed');
      }
    } catch (e) {
      logger.e('Error during socket force disconnect: $e');
    }
  }

  // Disconnect socket (public method - now decrements connection)
  Future<void> disconnect() async {
    await decrementConnection();
  }

  // Force disconnect all connections (use when app is closing)
  Future<void> forceDisconnectAll() async {
    log('Force disconnecting all socket connections');
    await _forceDisconnect();
    _currentToken = null;
    _currentTeamId = null;
    _currentUserId = null;
  }

  // Check connection status
  bool get isConnected => socket?.connected ?? false;
  bool get isInitialized => _isInitialized;
  int get activeConnections => _activeConnections;

  // Get connection info
  String? get currentToken => _currentToken;
  String? get currentTeamId => _currentTeamId;
  String? get currentUserId => _currentUserId;
  String? get currentUserName => _currentUserName;

  // Reset connection count (use carefully)
  void resetConnectionCount() {
    _activeConnections = 0;
    log('Connection count reset to 0');
  }
}
