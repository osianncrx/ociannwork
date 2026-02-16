import 'package:teamwise/features/auth/data/models/custom_fields.dart';

class TeamProfileResponse {
  final String message;
  final String token;
  final User user;
  final Team team;
  final TeamMember teamMember;
  final List<CustomFieldModel> teamCustomField;

  TeamProfileResponse({
    required this.message,
    required this.token,
    required this.user,
    required this.team,
    required this.teamMember,
    required this.teamCustomField,
  });

  factory TeamProfileResponse.fromJson(Map<String, dynamic> json) {
    return TeamProfileResponse(
      message: json['message'] ?? '',
      token: json['token'] ?? '',
      user: User.fromJson(json['user'] ?? {}),
      team: Team.fromJson(json['team'] ?? {}),
      teamMember: TeamMember.fromJson(json['teamMember'] ?? {}),
      teamCustomField: (json['files'] as List<dynamic>?)
          ?.map((e) => CustomFieldModel.fromJson(e))
          .toList() ??
          [],
    );
  }
}

class User {
  final int id;
  final String name;
  final String email;

  User({
    required this.id,
    required this.name,
    required this.email,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
    );
  }
}

class Team {
  final int id;
  final String name;
  final String domain;

  Team({
    required this.id,
    required this.name,
    required this.domain,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      domain: json['domain'] ?? '',
    );
  }
}

class TeamMember {
  final String role;

  TeamMember({required this.role});

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      role: json['role'] ?? '',
    );
  }
}
