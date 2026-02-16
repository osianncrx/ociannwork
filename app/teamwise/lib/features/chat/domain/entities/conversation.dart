class Conversation {
  final String id;
  final String name;
  final String? lastMessage;
  final DateTime lastMessageTime;
  final String? avatarUrl;
  final bool isOnline;
  final int unreadCount;

  Conversation({
    required this.id,
    required this.name,
    this.lastMessage,
    required this.lastMessageTime,
    this.avatarUrl,
    this.isOnline = false,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown',
      lastMessage: json['last_message']?.toString(),
      lastMessageTime: DateTime.parse(
        json['last_message_time'] ?? DateTime.now().toIso8601String(),
      ),
      avatarUrl: json['avatar']?.toString(),
      isOnline: json['is_online'] ?? false,
      unreadCount: json['unread_count'] ?? 0,
    );
  }
}
