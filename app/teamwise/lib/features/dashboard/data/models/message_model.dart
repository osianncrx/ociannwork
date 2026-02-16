import 'dart:convert';
import 'dart:developer';

import '../../../../core/utils/quill_parser.dart';

class MessageModel {
  final int id;
  final String name;
  final String? avatarUrl;
  final bool isOnline;
  final List<ChatMessage> unreadMessages;
  final String? lastMessage;
  final String? lastMessageType;
  final DateTime? lastMessageTime;
  final int unreadCount;
  final String chatType; // 'dm' or 'channel'
  final bool pinned;

  final String? email; // For DM users
  final String? description; // For channels
  final String? channelId; // For channels
  final String? recipientId; // For DMs
  final String? teamId;
  final String? profileColor;
  final bool muted; // ✅ Changed from nullable to non-nullable with default
  final String? mutedUntil;
  final String? lastMessageSenderId; // ✅ Added for decryption
  bool isEncrypted = false; // Added for decryption

  MessageModel({
    required this.id,
    required this.name,
    this.avatarUrl,
    required this.isOnline,
    required this.unreadMessages,
    this.lastMessage,
    this.lastMessageType,
    this.lastMessageTime,
    required this.unreadCount,
    required this.chatType,
    required this.pinned,
    this.email,
    this.description,
    this.channelId,
    this.recipientId,
    this.teamId,
    this.profileColor,
    this.muted = false, // ✅ Default value
    this.mutedUntil,
    this.lastMessageSenderId,
  });

  MessageModel copyWith({
    int? id,
    String? name,
    String? avatarUrl,
    bool? isOnline,
    List<ChatMessage>? unreadMessages,
    String? lastMessage,
    String? lastMessageType,
    DateTime? lastMessageTime,
    int? unreadCount,
    String? chatType,
    bool? pinned,
    String? email,
    String? description,
    String? channelId,
    String? profileColor,
    String? recipientId,
    String? teamId,
    bool? muted, // ✅ Added muted to copyWith
    String? mutedUntil, // ✅ Added mutedUntil to copyWith
    String? lastMessageSenderId,
  }) {
    return MessageModel(
      id: id ?? this.id,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isOnline: isOnline ?? this.isOnline,
      unreadMessages: unreadMessages ?? this.unreadMessages,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageType: lastMessageType ?? this.lastMessageType,
      lastMessageTime: lastMessageTime ?? this.lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
      chatType: chatType ?? this.chatType,
      pinned: pinned ?? this.pinned,
      profileColor: profileColor ?? this.profileColor,
      email: email ?? this.email,
      description: description ?? this.description,
      channelId: channelId ?? this.channelId,
      recipientId: recipientId ?? this.recipientId,
      teamId: teamId ?? this.teamId,
      muted: muted ?? this.muted, // ✅ Added
      mutedUntil: mutedUntil ?? this.mutedUntil, // ✅ Added
      lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
    );
  }

  @override
  String toString() {
    return '''
MessageModel(
  id: $id,
  name: "$name",
  type: $chatType,
  isOnline: $isOnline,
  unreadCount: $unreadCount,
  pinned: $pinned,
  muted: $muted,
  channelId: $channelId,
  recipientId: $recipientId,
  lastMessage: "${plainTextContent}",
  lastMessageType: $lastMessageType,
  lastMessageTime: $lastMessageTime,
  isEncrypted: $isEncrypted
)
''';
  }

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    bool parseBool(dynamic value) {
      if (value == null) return false;
      if (value is bool) return value;
      if (value is int) return value == 1;
      if (value is String) {
        final lower = value.toLowerCase();
        return lower == 'true' || lower == '1';
      }
      return false;
    }

    String? parseLastMessageContent(Map<String, dynamic>? lastMsg) {
      if (lastMsg == null || lastMsg['content'] == null) return null;

      final content = lastMsg['content'].toString();

      if (content.startsWith('{') && content.contains('ops')) {
        try {
          final decoded = jsonDecode(content);
          if (decoded['ops'] != null && decoded['ops'].isNotEmpty) {
            return decoded['ops'][0]['insert']?.toString().trim();
          }
        } catch (e) {
          // If JSON parsing fails, return original content
        }
      }

      return content;
    }

    final type = json['type']?.toString() ?? 'dm';
    final chatType = type == 'channel' ? 'channel' : 'dm';

    final baseId = json['id'] is int
        ? json['id']
        : int.tryParse(json['id'].toString()) ?? 0;

    String? channelId;
    String? recipientId;

    if (chatType == 'channel') {
      channelId = baseId.toString();
      recipientId = null;
    } else {
      channelId = null;
      recipientId = baseId.toString();
    }

    final lastMsgContent = parseLastMessageContent(json['last_message']);
    bool isEnc = parseBool(
      json['last_message']?['is_encrypted'] ?? json['is_encrypted'],
    );

    // 🛡️ Robust fallback: check if content starts with AES prefix
    if (!isEnc &&
        lastMsgContent != null &&
        lastMsgContent.startsWith('U2FsdGVkX18')) {
      isEnc = true;
    }

    if (isEnc) {
      log(
        '🔍 MessageModel: Detected encrypted message for ${json['name'] ?? json['chat_name']}',
      );
    }

    return MessageModel(
      id: baseId,
      name: json['name'] ?? json['chat_name'] ?? '',
      avatarUrl: json['avatar'] ?? json['chat_avatar'],
      isOnline: chatType == 'dm' ? parseBool(json['is_online']) : false,
      unreadMessages: json['last_message'] != null
          ? [ChatMessage.fromJson(json['last_message'])]
          : [],
      lastMessage: lastMsgContent,
      lastMessageType: json['last_message']?['message_type'],
      lastMessageTime: json['latest_message_at'] != null
          ? DateTime.tryParse(json['latest_message_at'])
          : null,
      unreadCount: json['unread_count'] ?? 0,
      chatType: chatType,
      pinned: parseBool(json['pinned']),
      email: json['email'],
      description: json['description'],
      teamId: json['team_id'],
      channelId: channelId,
      recipientId: recipientId,
      profileColor: json['profile_color'],
      muted: parseBool(json['is_muted']), // ✅ Parse from API
      mutedUntil: json['muted_until']?.toString(), // ✅ Parse from API
      lastMessageSenderId:
          (json['last_message']?['sender_id'] ??
                  json['last_message']?['sender']?['id'])
              ?.toString(),
    )..isEncrypted = isEnc;
  }

  String get plainTextContent {
    if (lastMessage == null) return '';

    if (lastMessage!.contains('{"ops":') && lastMessage!.contains('"insert"')) {
      return QuillParser.deltaToPlainText(lastMessage!);
    }

    return lastMessage!;
  }

  bool get isDM => chatType == 'dm';
  bool get isChannel => chatType == 'channel';
  String get displayType => isDM ? 'DM' : 'Channel';
  String get apiIdentifier => id.toString();

  Map<String, String?> get conversationParams {
    if (isChannel) {
      return {'recipientId': id.toString(), 'channelId': channelId};
    } else {
      return {'recipientId': recipientId, 'channelId': null};
    }
  }

  void logConversationInfo() {
    log('=== Conversation Info ===');
    log('Name: $name');
    log('Type: $chatType ($displayType)');
    log('Base ID: $id');
    log('Channel ID: $channelId');
    log('Recipient ID: $recipientId');
    log('Muted: $muted');
    log('Muted Until: $mutedUntil');
    log('API Params: $conversationParams');
    log('========================');
  }
}

class ChatMessage {
  final String id;
  final String content;
  final String senderId;
  final String? channelId;
  final String? recipientId;
  final DateTime createdAt;
  final String messageType;
  final bool isEncrypted;

  ChatMessage({
    required this.id,
    required this.content,
    required this.senderId,
    this.channelId,
    this.recipientId,
    required this.createdAt,
    this.messageType = 'text',
    this.isEncrypted = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    // Handle rich text content parsing
    String parseContent(dynamic content) {
      if (content == null) return '';

      final contentStr = content.toString();

      // Handle rich text JSON format
      if (contentStr.startsWith('{') && contentStr.contains('ops')) {
        try {
          final decoded = jsonDecode(contentStr);
          if (decoded['ops'] != null && decoded['ops'].isNotEmpty) {
            return decoded['ops'][0]['insert']?.toString().trim() ?? '';
          }
        } catch (e) {
          // If parsing fails, return original
        }
      }

      return contentStr;
    }

    // 🛡️ Robust senderId parsing
    final sId =
        json['sender_id'] ??
        json['from_id'] ??
        json['user_id'] ??
        json['sender']?['id'] ??
        json['user']?['id'] ??
        json['id'];

    // 🛡️ Robust isEncrypted check
    bool isEnc =
        json['is_encrypted'] == true ||
        json['is_encrypted'] == 1 ||
        json['is_encrypted']?.toString() == '1' ||
        json['is_encrypted']?.toString().toLowerCase() == 'true';

    // Check content prefix if metadata is missing
    final contentStr = json['content']?.toString() ?? '';
    if (!isEnc && contentStr.startsWith('U2FsdGVkX18')) {
      isEnc = true;
    }

    return ChatMessage(
      id: json['id'].toString(),
      content: parseContent(json['content']),
      senderId: (sId ?? '0').toString(),
      channelId: json['channel_id']?.toString(),
      recipientId: json['recipient_id']?.toString(),
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      messageType: json['message_type'] ?? 'text',
      isEncrypted: isEnc,
    );
  }

  // Helper methods
  bool get isChannelMessage => channelId != null;
  bool get isDMMessage => recipientId != null && channelId == null;
}

// Usage examples:
class ChatUtils {
  // Parse API response to MessageModel list
  static List<MessageModel> parseChatsFromApi(List<dynamic> apiData) {
    return apiData.map((json) {
      final model = MessageModel.fromJson(json);
      // model.logConversationInfo(); // Debug logging
      return model;
    }).toList();
  }

  // Separate channels and DMs
  static Map<String, List<MessageModel>> separateChatsAndChannels(
    List<MessageModel> chats,
  ) {
    final channels = chats.where((chat) => chat.isChannel).toList();
    final dms = chats.where((chat) => chat.isDM).toList();

    return {'channels': channels, 'dms': dms};
  }

  // Get navigation parameters for a chat
  static Map<String, dynamic> getNavigationParams(MessageModel chat) {
    final params = chat.conversationParams;

    return {
      'recipientId': params['recipientId'],
      'channelId': params['channelId'],
      'recipientName': chat.name,
      'isChannel': chat.isChannel,
      'chatType': chat.chatType,
    };
  }
}
