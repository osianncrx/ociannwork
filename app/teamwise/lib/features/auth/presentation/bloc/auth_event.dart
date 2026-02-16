part of 'auth_bloc.dart';

@immutable
abstract class AuthEvent {}

class LoginPressed extends AuthEvent {
  final String email;
  final String password;

  LoginPressed({required this.email, required this.password});
}
class UpdateProfileRequested extends AuthEvent {
  final String firstName;
  final String lastName;
  final String? avatarPath;
  final String? phone;
  final String? countryCode;
  final String? country;

   UpdateProfileRequested({
    required this.firstName,
    required this.lastName,
    this.avatarPath,
    this.phone,
    this.countryCode,
    this.country,
  });

  @override
  List<Object?> get props => [firstName, lastName, avatarPath, phone, countryCode, country];
}
class SendEmailPressed extends AuthEvent {
  final String email;
  SendEmailPressed(this.email);
}

class CreateTeamPressed extends AuthEvent {
  final String teamName;
  CreateTeamPressed(this.teamName);
}

class JoinPressed extends AuthEvent {
  final String joinCode;
  JoinPressed(this.joinCode);
}

class SendOtpPressed extends AuthEvent {
  final String email;
  final String otp;

  SendOtpPressed(this.email, this.otp);
}

class SubmitPressed extends AuthEvent {
  final String newPassword;
  final String confirmationPassword;
  SubmitPressed(this.confirmationPassword, this.newPassword);
}

class GoogleSignInPressed extends AuthEvent {}

class AppleSignInPressed extends AuthEvent {}

class TogglePasswordVisibility extends AuthEvent {
  final String fieldKey; // or int index

  TogglePasswordVisibility(this.fieldKey);
}

class RememberMeToggled extends AuthEvent {
  final bool value;
  RememberMeToggled(this.value);
}

class DialCodeChanged extends AuthEvent {
  final String dialCode;
  DialCodeChanged(this.dialCode);
}

class CheckEmailEvent extends AuthEvent {
  final String email;

  CheckEmailEvent(this.email);
}

class VerifyOtpEvent extends AuthEvent {
  final String email;
  final String otp;
  VerifyOtpEvent(this.email, this.otp);
}

// auth_event.dart
class StoreProfileData extends AuthEvent {
  final String firstName;
  final String lastName;
  final String phone;

  final String email;

  StoreProfileData({
    required this.firstName,
    required this.lastName,
    required this.phone,

    required this.email,
  });
}

class SubmitProfileEvent extends AuthEvent {
  final String password;
  final String? teamName;

  SubmitProfileEvent(this.password, {this.teamName});
}

class StoreEmailEvent extends AuthEvent {
  final String email;
  StoreEmailEvent(this.email);
}

class ResendOtpPressed extends AuthEvent {
  final String email;
  ResendOtpPressed({required this.email});
}

class StartResendTimerEvent extends AuthEvent {}

// auth_event.dart
class FetchTeams extends AuthEvent {
  final String? term;
  final String? email;

  FetchTeams({this.term, this.email});
}

class SearchTeamsEvent extends AuthEvent {
  final String term;
  final String email;

  SearchTeamsEvent({required this.term, required this.email});
}

// auth_event.dart
class JoinTeamEvent extends AuthEvent {
  final int teamId;
  final String email; // user email if needed

  JoinTeamEvent({required this.teamId, required this.email});
}

class TeamListFailure extends AuthState {
  final String error;

  const TeamListFailure(this.error);
}

// auth_event.dart
class CreateChannelEvent extends AuthEvent {
  final Map<String, dynamic> data;
  CreateChannelEvent(this.data);
}

class ForgotPasswordRequested extends AuthEvent {
  final String email;

  ForgotPasswordRequested(this.email);
}

class ResetPasswordEvent extends AuthEvent {
  final String email;
  final String otp;
  final String newPassword;

  ResetPasswordEvent({
    required this.email,
    required this.otp,
    required this.newPassword,
  });
}

class SetupProfileEvent extends AuthEvent {
  final String email;
  final String name;
  final String countryCode;
  final String phone;
  final String password;

  SetupProfileEvent({
    required this.email,
    required this.name,
    required this.countryCode,
    required this.phone,
    required this.password,
  });
}

class ChannelCreatedSuccess extends AuthState {
  final dynamic channelData;

  const ChannelCreatedSuccess(this.channelData);
}

class ChannelCreationFailed extends AuthState {
  final String error;
  final int? statusCode;

  const ChannelCreationFailed(this.error, {this.statusCode});
}

class ForgotPasswordSuccess extends AuthState {
  final String message;

  const ForgotPasswordSuccess(this.message);
}

class InviteTeamMembersEvent extends AuthEvent {
  final List<String> emails;
  final dynamic teamId;

  InviteTeamMembersEvent({required this.emails, required this.teamId});
}

class SelectTeamEvent extends AuthEvent {
  final String teamName;
  final int teamId;
  SelectTeamEvent(this.teamName, this.teamId);
}

class LogoutPressed extends AuthEvent {}
class DNDPressed extends AuthEvent {
  final String duration;
  final bool value;

   DNDPressed({
    required this.duration,
    required this.value,
  });

  @override
  List<Object?> get props => [duration, value];
}

// Add new event for storing user data
class StoreUserDataEvent extends AuthEvent {
  final String? userId;
  final String? userName;
  final String? userEmail;

   StoreUserDataEvent({
    this.userId,
    this.userName,
    this.userEmail,
  });

  @override
  List<Object?> get props => [userId, userName, userEmail];

  @override
  String toString() {
    return 'StoreUserDataEvent(userId: $userId, userName: $userName, userEmail: $userEmail)';
  }
}

class AuthInterceptor extends Interceptor {
  final AuthBloc authBloc;

  AuthInterceptor(this.authBloc);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 ||
        err.response?.data['message']?.toString().contains('Invalid token') == true) {

      log('🔒 Invalid token detected - logging out');
      authBloc.add(LogoutPressed());

      // Show error message
      AppToast.showError('Session expired. Please login again.');
    }

    super.onError(err, handler);
  }
}