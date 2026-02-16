  class ChannelInfo {
    final Channel channel;

    ChannelInfo({required this.channel});

    factory ChannelInfo.fromJson(Map<String, dynamic> json) {
      return ChannelInfo(
        channel: Channel.fromJson(json['channel'] ?? {}),
      );
    }
  }

  class Channel {
    final int id;
    final String name;
    final String description;
    final String? avatar;
    final String type;
    final int teamId;
    final int createdBy;
    final DateTime createdAt;
    final DateTime updatedAt;
    final List<ChannelMember> members;
    final ChannelSetting setting;

    Channel({
      required this.id,
      required this.name,
      required this.description,
      this.avatar,
      required this.type,
      required this.teamId,
      required this.createdBy,
      required this.createdAt,
      required this.updatedAt,
      required this.members,
      required this.setting,
    });

    factory Channel.fromJson(Map<String, dynamic> json) {
      return Channel(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        description: json['description'] ?? '',
        avatar: json['avatar'],
        type: json['type'] ?? '',
        teamId: json['team_id'] ?? 0,
        createdBy: json['created_by'] ?? 0,
        createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
        updatedAt: DateTime.parse(json['updated_at'] ?? DateTime.now().toIso8601String()),
        members: (json['members'] as List<dynamic>? ?? [])
            .map((e) => ChannelMember.fromJson(e))
            .toList(),
        setting: ChannelSetting.fromJson(json['setting'] ?? {}),
      );
    }
  }

  class ChannelMember {
    final int channelId;
    final int userId;
    final String role;
    final DateTime createdAt;
    final DateTime updatedAt;
    final User user;

    ChannelMember({
      required this.channelId,
      required this.userId,
      required this.role,
      required this.createdAt,
      required this.updatedAt,
      required this.user,
    });

    factory ChannelMember.fromJson(Map<String, dynamic> json) {
      return ChannelMember(
        channelId: json['channel_id'] ?? 0,
        userId: json['user_id'] ?? 0,
        role: json['role'] ?? '',
        createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
        updatedAt: DateTime.parse(json['updated_at'] ?? DateTime.now().toIso8601String()),
        user: User.fromJson(json['User'] ?? {}),
      );
    }
  }

  class User {
    final int id;
    final String name;
    final String email;
    final String? avatar;
    final String profileColor;

    User({
      required this.id,
      required this.name,
      required this.email,
      this.avatar,
      required this.profileColor,
    });

    factory User.fromJson(Map<String, dynamic> json) {
      return User(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        avatar: json['avatar'],
        profileColor: json['profile_color'] ?? '#FFFFFF',
      );
    }
  }

  class ChannelSetting {
    final int channelId;
    final String allowPosting;
    final String fileSharing;
    final String allowMentions;

    ChannelSetting({
      required this.channelId,
      required this.allowPosting,
      required this.fileSharing,
      required this.allowMentions,
    });

    factory ChannelSetting.fromJson(Map<String, dynamic> json) {
      return ChannelSetting(
        channelId: json['channel_id'] ?? 0,
        allowPosting: json['allow_posting'] ?? 'all',
        fileSharing: json['file_sharing'] ?? 'all',
        allowMentions: json['allow_mentions'] ?? 'all',
      );
    }
  }
