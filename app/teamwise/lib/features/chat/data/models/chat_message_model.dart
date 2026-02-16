import '../../../../config.dart';
import '../../../../core/utils/quill_parser.dart';
import 'dart:convert';

class ChatMessageModel {
  int id;
  int senderId;
  int? channelId;
  int teamId;
  int recipientId;
  int? parentId;
  String content;
  String messageType;
  String? fileUrl;
  String? fileType;
  Map<String, dynamic>? metadata;
  List<String> mentions;
  String createdAt;
  String updatedAt;
  String? deletedAt;
  MessageUser sender;
  MessageUser recipient;
  List<MessageStatus> statuses;
  List<ReactionChat> reactions;
  List<MessageFavorite> favorites;
  List<MessagePin> pins;
  ChatMessageModel? parent;
  bool isPinned;
  late final bool isFavorite;
  ChatMessageModel? parentMessage;
  bool isEncrypted;

  ChatMessageModel({
    required this.id,
    required this.senderId,
    this.channelId,
    required this.teamId,
    required this.recipientId,
    this.parentId,
    required this.content,
    required this.messageType,
    this.fileUrl,
    this.fileType,
    this.metadata,
    this.mentions = const [],
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    required this.sender,
    required this.recipient,
    this.statuses = const [],
    this.reactions = const [],
    this.favorites = const [],
    this.pins = const [],
    this.parent,
    this.isPinned = false,
    this.isFavorite = false,
    this.parentMessage,
    this.isEncrypted = false,
  });

  // Helper method to parse metadata safely
  static Map<String, dynamic>? _parseMetadata(dynamic metadataValue) {
    if (metadataValue == null) {
      return null;
    }

    if (metadataValue is Map<String, dynamic>) {
      return metadataValue;
    }

    if (metadataValue is String) {
      try {
        final parsed = jsonDecode(metadataValue);
        if (parsed is Map<String, dynamic>) {
          return parsed;
        }
      } catch (e) {
        print('Error parsing metadata string: $e');
      }
    }

    // If it's neither null, Map, nor valid JSON string, return null
    return null;
  }

  // Helper method to parse mentions safely
  static List<String> _parseMentions(dynamic mentionsValue) {
    if (mentionsValue == null) {
      return [];
    }

    if (mentionsValue is List) {
      return mentionsValue.map((e) => e.toString()).toList();
    }

    if (mentionsValue is String) {
      if (mentionsValue.trim().isEmpty || mentionsValue == '[]') {
        return [];
      }
      try {
        final parsed = jsonDecode(mentionsValue);
        if (parsed is List) {
          return parsed.map((e) => e.toString()).toList();
        }
      } catch (e) {
        print('Error parsing mentions string: $e');
      }
    }

    return [];
  }

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] ?? 0,
      senderId: json['sender_id'] ?? 0,
      channelId: json['channel_id'],
      teamId: json['team_id'] ?? 0,
      recipientId: json['recipient_id'] ?? 0,
      parentId: json['parent_id'],
      content: json['content']?.toString() ?? '',
      messageType: json['message_type']?.toString() ?? 'text',
      fileUrl: json['file_url']?.toString(),
      fileType: json['file_type']?.toString(),
      metadata: _parseMetadata(json['metadata']), // Fixed line 70
      mentions: _parseMentions(json['mentions']),
      createdAt: json['created_at']?.toString() ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
      deletedAt: json['deleted_at']?.toString(),
      sender: MessageUser.fromJson(json['sender'] ?? {}),
      recipient: MessageUser.fromJson(json['recipient'] ?? {}),
      statuses: (json['statuses'] as List<dynamic>? ?? [])
          .map((s) => MessageStatus.fromJson(s))
          .toList(),
      reactions: (json['reactions'] as List<dynamic>? ?? [])
          .map((r) => ReactionChat.fromJson(r))
          .toList(),
      favorites: (json['favorites'] as List<dynamic>? ?? [])
          .map((f) => MessageFavorite.fromJson(f))
          .toList(),
      pins: (json['pins'] as List<dynamic>? ?? [])
          .map((p) => MessagePin.fromJson(p))
          .toList(),
      parent: json['parent'] != null
          ? ChatMessageModel.fromJson(json['parent'])
          : null,
      isPinned: json['isPinned'] == true,
      isFavorite: json['isFavorite'] == true,
      parentMessage: json['parent_message'] != null
          ? ChatMessageModel.fromJson(json['parent_message'])
          : null,
      isEncrypted:
          json['is_encrypted'] == true || json['is_encrypted'] == "true",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender_id': senderId,
      'channel_id': channelId,
      'team_id': teamId,
      'recipient_id': recipientId,
      'parent_id': parentId,
      'content': content,
      'message_type': messageType,
      'file_url': fileUrl,
      'file_type': fileType,
      'metadata': metadata,
      'mentions': mentions,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'deleted_at': deletedAt,
      'sender': sender.toJson(),
      'recipient': recipient.toJson(),
      'statuses': statuses.map((s) => s.toJson()).toList(),
      'reactions': reactions.map((r) => r.toJson()).toList(),
      'favorites': favorites.map((f) => f.toJson()).toList(),
      'pins': pins.map((p) => p.toJson()).toList(),
      'parent': parent?.toJson(),
      'isPinned': isPinned,
      'isFavorite': isFavorite,
      'parent_message': parentMessage?.toJson(),
      'is_encrypted': isEncrypted,
    };
  }

  // Convenience getters
  String get senderName => sender.name;
  String get recipientName => recipient.name;
  bool get hasParent => parentId != null;
  bool get isReply => parent != null || parentMessage != null;
  bool get hasReactions => reactions.isNotEmpty;
  bool get hasAttachment => fileUrl != null && fileUrl!.isNotEmpty;

  // Get formatted timestamp
  DateTime get createdAtDateTime {
    try {
      return DateTime.parse(createdAt);
    } catch (e) {
      return DateTime.now();
    }
  }

  // Check if message is seen by recipient
  bool get isSeenByRecipient {
    return statuses.any(
      (status) => status.userId == recipientId && status.status == 'seen',
    );
  }

  // Check if message is delivered to recipient
  bool get isDeliveredToRecipient {
    return statuses.any(
      (status) =>
          status.userId == recipientId &&
          (status.status == 'delivered' || status.status == 'seen'),
    );
  }

  // In your ChatMessageModel class
  String get plainTextContent {
    if (content == null) return '';

    // Check if content is Quill Delta format
    if (content.contains('{"ops":') && content.contains('"insert"')) {
      return QuillParser.deltaToPlainText(content);
    }

    return content;
  }

  // Get reaction count for a specific emoji
  int getReactionCount(String emoji) {
    final reaction = reactions.firstWhere(
      (r) => r.emoji == emoji,
      orElse: () => ReactionChat(emoji: emoji, count: 0, users: []),
    );
    return reaction.count;
  }

  // Check if user has reacted with specific emoji
  bool hasUserReacted(String userId, String emoji) {
    final reaction = reactions.firstWhere(
      (r) => r.emoji == emoji,
      orElse: () => ReactionChat(emoji: emoji, count: 0, users: []),
    );
    return reaction.users.contains(userId);
  }
}

class MessageUser {
  int id;
  String name;
  String email;
  String? avatar;
  Color? profileColor;

  MessageUser({
    required this.id,
    required this.name,
    required this.email,
    this.avatar,
    this.profileColor,
  });

  factory MessageUser.fromJson(Map<String, dynamic> json) {
    return MessageUser(
      id: json['id'] ?? 0,
      name: json['name']?.toString() ?? 'Unknown',
      email: json['email']?.toString() ?? '',
      avatar: json['avatar']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'name': name, 'email': email, 'avatar': avatar};
  }
}

class MessageStatus {
  int userId;
  String status; // 'delivered', 'seen'
  String updatedAt;

  MessageStatus({
    required this.userId,
    required this.status,
    required this.updatedAt,
  });

  factory MessageStatus.fromJson(Map<String, dynamic> json) {
    return MessageStatus(
      userId: json['user_id'] ?? 0,
      status: json['status']?.toString() ?? 'delivered',
      updatedAt: json['updated_at']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'user_id': userId, 'status': status, 'updated_at': updatedAt};
  }
}

class ReactionChat {
  String emoji;
  int count;
  List<String> users;

  ReactionChat({required this.emoji, required this.count, required this.users});

  factory ReactionChat.fromJson(Map<String, dynamic> json) {
    return ReactionChat(
      emoji: json['emoji']?.toString() ?? '',
      count: json['count'] is int
          ? json['count']
          : int.tryParse(json['count']?.toString() ?? '0') ?? 0,
      users: (json['users'] as List?)?.map((u) => u.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {'emoji': emoji, 'count': count, 'users': users};
  }
}

class MessageFavorite {
  int favoritedBy;

  MessageFavorite({required this.favoritedBy});

  factory MessageFavorite.fromJson(Map<String, dynamic> json) {
    return MessageFavorite(
      favoritedBy: json['favorited_by'] ?? json['user_id'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'favorited_by': favoritedBy};
  }
}

class MessagePin {
  int pinnedBy;

  MessagePin({required this.pinnedBy});

  factory MessagePin.fromJson(Map<String, dynamic> json) {
    return MessagePin(pinnedBy: json['pinned_by'] ?? json['user_id'] ?? 0);
  }

  Map<String, dynamic> toJson() {
    return {'pinned_by': pinnedBy};
  }
}

// Response wrapper for paginated messages
class ChatMessagesResponse {
  List<ChatMessageModel> messages;
  bool hasMore;
  int totalCount;
  int offset;
  int? nextOffset;
  bool isFirstPage;
  String filter;

  ChatMessagesResponse({
    required this.messages,
    required this.hasMore,
    required this.totalCount,
    required this.offset,
    this.nextOffset,
    required this.isFirstPage,
    required this.filter,
  });

  factory ChatMessagesResponse.fromJson(Map<String, dynamic> json) {
    return ChatMessagesResponse(
      messages: (json['messages'] as List<dynamic>? ?? [])
          .map((m) => ChatMessageModel.fromJson(m))
          .toList(),
      hasMore: json['hasMore'] ?? false,
      totalCount: json['totalCount'] ?? 0,
      offset: json['offset'] ?? 0,
      nextOffset: json['nextOffset'],
      isFirstPage: json['isFirstPage'] ?? true,
      filter: json['filter']?.toString() ?? 'all',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messages': messages.map((m) => m.toJson()).toList(),
      'hasMore': hasMore,
      'totalCount': totalCount,
      'offset': offset,
      'nextOffset': nextOffset,
      'isFirstPage': isFirstPage,
      'filter': filter,
    };
  }
}
