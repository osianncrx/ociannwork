import 'dart:developer';

import 'package:teamwise/core/network/api_response.dart';
import 'package:teamwise/features/auth/data/models/team_model.dart';

import '../../domain/entities/check_email_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_api.dart';
import '../models/TeamProfileResponse.dart';
import '../models/check_email_model.dart';
import '../models/common_model.dart';
import '../models/login_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthApi api;

  AuthRepositoryImpl(this.api);

  @override
  Future<CheckEmailEntity> checkEmail(String email) async {
    final model = await api.checkEmail(email);
    log('📩 checkEmail response: $model');
    return CheckEmailEntity(
      userExists: model.userExists,
      emailVerified: model.emailVerified,
      isProfileUpdated: model.isProfileUpdated,
      message: model.message,
    );
  }

  @override
  Future<VerifyOtpResponse> verifyOtp(String email, String otp) async {
    final res = await api.verifyOtp(email, otp);
    return res;
  }

  @override
  Future<TeamProfileResponse> createTeamProfile(
    Map<String, dynamic> data,
  ) async {
    try {
      log('📤 Creating team profile with data: $data');
      final response = await api.createTeamProfile(data);

      if (response == null) {
        throw Exception('Server returned null response');
      }

      return response;
    } catch (e, s) {
      log('❌ Team profile creation failed: $e');
      rethrow; // Let caller handle the error
    }
  }

  @override
  Future<LoginResponse?> login(String email, String password) async {
    final res = await api.login(email, password);

    if (res == null) {
      return null;
    }

    log('🔐 login response: ${res.toString()}');
    return res;
  }

  @override
  Future<ResendOtpResponse> resendOtp(String email) async {
    final res = await api.resendOtp(email);
    log('🔁 resendOtp response: ${res.toString()}');
    return res;
  }

  @override
  Future<List<TeamModel>> searchTeams(String term, String email) async {
    final res = await api.searchTeams(term: term, email: email);
    log('🔎 searchTeams response: $res');
    return res;
  }

  @override
  Future<void> joinTeam(int teamId, String email) async {
    log('👥 joinTeam request => teamId: $teamId, email: $email');
    await api.joinTeam(teamId: teamId, email: email);
    log('✅ joinTeam completed');
  }

  @override
  Future<ApiResponse> createChannel(Map<String, dynamic> data) async {
    final result = await api.createChannel(data);
    log('📤 createChannel request completed');
    return result;
  }

  @override
  Future<ApiResponse<ForgotPasswordResponse>> forgotPassword(
    String email,
  ) async {
    final result = await api.forgotPassword(email);
    log("📩 Forgot password response: ${result.toString()}");
    return result;
  }

  @override
  Future<ApiResponse> resetPassword(
    String email,
    String otp,
    String newPassword,
  ) async {
    final result = await api.resetPassword(email, otp, newPassword);
    return result;
  }

  @override
  Future<ApiResponse> setupProfile(Map<String, dynamic> data) async {
    try {
      log('📤 Setup profile request: $data');
      final response = await api.setupProfile(data);
      log('✅ Setup profile completed');
      return response;
    } catch (e) {
      log('❌ Setup profile error: $e');
      return ApiResponse.error(e.toString());
    }
  }

  @override
  Future<ApiResponse> inviteTeamMembers(Map<String, dynamic> data) async {
    try {
      log('📤 Invite team members request: $data');
      final response = await api.inviteTeamMembers(data);
      log('✅ Invite team members completed');

      return response;
    } catch (e) {
      log('❌ Invite team members error: $e');
      return ApiResponse.error(e.toString());
    }
  }
}
