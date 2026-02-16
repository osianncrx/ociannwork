class LoginResponse {
  final String message;
  final String token;
  final User user;
  final bool showTeamsScreen;
  final int teamId;
  final String teamMemberRole;
  String? teamCustomField;

  LoginResponse({
    required this.message,
    required this.token,
    required this.user,
    required this.showTeamsScreen,
    required this.teamId,
    required this.teamMemberRole,
    this.teamCustomField,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      message: json['message'] ?? '',
      token: json['token'] ?? '',
      user: User.fromJson(json['user'] ?? {}),
      showTeamsScreen: json['showTeamsScreen'] ?? false,
      teamId: json['teamId'] is String
          ? (int.tryParse(json['teamId']) ?? 0)
          : (json['teamId'] ?? 0),
      teamMemberRole: json['teamMemberRole']?.toString() ?? '',
      teamCustomField: json['teamCustomField']?.toString() ?? "",
    );
  }
}

class User {
  final int id;
  final String name;
  final String email;
  final String role;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] is String
          ? (int.tryParse(json['id']) ?? 0)
          : (json['id'] ?? 0),
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
    );
  }
}

class ResendOtpResponse {
  final String message;

  ResendOtpResponse({required this.message});

  factory ResendOtpResponse.fromJson(Map<String, dynamic> json) {
    return ResendOtpResponse(
      message: json['message'] ?? 'OTP resent successfully',
    );
  }
}
