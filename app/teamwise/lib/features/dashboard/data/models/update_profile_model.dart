import 'dart:convert';

class UpdateProfileResponse {
  final String message;
  final UserProfile user;

  UpdateProfileResponse({required this.message, required this.user});

  factory UpdateProfileResponse.fromJson(Map<String, dynamic> json) {
    return UpdateProfileResponse(
      message: json['message'] ?? '',
      user: UserProfile.fromJson(json['user'] ?? {}),
    );
  }
}

class UserProfile {
  final int? id;
  final String name;
  final String? avatar;
  final String? phone;
  final String? country;
  final String? countryCode;
  final String email;
  final String? role;
  final String? profileColor;

  UserProfile({
    this.id,
    required this.name,
    this.avatar,
    this.phone,
    this.country,
    this.countryCode,
    required this.email,
    this.role,
    this.profileColor,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] is String ? int.tryParse(json['id']) : json['id'],
      name: json['name']?.toString() ?? '',
      avatar: json['avatar']?.toString(),
      phone: json['phone']?.toString(),
      country: json['country']?.toString(),
      countryCode: json['country_code']?.toString(),
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString(),
      profileColor: json['profile_color']?.toString(),
    );
  }
}

class MemberInfo {
  final int? teamId;
  final int? userId;
  final String? role;
  final String? displayName;
  final Map<String, dynamic>? customField;
  final String? doNotDisturb; // ✅ Added DND field
  final String? doNotDisturbUntil; // ✅ Added DND until field
  final int? invitedBy;
  final String? status;
  final String? createdAt;
  final String? updatedAt;

  MemberInfo({
    this.teamId,
    this.userId,
    this.role,
    this.displayName,
    this.customField,
    this.doNotDisturb,
    this.doNotDisturbUntil,
    this.invitedBy,
    this.status,
    this.createdAt,
    this.updatedAt,
  });

  factory MemberInfo.fromJson(Map<String, dynamic> json) {
    dynamic fieldData = json['custom_field'];
    Map<String, dynamic>? parsedField;

    // ✅ Handle cases:
    // 1. Already a Map
    // 2. JSON string
    // 3. Null or invalid data
    if (fieldData is String) {
      try {
        parsedField = Map<String, dynamic>.from(jsonDecode(fieldData));
      } catch (_) {
        parsedField = {};
      }
    } else if (fieldData is Map) {
      parsedField = Map<String, dynamic>.from(fieldData);
    } else {
      parsedField = {};
    }

    return MemberInfo(
      teamId: json['team_id'] is String
          ? int.tryParse(json['team_id'])
          : json['team_id'],
      userId: json['user_id'] is String
          ? int.tryParse(json['user_id'])
          : json['user_id'],
      role: json['role']?.toString(),
      displayName: json['display_name']?.toString(),
      customField: parsedField,
      doNotDisturb: json['do_not_disturb']?.toString(), // ✅ Parse DND safely
      doNotDisturbUntil: json['do_not_disturb_until']
          ?.toString(), // ✅ Parse DND until safely
      invitedBy: json['invited_by'] is String
          ? int.tryParse(json['invited_by'])
          : json['invited_by'],
      status: json['status']?.toString(),
      createdAt: json['created_at']?.toString(),
      updatedAt: json['updated_at']?.toString(),
    );
  }
  bool get isDNDActive => doNotDisturbUntil != null;

  // ✅ Helper method to get DND duration value
  String? get dndDuration => doNotDisturb;

  Map<String, dynamic> toJson() {
    return {
      'team_id': teamId,
      'user_id': userId,
      'role': role,
      'display_name': displayName,
      'custom_field': customField,
      'do_not_disturb': doNotDisturb,
      'do_not_disturb_until': doNotDisturbUntil,
      'invited_by': invitedBy,
      'status': status,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}

class UserDetailsResponse {
  final UserProfile user;
  final MemberInfo? member;

  UserDetailsResponse({required this.user, this.member});

  factory UserDetailsResponse.fromJson(Map<String, dynamic> json) {
    return UserDetailsResponse(
      user: UserProfile.fromJson(json['user'] ?? {}),
      member: json['member'] != null
          ? MemberInfo.fromJson(json['member'])
          : null,
    );
  }
}
