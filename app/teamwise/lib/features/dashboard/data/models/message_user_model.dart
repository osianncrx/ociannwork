
import '../../domain/entities/chat_user_entity.dart';

class MessageUserModel extends ChatUserEntity {
  const MessageUserModel({
    required super.id,
    required super.name,
    super.avatarUrl,
    super.isOnline,
    super.lastMessage,
    super.lastMessageTime,
    super.unreadCount,
  });

  factory MessageUserModel.fromJson(Map<String, dynamic> json) {
    return MessageUserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      avatarUrl: json['avatarUrl'],
      isOnline: json['isOnline'] ?? false,
      lastMessage: json['lastMessage'],
      lastMessageTime: json['lastMessageTime'] != null
          ? DateTime.tryParse(json['lastMessageTime']) // safer parsing
          : null,
      unreadCount: json['unreadCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'avatarUrl': avatarUrl,
      'isOnline': isOnline,
      'lastMessage': lastMessage,
      'lastMessageTime': lastMessageTime?.toIso8601String(),
      'unreadCount': unreadCount,
    };
  }

  ChatUserEntity toEntity() {
    return ChatUserEntity(
      id: id,
      name: name,
      avatarUrl: avatarUrl,
      isOnline: isOnline,
      lastMessage: lastMessage,
      lastMessageTime: lastMessageTime,
      unreadCount: unreadCount,
    );
  }

  factory MessageUserModel.fromEntity(ChatUserEntity entity) {
    return MessageUserModel(
      id: entity.id,
      name: entity.name,
      avatarUrl: entity.avatarUrl,
      isOnline: entity.isOnline,
      lastMessage: entity.lastMessage,
      lastMessageTime: entity.lastMessageTime,
      unreadCount: entity.unreadCount,
    );
  }
}
