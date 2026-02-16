class ConversationsData {
  String? type;
  int? id;
  String? name;
  String? avatar;
  String? description;
  String? profileColor;
  int? createdBy;
  String? latestMessageAt;
  LastMessage? lastMessage;
  bool? pinned;
  int? unreadCount;
  bool? hasUnreadMentions;
  bool? isMuted;
  dynamic mutedUntil;
  dynamic muteDuration;

  ConversationsData({
    this.type,
    this.id,
    this.name,
    this.avatar,
    this.description,
    this.createdBy,
    this.latestMessageAt,
    this.lastMessage,
    this.pinned,
    this.unreadCount,
    this.profileColor,
    this.hasUnreadMentions,
    this.isMuted,
    this.mutedUntil,
    this.muteDuration,
  });

  ConversationsData.fromJson(Map<String, dynamic> json) {
    type = json['type'];
    id = json['id'];
    name = json['name'];
    avatar = json['avatar'];
    description = json['description'];
    createdBy = json['created_by'];
    profileColor = json['profile_color'];
    latestMessageAt = json['latest_message_at'];
    lastMessage = json['last_message'] != null
        ? LastMessage.fromJson(json['last_message'])
        : null; 
    pinned = json['pinned'];
    unreadCount = json['unread_count'];
    hasUnreadMentions = json['has_unread_mentions'];
    isMuted = json['is_muted'];
    mutedUntil = json['muted_until'];
    muteDuration = json['mute_duration'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['type'] = type;
    data['id'] = id;
    data['name'] = name;
    data['avatar'] = avatar;
    data['description'] = description;
    data['profile_color'] = profileColor;
    data['created_by'] = createdBy;
    data['latest_message_at'] = latestMessageAt;
    if (lastMessage != null) {
      data['last_message'] = lastMessage!.toJson();
    }
    data['pinned'] = pinned;
    data['unread_count'] = unreadCount;
    data['has_unread_mentions'] = hasUnreadMentions;
    data['is_muted'] = isMuted;
    data['muted_until'] = mutedUntil;
    data['mute_duration'] = muteDuration;
    return data;
  }
}

class LastMessage {
  int? id;
  String? content;
  String? createdAt;
  int? senderId;
  int? channelId;
  List<dynamic>? mentions;
  String? messageType;
  List<Statuses>? statuses;

  LastMessage({
    this.id,
    this.content,
    this.createdAt,
    this.senderId,
    this.channelId,
    this.mentions,
    this.messageType,
    this.statuses,
  });

  LastMessage.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    content = json['content'];
    createdAt = json['created_at'];
    senderId = json['sender_id'];
    channelId = json['channel_id'];
    mentions = json['mentions'];
    messageType = json['message_type'];
    if (json['statuses'] != null) {
      statuses = <Statuses>[];
      json['statuses'].forEach((v) {
        statuses!.add(Statuses.fromJson(v));
      });
    }
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = id;
    data['content'] = content;
    data['created_at'] = createdAt;
    data['sender_id'] = senderId;
    data['channel_id'] = channelId;
    data['mentions'] = mentions;
    data['message_type'] = messageType;
    if (statuses != null) {
      data['statuses'] = statuses!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

class Statuses {
  int? id;
  int? messageId;
  int? userId;
  String? status;
  String? createdAt;
  String? updatedAt;

  Statuses({
    this.id,
    this.messageId,
    this.userId,
    this.status,
    this.createdAt,
    this.updatedAt,
  });

  Statuses.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    messageId = json['message_id'];
    userId = json['user_id'];
    status = json['status'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = id;
    data['message_id'] = messageId;
    data['user_id'] = userId;
    data['status'] = status;
    data['created_at'] = createdAt;
    data['updated_at'] = updatedAt;
    return data;
  }
}
