class CheckEmailEntity {
  final bool userExists;
  final bool emailVerified;
  final bool isProfileUpdated;
  final String message;

  CheckEmailEntity({
    required this.userExists,
    required this.emailVerified,
    required this.isProfileUpdated,
    required this.message,
  });

  @override
  String toString() {
    return 'CheckEmailEntity(userExists: $userExists, emailVerified: $emailVerified, isProfileUpdated: $isProfileUpdated, message: $message)';
  }
}
