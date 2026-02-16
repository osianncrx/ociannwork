class CheckEmailModel {
  final String message;
  final bool userExists;
  final bool emailVerified;
  final bool isProfileUpdated;

  CheckEmailModel({
    required this.message,
    required this.userExists,
    required this.emailVerified,
    required this.isProfileUpdated,
  });

  factory CheckEmailModel.fromJson(Map<String, dynamic> json) {
    return CheckEmailModel(
      message: json['message'] ?? '',
      userExists: json['userExists'] ?? false,
      emailVerified: json['emailVerified'] ?? false,
      isProfileUpdated: json['isProfileUpdated'] ?? false,
    );
  }
}

class VerifyOtpResponse {
  final String message;
  final bool showProfileScreen;

  VerifyOtpResponse({required this.message, required this.showProfileScreen});

  factory VerifyOtpResponse.fromJson(Map<String, dynamic> json) {
    return VerifyOtpResponse(
      message: json['message'] ?? '',
      showProfileScreen: json['showProfileScreen'] ?? false,
    );
  }
}

class TempProfileData {
  final String firstName;
  final String lastName;

  final String phone;
  final String email;

  TempProfileData({
    required this.firstName,
    required this.lastName,

    required this.phone,
    required this.email,
  });
}
