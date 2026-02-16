
class MessageReaction {
  final String id;
  final String messageId;
  final String userId;
  final String userName;
  final String emoji;
  final DateTime timestamp;

  MessageReaction({
    required this.id,
    required this.messageId,
    required this.userId,
    required this.userName,
    required this.emoji,
    required this.timestamp,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      id: json['id']?.toString() ?? '',
      messageId: json['message_id']?.toString() ?? json['messageId']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      userName: json['user_name']?.toString() ?? json['userName']?.toString() ?? 'Unknown',
      emoji: json['emoji']?.toString() ?? '',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'message_id': messageId,
      'messageId': messageId,
      'user_id': userId,
      'userId': userId,
      'user_name': userName,
      'userName': userName,
      'emoji': emoji,
      'timestamp': timestamp.toIso8601String(),
      'created_at': timestamp.toIso8601String(),
    };
  }
}