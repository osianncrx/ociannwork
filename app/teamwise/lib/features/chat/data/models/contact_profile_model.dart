class ContactProfileModel {
  final String? type;
  final int? id;
  final String? name;
  final String? email;
  final String? avatar;
  final String? status;
  final String? profileColor;
  final dynamic customField;
  final String? teamMemberStatus;
  final String? displayName;
  final bool? doNotDisturb;
  final String? doNotDisturbUntil;
  final String? teamRole;
  final dynamic lastMessage;
  final bool? pinned;
  final int? unreadCount;
  final String? description;
  final bool? hasUnreadMentions;
  final bool? isMuted;
  final String? mutedUntil;
  final String? muteDuration;

  ContactProfileModel({
    this.type,
    this.id,
    this.name,
    this.email,
    this.avatar,
    this.status,
    this.profileColor,
    this.customField,
    this.teamMemberStatus,
    this.description,
    this.displayName,
    this.doNotDisturb,
    this.doNotDisturbUntil,
    this.teamRole,
    this.lastMessage,
    this.pinned,
    this.unreadCount,
    this.hasUnreadMentions,
    this.isMuted,
    this.mutedUntil,
    this.muteDuration,
  });

  factory ContactProfileModel.fromJson(Map<String, dynamic> json) {
    return ContactProfileModel(
      type: json['type'],
      id: json['id'],
      name: json['name'],
      email: json['email'],
      avatar: json['avatar'],
      status: json['status'],
      description: json['description'],
      profileColor: json['profile_color'],
      customField: json['custom_field'],
      teamMemberStatus: json['team_member_status'],
      displayName: json['display_name'],
      doNotDisturb: json['do_not_disturb'],
      doNotDisturbUntil: json['do_not_disturb_until'],
      teamRole: json['team_role'],
      lastMessage: json['last_message'],
      pinned: json['pinned'],
      unreadCount: json['unread_count'],
      hasUnreadMentions: json['has_unread_mentions'],
      isMuted: json['is_muted'],
      mutedUntil: json['muted_until'],
      muteDuration: json['mute_duration'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'id': id,
      'name': name,
      'email': email,
      'avatar': avatar,
      'status': status,
      'profile_color': profileColor,
      'custom_field': customField,
      'team_member_status': teamMemberStatus,
      'display_name': displayName,
      'do_not_disturb': doNotDisturb,
      'description': description,
      'do_not_disturb_until': doNotDisturbUntil,
      'team_role': teamRole,
      'last_message': lastMessage,
      'pinned': pinned,
      'unread_count': unreadCount,
      'has_unread_mentions': hasUnreadMentions,
      'is_muted': isMuted,
      'muted_until': mutedUntil,
      'mute_duration': muteDuration,
    };
  }
}
