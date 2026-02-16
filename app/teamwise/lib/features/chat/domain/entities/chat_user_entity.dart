class ChatUserEntity {
  final String id;
  final String name;
  final String? avatarUrl;
  final bool isOnline;
  final String? lastMessage;
  final DateTime? lastMessageTime;
  final int unreadCount;

  const ChatUserEntity({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.isOnline = false,
    this.lastMessage,
    this.lastMessageTime,
    this.unreadCount = 0,
  });
}
