import 'package:teamwise/features/auth/data/models/team_model.dart';

import '../../../../core/network/api_response.dart';
import '../../data/models/TeamProfileResponse.dart';
import '../../data/models/check_email_model.dart';
import '../../data/models/login_model.dart';
import '../entities/check_email_entity.dart';

abstract class AuthRepository {
  Future<CheckEmailEntity> checkEmail(String email);
  Future<VerifyOtpResponse> verifyOtp(String email, String otp);
  Future<TeamProfileResponse> createTeamProfile(Map<String, dynamic> data);
  Future<LoginResponse?> login(String email, String password);
  Future<ResendOtpResponse> resendOtp(String email);

  Future<List<TeamModel>> searchTeams(String term, String email);
  Future<void> joinTeam(int teamId, String email);
  Future<ApiResponse> createChannel(Map<String, dynamic> data);
  Future<ApiResponse> forgotPassword(String email);
  Future<ApiResponse> resetPassword(
    String email,
    String otp,
    String newPassword,
  );
  Future<ApiResponse> setupProfile(Map<String, dynamic> data);
  Future<ApiResponse> inviteTeamMembers(Map<String, dynamic> data);
}
