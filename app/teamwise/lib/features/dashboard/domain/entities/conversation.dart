
class Conversation {
  final String id;
  final String type; // "dm" or "channel"
  final String name;
  final String? email;
  final String? avatarUrl;
  final String? description;
  final String? profileColor;
  final bool pinned;
  final bool isOnline;
  final int unreadCount;
  final String? lastMessage;
  final DateTime? lastMessageTime;

  Conversation({
    required this.id,
    required this.type,
    required this.name,
    this.email,
    this.avatarUrl,
    this.description,
    this.profileColor,
    this.pinned = false,
    this.isOnline = false,
    this.unreadCount = 0,
    this.lastMessage,
    this.lastMessageTime,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final lastMsg = json['last_message'];
    final lastMessageContent = lastMsg != null ? lastMsg['content']?.toString() : null;
    final lastMessageTimeStr =
        json['latest_message_at'] ?? lastMsg?['created_at'];

    return Conversation(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown',
      email: json['email']?.toString(),
      avatarUrl: json['avatar']?.toString(),
      description: json['description']?.toString(),
      profileColor: json['profile_color']?.toString(),
      pinned: json['pinned'] ?? false,
      unreadCount: json['unread_count'] ?? 0,
      isOnline: (lastMsg?['sender']?['is_online'] ??
          json['is_online'] ??
          false) as bool,
      lastMessage: lastMessageContent,
      lastMessageTime: lastMessageTimeStr != null
          ? DateTime.tryParse(lastMessageTimeStr)
          : null,
    );
  }
}

// class Conversation {
//   final String id;
//   final String name;
//   final String? lastMessage;
//   final DateTime lastMessageTime;
//   final String? avatarUrl;
//   final bool isOnline;
//   final int unreadCount;
//
//   Conversation({
//     required this.id,
//     required this.name,
//     this.lastMessage,
//     required this.lastMessageTime,
//     this.avatarUrl,
//     this.isOnline = false,
//     this.unreadCount = 0,
//   });
//
//   factory Conversation.fromJson(Map<String, dynamic> json) {
//     return Conversation(
//       id: json['id']?.toString() ?? '',
//       name: json['name']?.toString() ?? 'Unknown',
//       lastMessage: json['last_message']?.toString(),
//       lastMessageTime: DateTime.parse(
//         json['last_message_time'] ?? DateTime.now().toIso8601String(),
//       ),
//       avatarUrl: json['avatar']?.toString(),
//       isOnline: json['is_online'] ?? false,
//       unreadCount: json['unread_count'] ?? 0,
//     );
//   }
// }
