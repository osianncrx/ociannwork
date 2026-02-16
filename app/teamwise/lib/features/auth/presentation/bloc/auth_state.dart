part of 'auth_bloc.dart';

@immutable
abstract class AuthState extends Equatable {
  final Map<String, bool> visibilityMap;

  const AuthState({this.visibilityMap = const {}});

  @override
  List<Object?> get props => [visibilityMap];
}

class AuthInitial extends AuthState {
  const AuthInitial({super.visibilityMap});
}

class AuthLoading extends AuthState {
  const AuthLoading({super.visibilityMap});
}

class AuthSuccess extends AuthState {
  final String message;
  final String? token;
  final int? teamId;
  final String? userId;
  final String? userName;
  final String? userEmail;
  final String? dndDuration;
  final DateTime? mutedUntil;
  final List<dynamic>? fields;
  final bool isTeamSelected;

  const AuthSuccess(
      this.message, {
        this.token,
        this.teamId,
        this.userId,
        this.userName,
        this.userEmail,
        this.dndDuration,
        this.mutedUntil,
        this.fields,
        this.isTeamSelected = false,
        super.visibilityMap,
      });

  AuthSuccess copyWith({
    String? message,
    String? token,
    int? teamId,
    String? userId,
    String? userName,
    String? userEmail,
    String? dndDuration,
    DateTime? mutedUntil,
    List<dynamic>? fields,
    bool? isTeamSelected,
    Map<String, bool>? visibilityMap,
  }) {
    return AuthSuccess(
      message ?? this.message,
      token: token ?? this.token,
      teamId: teamId ?? this.teamId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      dndDuration: dndDuration ?? this.dndDuration,
      mutedUntil: mutedUntil ?? this.mutedUntil,
      fields: fields ?? this.fields,
      isTeamSelected: isTeamSelected ?? this.isTeamSelected,
      visibilityMap: visibilityMap ?? this.visibilityMap,
    );
  }

  @override
  List<Object?> get props => [
    message,
    token,
    teamId,
    userId,
    userName,
    userEmail,
    dndDuration,
    mutedUntil,
    fields,
    isTeamSelected,
    visibilityMap,
  ];
}

class AuthFailure extends AuthState {
  final String error;
  const AuthFailure(this.error, {super.visibilityMap});

  @override
  List<Object?> get props => [error, visibilityMap];
}

class AuthPasswordVisibilityToggled extends AuthState {
  const AuthPasswordVisibilityToggled(Map<String, bool> visibilityMap)
      : super(visibilityMap: visibilityMap);
}

class AuthUpdated extends AuthState {
  final bool rememberMe;
  const AuthUpdated(this.rememberMe, {super.visibilityMap});
  @override
  List<Object?> get props => [rememberMe, visibilityMap];
}

class AuthDialCodeUpdated extends AuthState {
  final String dialCode;
  const AuthDialCodeUpdated(this.dialCode, {super.visibilityMap});
}

class EmailCheckSuccess extends AuthState {
  final String message;
  final bool userExists;
  final bool emailVerified;
  final bool isProfileUpdated;
  const EmailCheckSuccess({
    required this.message,
    required this.userExists,
    required this.emailVerified,
    required this.isProfileUpdated,
    super.visibilityMap,
  });
}

class OtpVerifiedSuccess extends AuthState {
  final String message;
  final bool showProfileScreen;
  const OtpVerifiedSuccess({
    required this.message,
    required this.showProfileScreen,
    super.visibilityMap,
  });
}

class OtpSentState extends AuthState {
  final String message;
  final bool userExists;
  const OtpSentState({required this.message, required this.userExists, super.visibilityMap});
}

class TeamCreatedSuccess extends AuthState {
  final String teamName;
  const TeamCreatedSuccess(this.teamName, {super.visibilityMap});
}

class ProfileDataStoredSuccess extends AuthState {
  final String email;
  final String name;
  const ProfileDataStoredSuccess({required this.email, required this.name, super.visibilityMap});
}

class ResendOtpSuccess extends AuthState {
  final String message;
  const ResendOtpSuccess(this.message, {super.visibilityMap});
}

class ResendOtpFailure extends AuthState {
  final String error;
  const ResendOtpFailure(this.error, {super.visibilityMap});
}

class ResendTimerUpdated extends AuthState {
  final int remainingTime;
  final bool isResendAvailable;
  const ResendTimerUpdated({
    required this.remainingTime,
    required this.isResendAvailable,
    super.visibilityMap,
  });
}

class OtpTimerTicked extends AuthState {
  final int remainingTime;
  const OtpTimerTicked(this.remainingTime, {super.visibilityMap});
}

class OtpTimerComplete extends AuthState {
  const OtpTimerComplete({super.visibilityMap});
}

class TeamListLoading extends AuthState {
  const TeamListLoading({super.visibilityMap});
}

class TeamListLoaded extends AuthState {
  final List<TeamModel> teams;
  const TeamListLoaded(this.teams, {super.visibilityMap});
}

class SearchTeamsLoading extends AuthState {
  const SearchTeamsLoading({super.visibilityMap});
}

class SearchTeamsSuccess extends AuthState {
  final List<dynamic> teams;
  const SearchTeamsSuccess(this.teams, {super.visibilityMap});
}

class SearchTeamsFailure extends AuthState {
  final String error;
  const SearchTeamsFailure(this.error, {super.visibilityMap});
}

class JoinTeamSuccess extends AuthState {
  final String message;
  const JoinTeamSuccess(this.message, {super.visibilityMap});
}

class JoinTeamFailure extends AuthState {
  final String error;
  const JoinTeamFailure(this.error, {super.visibilityMap});
}

class TokenReceived extends AuthState {
  final String token;
  const TokenReceived(this.token, {super.visibilityMap});
}
