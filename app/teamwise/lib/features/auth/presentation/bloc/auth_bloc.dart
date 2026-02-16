import 'dart:async';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:teamwise/features/auth/data/datasources/auth_api.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../../core/network/api_response.dart';
import '../../../chat/socket_service.dart';
import '../../../dashboard/data/datasources/dashboard_api.dart';
import '../../data/auth_services.dart';
import '../../data/models/check_email_model.dart';
import '../../data/models/team_model.dart';
import '../../domain/usecases/check_email_usecase.dart';

part 'auth_event.dart';

part 'auth_state.dart';

class AuthBloc extends HydratedBloc<AuthEvent, AuthState> {
  final CheckEmailUseCase? checkEmailUseCase;
  final AuthRepository? authRepository;
  final AuthService _authService = AuthService();

  TempProfileData? _profileData; // to store profile info
  String? _teamName;
  String? _joinedTeamName;

  TempProfileData? get profileData => _profileData;

  String? get teamName => _teamName;

  String? get joinedTeam => _joinedTeamName;
  bool isJoined = true;

  AuthBloc(this.authRepository, {required this.checkEmailUseCase})
    : super(AuthInitial()) {
    _authService.initialize();

    on<InviteTeamMembersEvent>(onInviteTeamMembers);

    on<LoginPressed>(onLoginPressed);
    on<SendEmailPressed>(_onSendEmailPressed);
    on<SendOtpPressed>(_onSendOtpPressed);
    on<SubmitPressed>(onSubmitPressed);
    on<TogglePasswordVisibility>(onTogglePasswordVisibility);
    on<RememberMeToggled>(onRememberMeToggled);
    on<CreateTeamPressed>(onCreateTeamPressed);
    on<DialCodeChanged>(_onDialCodeChanged);
    on<CheckEmailEvent>(_onCheckEmail);
    on<StoreProfileData>(_onStoreProfileData);
    on<SubmitProfileEvent>(_onSubmitProfile);
    on<StoreEmailEvent>(_onStoreEmail);
    on<ResetPasswordEvent>(_onResetPassword);
    on<SetupProfileEvent>(_onSetupProfile);
    on<LogoutPressed>(_onLogoutPressed);
    on<UpdateProfileRequested>(_onUpdateProfileRequested);

    on<ResendOtpPressed>(_onResendOtpPressed);
    on<StartResendTimerEvent>((event, emit) async {
      _remainingTime = 60;
      emit(
        ResendTimerUpdated(
          remainingTime: _remainingTime,
          isResendAvailable: false,
        ),
      );

      final timerStream = Stream.periodic(
        Duration(seconds: 1),
        (count) => 59 - count,
      ).take(60);

      await emit.forEach<int>(
        timerStream,
        onData: (remaining) {
          if (remaining == 0) {
            return ResendTimerUpdated(
              remainingTime: 0,
              isResendAvailable: true,
            );
          } else {
            return ResendTimerUpdated(
              remainingTime: remaining,
              isResendAvailable: false,
            );
          }
        },
      );
    });
    on<SearchTeamsEvent>(_onSearchTeams);
    on<FetchTeams>(_onFetchTeams);
    on<JoinTeamEvent>(_onJoinTeam);
    on<CreateChannelEvent>(_onCreateChannel);
    on<ForgotPasswordRequested>(_onForgotPasswordRequested);
    on<SelectTeamEvent>(_onSelectTeam);

    on<GoogleSignInPressed>(_onGoogleSignInPressed);
    on<AppleSignInPressed>(_onAppleSignInPressed);
    on<DNDPressed>(_onDNDPressed);
  }

  // HydratedBloc overrides
  @override
  AuthState? fromJson(Map<String, dynamic> json) {
    try {
      if (_authService.isAuthenticated) {
        return AuthSuccess(
          "Session restored",
          token: _authService.token!,
          teamId: _authService.teamId!,
          userId: _authService.userId!,
          userEmail: _authService.userEmail,
          userName: _authService.userName,
          isTeamSelected: _authService.isTeamSelected,
        );
      }
    } catch (e) {
      log('Error restoring session: $e');
    }
    return AuthInitial();
  }

  // 4. Update toJson to use AuthService
  @override
  Map<String, dynamic>? toJson(AuthState state) {
    if (state is AuthSuccess && _authService.isAuthenticated) {
      return {
        'token': _authService.token,
        'teamId': _authService.teamId,
        'name': _authService.userName,
        'id': _authService.userId,
        'email': _authService.userEmail,
        'isTeamSelected': _authService.isTeamSelected,
      };
    }
    return null;
  }

  Future<bool> validateSession() async {
    if (!_authService.isAuthenticated) {
      add(LogoutPressed());
      return false;
    }
    return true;
  }
  Future<void> _onLogoutPressed(
      LogoutPressed event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());
    try {
      log('🔓 Logging out user...');

      // Disconnect socket
      try {
        final socketService = serviceLocator<SocketService>();
        await socketService.disconnect();
        log('🔌 Socket disconnected');
      } catch (e) {
        log('🔥 Error disconnecting socket: $e');
      }

      // Clear AuthService (this clears SharedPreferences)
      await _authService.clearAuthData();

      // Clear HydratedBloc cache
      await clear();

      // Clear in-memory variables
      _profileData = null;
      _teamName = null;
      _joinedTeamName = null;
      isJoined = true;

      // Emit logout state
      emit(AuthInitial());
      log('✅ User logged out completely');
    } catch (e) {
      log('🔥 Error during logout: $e');
      emit(AuthFailure('Logout failed: $e'));
    }
  }

  Future<void> _onDNDPressed(
      DNDPressed event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());
    try {
      log('🔕 Updating DO NOT DISTURB...');
      final response = await DashboardApi(serviceLocator<ApiManager>(), serviceLocator<AuthBloc>())
          .updateDND(duration: event.duration, value: event.value);

      final message = response['message'] ?? 'Do not disturb updated';
      final mutedUntilStr = response['muted_until'] as String?;
      final mutedUntil = mutedUntilStr != null ? DateTime.parse(mutedUntilStr) : null;

      // Update AuthSuccess state with DND info
      final currentState = state is AuthSuccess ? state as AuthSuccess : null;
      emit(
        currentState?.copyWith(
          message: message,
          dndDuration: event.duration,
          mutedUntil: mutedUntil,
        ) ??
            AuthSuccess(
              message,
              dndDuration: event.duration,
              mutedUntil: mutedUntil,
            ),
      );

      log('✅ DND updated: $message until $mutedUntil');
    } catch (e) {
      log('🔥 Error updating DND: $e');
      emit(AuthFailure('DND update failed: $e'));
    }
  }



  Future<void> onLoginPressed(
      LoginPressed event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());
    try {
      final loginResponse = await AuthApi(
        serviceLocator<ApiManager>(),
      ).login(event.email, event.password);

      if (loginResponse?.token != null &&
          loginResponse?.teamId != null &&
          loginResponse?.user != null) {

        // Save to AuthService
        await _authService.saveAuthData(
          token: loginResponse!.token,
          teamId: loginResponse.teamId,
          userId: loginResponse.user.id.toString(),
          userName: loginResponse.user.name,
          userEmail: loginResponse.user.email,
        );

        // Emit success state
        emit(
          AuthSuccess(
            loginResponse.message,
            token: loginResponse.token,
            teamId: loginResponse.teamId,
            userName: loginResponse.user.name,
            userId: loginResponse.user.id.toString(),
            userEmail: loginResponse.user.email,
            isTeamSelected: false,
          ),
        );

        log("✅ Login successful - Token and TeamID saved via AuthService");
      } else {
        emit(AuthFailure("Login failed - incomplete response"));
      }
    } catch (e) {
      log('🔥 Login error: $e');
      emit(AuthFailure(e.toString()));
    }
  }



  // Helper method to disconnect socket (can be called from outside if needed)
  Future<void> disconnectSocket() async {
    try {
      log('🔌 Disconnecting socket from AuthBloc...');
      final socketService = serviceLocator<SocketService>();
      await socketService.disconnect();
      log('❌ Socket disconnected from AuthBloc');
    } catch (e) {
      log('🔥 Error disconnecting socket from AuthBloc: $e');
    }
  }

  Future<void> _onResetPassword(
    ResetPasswordEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    try {
      final response = await authRepository!.resetPassword(
        event.email,
        event.otp,
        event.newPassword,
      );
      log("DDDDD;${event.email} ${event.otp} ${event.newPassword}");
      if (response.status == Status.completed) {
        emit(AuthSuccess("Password reset successfully"));
      } else {
        emit(AuthFailure(response.message));
      }
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  Future<void> _onSelectTeam(
      SelectTeamEvent event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());
    try {
      _joinedTeamName = event.teamName;
      isJoined = true;

      // Update team ID via AuthService
      await _authService.updateTeamId(event.teamId);

      log('✅ Team selected: ${event.teamName} (ID: ${event.teamId})');

      emit(AuthSuccess(
        "Team selected: ${event.teamName}",
        token: _authService.token!,
        teamId: event.teamId,
        userId: _authService.userId!,
        userName: _authService.userName,
        userEmail: _authService.userEmail,
        isTeamSelected: true,
      ));
    } catch (e) {
      log('🔥 Failed to select team: $e');
      emit(AuthFailure("Failed to select team: $e"));
    }
  }

  Future<void> _onSetupProfile(
      SetupProfileEvent event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());
    try {
      final response = await authRepository?.setupProfile({
        "email": event.email,
        "name": event.name,
        "country_code": event.countryCode,
        "phone": event.phone,
        "password": event.password,
      });

      log("response::${response!.data}");

      if (response.status == Status.completed) {
        final token = response.data['token'];
        final teamId = response.data['teamId'];
        final user = response.data['user'];
        final fields = response.data['fields'];
log("fields::$fields");
        // ✅ Save auth data to AuthService
        await _authService.saveAuthData(
          token: token,
          teamId: teamId,
          userId: user['id'].toString(),
          userName: user?['name'],
          userEmail: user?['email'],
        );

        emit(
          AuthSuccess(
            "Profile setup completed successfully",
            token: token,
            teamId: teamId,
            userId: user?['id']?.toString(),
            userName: user?['name'],
            userEmail: user?['email'],
            fields: fields,
            isTeamSelected: false,
          ),
        );
      } else {
        log("response.message::${response.message}");
        emit(AuthFailure(response.message));
      }
    } catch (e,s) {
      log("EEEE response.message::$e//$s");

    }
  }


  Future<void> _onForgotPasswordRequested(
    ForgotPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    final response = await authRepository!.forgotPassword(event.email);

    if (response.status == Status.completed) {
      emit(AuthSuccess(response.data?.message ?? 'Success'));
    } else {
      emit(AuthFailure(response.message));
    }
  }

  Future<void> _onCreateChannel(
    CreateChannelEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await authRepository!.createChannel(event.data);

      if (response.status == Status.completed) {
        emit(ChannelCreatedSuccess(response.data));
      } else {
        emit(
          ChannelCreationFailed(
            response.message,
            statusCode: response.statusCode,
          ),
        );
      }
    } catch (e) {
      log('Unexpected error in channel creation: $e');
      emit(ChannelCreationFailed('An unexpected error occurred'));
    }
  }

  Future<void> _onJoinTeam(JoinTeamEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository!.joinTeam(event.teamId, event.email);
      emit(JoinTeamSuccess('Joined team successfully'));
    } catch (e) {
      emit(JoinTeamFailure(e.toString()));
    }
  }

  Future<void> _onFetchTeams(FetchTeams event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final term = event.term ?? '';
      final email = event.email ?? '';
      final teams = await authRepository!.searchTeams(term, email);

      log("✅ Team fetch success: Found ${teams.length} teams");
      emit(TeamListLoaded(teams));
    } catch (e) {
      final errorMessage = e.toString().replaceAll('Exception: ', '');
      log("❌ Team fetch failed: $errorMessage");
      emit(AuthFailure(errorMessage));
    }
  }

  Future<void> _onSearchTeams(
    SearchTeamsEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(SearchTeamsLoading());
    try {
      final result = await authRepository!.searchTeams(event.term, event.email);
      emit(SearchTeamsSuccess(result));
    } catch (e) {
      log("Team Search Error: $e");
      emit(SearchTeamsFailure(e.toString()));
    }
  }

  Timer? resendTimer;
  int _remainingTime = 60;

  Future<void> _onUpdateProfileRequested(
      UpdateProfileRequested event,
      Emitter<AuthState> emit,
      ) async {
    emit(AuthLoading());

    try {
      final dashboardApi = DashboardApi(serviceLocator<ApiManager>(), this);
      final fullName = '${event.firstName} ${event.lastName}'.trim();

      final result = await dashboardApi.updateProfile(
        name: fullName,
        avatarPath: event.avatarPath,
        phone: event.phone,
        countryCode: event.countryCode,
        country: event.country,
      );

      log("✅ updateProfile success: ${result.user.name}");

      // ✅ You must get the previous user data before you emit loading
      final prevState = state;
      String? token;
      int? teamId;
      if (prevState is AuthSuccess) {
        token = prevState.token;
        teamId = prevState.teamId;
      }
      final updatedUser = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).getUserDetails();

      emit(AuthSuccess(
        result.message,
        token: token ?? '',
        userEmail: updatedUser.user.email,
        userName: updatedUser.user.name,
        teamId: teamId,
        isTeamSelected: _authService.isTeamSelected,
      ));



    } catch (e) {
      log('❌ Error updating profile: $e');
      emit(AuthFailure('Failed to update profile: $e'));
    }
  }

  Future<void> _onResendOtpPressed(
    ResendOtpPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final result = await authRepository!.resendOtp(event.email);
      // Emit success state with message
      emit(ResendOtpSuccess(result.message));

      // Immediately start resend timer event
      add(StartResendTimerEvent());
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  // In your AuthBloc
  Future<void> _onSubmitProfile(
      SubmitProfileEvent event,
      Emitter<AuthState> emit,
      ) async {
    isJoined = false;
    emit(AuthLoading());
    try {
      log('event.teamName::${event.teamName}///${_teamName}');
      final data = {
        "email": _profileData?.email ?? '',
        "team_name": _teamName?.isNotEmpty == true ? _teamName : event.teamName,
        "name": "${_profileData?.firstName ?? ''} ${_profileData?.lastName ?? ''}",
        "password": event.password,
      };

      log("response Data::$data");final response = await authRepository!.createTeamProfile(data);
      log("response::$response");
      if ( response.token != null && response.team.id!=0) {
        // Save to AuthService
        await _authService.saveAuthData(
          token: response.token,
          teamId: response.team.id,
          userId: response.user.id.toString(),
          userName: response.user.name,
          userEmail: response.user.email,
        );

        emit(
          AuthSuccess(
            response.message,
            token: response.token,
            teamId: response.team.id,
            userId: response.user.id.toString(),
            userEmail: response.user.email,
            userName: response.user.name,
            fields: response.teamCustomField,
            isTeamSelected: false,
          ),
        );
      } else {
        log('response.message::${response.message}');
        emit(AuthFailure(response.message));
      }
    } catch (e,s) {
      log("response.message::::$e///$s}");
      emit(AuthFailure(e.toString()));
    }
  }



  void _onStoreProfileData(StoreProfileData event, Emitter<AuthState> emit) {
    _profileData = TempProfileData(
      firstName: event.firstName,
      lastName: event.lastName,
      phone: event.phone,
      email: event.email,
    );

    log("Stored profile data: ${_profileData?.firstName}");
    emit(
      ProfileDataStoredSuccess(
        email: event.email,
        name: '${event.firstName} ${event.lastName}',
      ),
    );
  }

  void _onStoreEmail(StoreEmailEvent event, Emitter<AuthState> emit) {
    if (_profileData == null) {
      _profileData = TempProfileData(
        email: event.email,
        firstName: '',
        lastName: '',

        phone: '',
      );
    } else {
      _profileData = TempProfileData(
        email: event.email,
        firstName: _profileData!.firstName,
        lastName: _profileData!.lastName,

        phone: _profileData!.phone,
      );
    }
  }

  void _onDialCodeChanged(DialCodeChanged event, Emitter<AuthState> emit) {
    emit(AuthDialCodeUpdated(event.dialCode));
  }

  Future<void> onInviteTeamMembers(
    InviteTeamMembersEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      log(
        "Inviting team members with data: ${event.emails} and team ID: ${event.teamId}",
      );
      final data = {"emails": event.emails, "team_id": event.teamId};

      final response = await authRepository!.inviteTeamMembers(data);

      if (response.status == Status.completed) {
        emit(AuthSuccess("Invitations sent successfully"));
      } else {
        emit(AuthFailure(response.message));
      }
    } catch (e) {
      log("Error inviting team: $e");
      emit(AuthFailure("Unexpected error: $e"));
    }
  }

  Future<void> _onCheckEmail(
    CheckEmailEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final result = await checkEmailUseCase!(event.email);
      // log("result::${result}");
      emit(
        EmailCheckSuccess(
          message: result.message,
          userExists: result.userExists,
          emailVerified: result.emailVerified,
          isProfileUpdated: result.isProfileUpdated,
        ),
      );
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  void onTogglePasswordVisibility(
      TogglePasswordVisibility event,
      Emitter<AuthState> emit,
      ) {
    final currentMap = Map<String, bool>.from(state.visibilityMap);
    final currentVisibility = currentMap[event.fieldKey] ?? false;
    currentMap[event.fieldKey] = !currentVisibility;

    if (state is AuthSuccess) {
      emit((state as AuthSuccess).copyWith(visibilityMap: currentMap));
    } else if (state is AuthFailure) {
      emit(AuthFailure((state as AuthFailure).error, visibilityMap: currentMap));
    } else if (state is AuthLoading) {
      emit(AuthLoading(visibilityMap: currentMap));
    } else {
      emit(AuthPasswordVisibilityToggled(currentMap));
    }
  }

  // // Login handler
  // Future<void> onLoginPressed(
  //   LoginPressed event,
  //   Emitter<AuthState> emit,
  // ) async
  // {
  //   emit(AuthLoading());
  //   try {
  //     final loginResponse = await authRepository?.login(
  //       event.email,
  //       event.password,
  //     );
  //     log("Login successful with token: ${loginResponse?.teamId}");
  //     if (loginResponse?.token != null && loginResponse?.teamId != null) {
  //       emit(
  //         AuthSuccess(
  //           loginResponse!.message,
  //           token: loginResponse.token,
  //           teamId: loginResponse.teamId,
  //         ),
  //       );
  //     } else {
  //       emit(AuthFailure("Login failed - no token received"));
  //     }
  //   } catch (e) {
  //     emit(AuthFailure(e.toString()));
  //   }
  // }
  //

  Future<void> _onSendEmailPressed(
    SendEmailPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await authRepository!.forgotPassword(event.email);

      log("Forgot password response status: ${response.status}");

      if (response.status == Status.completed) {
        emit(
          ForgotPasswordSuccess(
            response.data?.message ?? 'OTP sent successfully',
          ),
        );
      } else {
        emit(AuthFailure(response.message));
      }
    } catch (e) {
      log('Error in forgot password: $e');
      emit(AuthFailure('Failed to process your request'));
    }
  }

  Future<void> _onSendOtpPressed(
    SendOtpPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final result = await authRepository!.verifyOtp(event.email, event.otp);
      emit(
        OtpVerifiedSuccess(
          message: result.message,
          showProfileScreen: result.showProfileScreen,
        ),
      );
    } catch (e) {
      final errorMessage = e.toString().replaceAll('Exception: ', '');
      log("ERROR: $errorMessage");
      emit(AuthFailure(errorMessage));
    }
  }

  Future<void> onSubmitPressed(
    SubmitPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      // Your password change logic here
      // Emit only one success for simplicity
      emit(AuthSuccess("Password updated successfully"));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  void onRememberMeToggled(RememberMeToggled event, Emitter<AuthState> emit) {
    emit(AuthUpdated(event.value));
  }

  Future<void> onCreateTeamPressed(
    CreateTeamPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      _teamName = event.teamName;
      log("Team Created: $_teamName");
      emit(TeamCreatedSuccess(_teamName!));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  Future<void> _onGoogleSignInPressed(
    GoogleSignInPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    // Google sign-in logic here
    // try {
    //   final credential = await SignInWithApple.getAppleIDCredential(...);
    //   // convert to OAuth credential and sign in...
    emit(AuthSuccess(event.toString()));
    // } catch (e) {
    //   emit(AuthFailure(e.toString()));
    // }
  }

  Future<void> _onAppleSignInPressed(
    AppleSignInPressed event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    // Apple sign-in logic here
    // try {
    //   final credential = await SignInWithApple.getAppleIDCredential(...);
    //   // convert to OAuth credential and sign in...
    emit(AuthSuccess(event.toString()));
    // } catch (e) {
    //   emit(AuthFailure(e.toString()));
    // }
  }
}
