import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:teamwise/common/index.dart';
import 'package:teamwise/core/network/api_response.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../../core/network/endpoints.dart';

import '../../../chat/presentation/bloc/chat_bloc.dart';
import '../../../chat/socket_service.dart';
import '../auth_services.dart';
import '../models/TeamProfileResponse.dart';
import '../models/check_email_model.dart';
import '../models/common_model.dart';
import '../models/custom_fields.dart';
import '../models/login_model.dart';
import '../models/team_model.dart';

class AuthApi {
  final ApiManager apiManager;
  AuthBloc? authBloc;
  final AuthService _authService = AuthService(); // Add this

  AuthApi(this.apiManager, {this.authBloc});

  Future<Map<String, String>> _getAuthHeaders() async {
    return _authService.getAuthHeaders();
  }

  Future<CheckEmailModel> checkEmail(String email) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.checkEmail,
        body: {'email': email},
      );

      final statusCode = response.statusCode;
      final data = response.data;

      // STATUS CODE WISE HANDLING
      if (statusCode == 200 || statusCode == 201) {
        // AppToast.showMessage('Email verified successfully');
        return CheckEmailModel.fromJson(data);
      } else if (statusCode == 400) {
        AppToast.showError(data['message'] ?? 'Invalid request');

        throw Exception('Bad request');
      } else if (statusCode == 401) {
        AppToast.showError(data['message'] ?? 'Unauthorized access');
        throw Exception('Unauthorized');
      } else if (statusCode == 404) {
        AppToast.showError(data['message'] ?? 'Endpoint not found');
        throw Exception('Not found');
      } else if (statusCode == 500) {
        AppToast.showError(data['message'] ?? 'Server error. Try again later');
        throw Exception('Server error');
      }

      // DEFAULT
      AppToast.showError(data['message'] ?? 'Unexpected error');
      throw Exception('Unexpected error');
    } catch (e, s) {
      log('Error in checkEmail: $e///$s');

      // HANDLE DIO ERROR
      if (e is DioException) {
        final status = e.response?.statusCode;
        final msg = e.response?.data['message'];

        AppToast.showError(msg ?? 'Something went wrong ($status)');
      } else {
        AppToast.showError('Something went wrong');
      }

      throw Exception('Failed to check email');
    }
  }

  Future<ApiResponse> savePlayerId(String playerId) async {
    try {
      if (playerId.isEmpty) {
        log('⚠️ Empty player ID provided');
        return ApiResponse.error('Player ID is required');
      }

      // Validate auth
      if (!_authService.isAuthenticated || _authService.userId == null) {
        log('⚠️ User not authenticated, cannot save Player ID');
        return ApiResponse.error('User not authenticated');
      }

      final headers = await _getAuthHeaders();

      log('📤 Saving Player ID to backend...');
      log('   User ID: ${_authService.userId}');
      log('   Player ID: $playerId');
      log('   Team ID: ${_authService.teamId}');

      final response = await apiManager.put(
        ApiEndpoints.savePlayerId,
        body: {'playerId': playerId},
        headers: headers,
      );
      log("savePlayerId::${ApiEndpoints.savePlayerId}");
      log("response.data::${response.data}");

      final statusCode = response.statusCode ?? 0;
      final message =
          response.data['message'] ?? 'Player ID saved successfully';

      log('📩 Save Player ID response - Status: $statusCode');

      if (statusCode >= 200 && statusCode < 300) {
        log('✅ Player ID saved successfully');

        // Clear any pending player ID from SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('pending_player_id');

        return ApiResponse.completed(response.data, message);
      } else {
        log('❌ Failed to save Player ID: $statusCode');
        AppToast.showError(message);
        return ApiResponse.error(message, statusCode: statusCode);
      }
    } on DioException catch (e) {
      final errorMessage =
          e.response?.data?['message'] ?? 'Failed to save Player ID';
      log('❌ Dio error in savePlayerId: $errorMessage');
      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
      );
    } catch (e, s) {
      log('🔥 Unexpected error saving Player ID: $e\n$s');
      return ApiResponse.error('Failed to save Player ID');
    }
  }

  // GET /custom-field/all
  Future<List<CustomFieldModel>> getAllFields() async {
    try {
      final res = await apiManager.get(
        ApiEndpoints.customField,
        headers: await _getAuthHeaders(),
      );

      if (res.statusCode == 200 && res.data is Map<String, dynamic>) {
        final data = res.data as Map<String, dynamic>;
        final fieldsList = data['fields'] as List<dynamic>? ?? [];

        // Convert each item to CustomFieldModel
        return fieldsList
            .map((e) => CustomFieldModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        log("❌ Invalid API response: ${res.data}");
        return [];
      }
    } catch (e, st) {
      log('❌ Error fetching custom fields: $e\n$st');
      return [];
    }
  }

  // PUT /custom-field/user/value
  Future<CustomFieldModel> updateUserFieldValue(
    Map<String, dynamic> selectedValues,
  ) async {
    try {
      final encodedValue = {"value": selectedValues.toString()};
      log('📤 PUT Body: $encodedValue');

      var response = await apiManager.put(
        ApiEndpoints.updateCustomField,
        body: encodedValue,
        headers: await _getAuthHeaders(),
      );
      log("response: PUT :${response.data}//${response.statusCode}");
      if (response.statusCode == 200 || response.statusCode == 201) {
        log("✅ Field values updated successfully");
        return CustomFieldModel.fromJson(response.data);
      } else {
        log("response.data::${response.data}");
        final errorMsg = response.message ?? 'Failed to update field values';
        return CustomFieldModel.fromJson(errorMsg);
      }
    } catch (e, st) {
      log('❌ Error updating field values: $e\n$st');
      rethrow;
    }
  }

  Future<VerifyOtpResponse> verifyOtp(String email, String otp) async {
    final data = {'email': email, 'otp': int.tryParse(otp) ?? otp};

    try {
      final response = await apiManager.post(
        ApiEndpoints.verifyOtp,
        body: data,
      );

      log(
        "response.data::${response.data}///statusCode:${response.statusCode}",
      );

      // ✅ Status code check કરો
      if (response.statusCode == 200 || response.statusCode == 201) {
        final message = response.data['message'] ?? 'OTP verified successfully';
        AppToast.showMessage(message);
        return VerifyOtpResponse.fromJson(response.data);
      } else {
        // ❌ Error case
        final errorMsg = response.data['message'] ?? 'Invalid or expired OTP';
        log("OTP Verification Failed: $errorMsg");
        throw Exception(errorMsg); // ⭐ Exception throw કરો
      }
    } catch (e) {
      log("verifyOtp ERROR: $e");
      // Re-throw exception so Bloc can catch it
      rethrow;
    }
  }

  Future<TeamProfileResponse?> createTeamProfile(
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.createProfile,
        body: data,
      );

      log('Team profile response: ${response.data}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Setup profile response: ${response.data}');
        AppToast.showMessage(response.data['message']);

        return TeamProfileResponse.fromJson(response.data);
      } else {
        final message = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(message);
        throw ApiResponse.error(message);
      }
    } on DioException catch (e) {
      log('Dio error in createTeamProfile: ${e.response?.data ?? e.message}');
      AppToast.showError(e.toString());
    } catch (e, s) {
      log('Unexpected error in createTeamProfile: $e////$s');
    }
    return null;
  }

  // Future<LoginResponse?> login(String email, String password) async {
  //   try {
  //     final data = {'email': email, 'password': password};
  //     final response = await apiManager.post(ApiEndpoints.login, body: data);
  //     log("data::$data////${response.data}");
  //     final statusCode = response.statusCode ?? 0;
  //     final responseData = response.data;
  //     log("responseData::${responseData}");
  //     final message = responseData['message'] ?? '';
  //     log("statusCode::$statusCode");
  //
  //     if (statusCode >= 400 && statusCode <= 404) {
  //       AppToast.showError(message.isNotEmpty ? message : 'Login failed');
  //       return null;
  //     }
  //     if (statusCode == 500) {
  //       AppToast.showError(message.isNotEmpty ? message : 'Server error');
  //       return null;
  //     }
  //
  //     if (message.isNotEmpty) {
  //       AppToast.showMessage(message);
  //     }
  //
  //     return LoginResponse.fromJson(responseData);
  //   } catch (e, stackTrace) {
  //     log('Login error: $e\n$stackTrace');
  //     AppToast.showError(e.toString());
  //     return null;
  //   }
  // }
  // auth_api.dart માં આ method add કરો
  Future<Map<String, dynamic>?> getRawLoginResponse(
    String email,
    String password,
  ) async {
    try {
      final data = {'email': email, 'password': password};
      final response = await apiManager.post(ApiEndpoints.login, body: data);
      return response.data;
    } catch (e) {
      log('getRawLoginResponse error: $e');
      return null;
    }
  }

  Future<LoginResponse?> login(String email, String password) async {
    try {
      final data = {'email': email, 'password': password};
      final response = await apiManager.post(ApiEndpoints.login, body: data);

      final statusCode = response.statusCode ?? 0;
      final responseData = response.data;

      log("Full Response Data: ${responseData.toString()}");
      log("User Data: ${responseData['user']}");
      log("Token: ${responseData['token']}");
      SharedPreferences preferences = await SharedPreferences.getInstance();

      if (statusCode >= 400) {
        AppToast.showError(responseData['message'] ?? 'Login failed');
        return null;
      }

      final loginResponse = LoginResponse.fromJson(responseData);
      log(
        "Parsed LoginResponse - User ID: ${loginResponse.user.id}, Name: ${loginResponse.user.name}",
      );
      preferences.setString("token", loginResponse.token);
      preferences.setString("teamId", loginResponse.teamId.toString());
      preferences.setString("userName", loginResponse.user.name);
      preferences.setString("userId", loginResponse.user.id.toString());
      preferences.setString("userEmail", loginResponse.user.email);
      preferences.setString(
        "customFiled",
        loginResponse.teamCustomField.toString(),
      );
      return loginResponse;
    } catch (e, stackTrace) {
      log('Login error: $e\n$stackTrace');
      AppToast.showError(e.toString());
      return null;
    }
  }

  List<Map<String, dynamic>>? pages;

  Future<void> settingsApi() async {
    try {
      final response = await apiManager.get(ApiEndpoints.setting);
      final data = response.data;
      log("data::$data");
      if (data["pages"] != null) {
        pages = List<Map<String, dynamic>>.from(data["pages"]);
      }

      log("✅ Pages Loaded: ${pages?.map((e) => e['slug']).toList()}");
    } catch (e) {
      log("❌ settingsApi error: $e");
    }
  }

  // settingsApi() async {
  //   // Validate auth
  //
  //
  //   try {
  //     final response = await apiManager.get(
  //       ApiEndpoints.setting,
  //     );
  //     final message = response.data['message']?.toString() ?? '';
  //     if (message.toLowerCase().contains('invalid token') ||
  //         message.toLowerCase().contains('user not found')) {
  //
  //       throw DioException(
  //         requestOptions: RequestOptions(path: ApiEndpoints.getChats),
  //         response: Response(
  //           requestOptions: RequestOptions(path: ApiEndpoints.getChats),
  //           statusCode: 401,
  //           data: response.data,
  //         ),
  //       );
  //     }
  //
  //
  //     log('Public Setting response: ${response.data}');
  //     // teamSettingModel = TeamSetting.fromJson(response.data['teamSetting']);
  //     // log('teamSetting response MODWL: ${teamSettingModel?.audioCallsEnabled}');
  //     // final model = TeamSettingModel.fromJson(response.data);
  //     return response.data;
  //   } on DioException catch (e) {
  //
  //     serviceLocator<AuthBloc>().add(LogoutPressed());
  //     log("e::$e");
  //     return Future.error("Session expired. Please login again.");
  //
  //
  //   } catch (e, s) {
  //     log("message =-=-=-===- $e =--=-= $s");
  //     rethrow;
  //   }
  // }
  Future<ResendOtpResponse> resendOtp(String email) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.resendOtp,
        body: {'email': email},
      );

      final message = response.data['message'] ?? 'OTP resent';
      AppToast.showMessage(message);
      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Setup profile response: ${response.data}');

        return ResendOtpResponse.fromJson(response.data);
      } else {
        final errorMessage = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(errorMessage);
        throw Exception(errorMessage);
      }
    } catch (e) {
      log('Error in resendOtp: $e');
      throw Exception('Failed to resend OTP');
    }
  }

  Future<List<TeamModel>> searchTeams({
    String? term,
    required String email,
  }) async {
    try {
      final response = await apiManager.get(
        ApiEndpoints.findTeam,
        queryParams: {'term': term, 'email': email},
      );
      log("RESPONSE:: $response");

      final List<dynamic> teamsJson = response.data['teams'] as List<dynamic>;

      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Setup profile response: ${response.data}');

        return teamsJson.map((json) => TeamModel.fromJson(json)).toList();
      } else {
        final message = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(message);
        throw Exception(message);
      }
    } catch (e) {
      log('Error in searchTeams: $e');
      throw Exception('Failed to fetch teams');
    }
  }

  Future<void> joinTeam({int? teamId, String? email}) async {
    final data = {'team_id': teamId, 'email': email};

    try {
      final response = await apiManager.post(ApiEndpoints.joinTeam, body: data);

      if (response.statusCode == 200) {
      } else {
        throw Exception('Unexpected response');
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data['message'] ?? 'Unknown error';

      if (status == 409) {
        throw Exception(message);
      } else {
        log('DioException in joinTeam: $message');
        throw Exception('Error $status: $message');
      }
    } catch (e, s) {
      log('Error in joinTeam: $e-=-=-=$s');
      throw Exception('Failed to join team');
    }
  }

  Future<ApiResponse> createChannel(Map<String, dynamic> data) async {
    try {
      SharedPreferences preferences = await SharedPreferences.getInstance();

      var token = AuthService().token;
      var teamId = AuthService().teamId;
      final response = await apiManager.post(
        ApiEndpoints.createChannel,
        body: data,
        headers: {
          if (teamId != null) 'X-Team-ID': teamId.toString(),
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      log(
        'Channel creation response: ${response.statusCode} - ${response.data}',
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return ApiResponse.completed(
          response.data,
          response.data['message'] ?? 'Channel created successfully',
        );
      } else {
        final errorMessage =
            response.data['message'] ??
            'Failed to create channel (Status: ${response.statusCode})';

        if (response.statusCode == 500) {
          AppToast.showError('Server error: $errorMessage');
        }

        return ApiResponse.error(errorMessage, statusCode: response.statusCode);
      }
    } catch (e, s) {
      log('Error creating channel: $e///$s');
      return ApiResponse.error('Failed to create channel: ${e.toString()}');
    }
  }

  Future<ApiResponse<ForgotPasswordResponse>> forgotPassword(
    String email,
  ) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.forgotPassword,
        body: {'email': email},
      );

      // Ensure the response has the expected structure
      if (response.data is! Map<String, dynamic>) {
        return ApiResponse.error('Invalid response format');
      }
      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Forgot password response: ${response.data}');

        return ApiResponse.fromJson(
          response.data as Map<String, dynamic>,
          ForgotPasswordResponse.fromJson,
        );
      } else {
        final message = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(message);
        return ApiResponse.error(message);
      }
    } on DioException catch (e) {
      log('Dio error in forgotPassword: ${e.response?.data ?? e.message}');
      return ApiResponse.error(
        e.response?.data['message'] ?? 'Failed to send password reset',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      log('Unexpected error in forgotPassword: $e');
      return ApiResponse.error('An unexpected error occurred');
    }
  }

  Future<ApiResponse> resetPassword(
    String email,
    String otp,
    String newPassword,
  ) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.resetPassword, // make sure this is your correct endpoint
        body: {'email': email, 'otp': otp, 'new_password': newPassword},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Setup profile response: ${response.data}');

        return ApiResponse.fromJson(response.data, (data) => data);
      } else {
        final message = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(message);
        return ApiResponse.error(message);
      }
    } catch (e) {
      return ApiResponse.error(e.toString());
    }
  }

  Future<ApiResponse> setupProfile(Map<String, dynamic> data) async {
    try {
      log('Making PUT request to setup profile with data: $data');
      final response = await apiManager.put(
        ApiEndpoints.setUpProfile,
        body: data,
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        log('Setup profile response: ${response.data}');

        return ApiResponse.completed(response.data);
      } else {
        final message = response.data['message'] ?? 'Something went wrong';
        AppToast.showError(message);
        return ApiResponse.error(message);
      }
    } on DioException catch (e) {
      final errorMessage =
          e.response?.data['message'] ?? e.message ?? 'Failed to setup profile';
      log('Dio error in setupProfile: $errorMessage');
      return ApiResponse.error(errorMessage);
    } catch (e) {
      log('Unexpected error in setupProfile: $e');
      return ApiResponse.error(e.toString());
    }
  }

  Future<ApiResponse> inviteTeamMembers(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString("token");
      final teamId = prefs.getString("teamId");

      log('📤 Invite Team → $data  | token=$token | teamId=$teamId');

      final response = await apiManager.post(
        ApiEndpoints.inviteTeamMembers,
        body: data,
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          if (teamId != null) 'X-Team-ID': teamId,
        },
      );

      final statusCode = response.statusCode ?? 0;
      final message = response.data['message'] ?? 'Something went wrong';

      log("📩 statusCode: $statusCode");

      if (statusCode >= 200 && statusCode < 300) {
        AppToast.showMessage(message);
        return ApiResponse.completed(response.data);
      }

      AppToast.showError(message);
      return ApiResponse.error(message);
    } on DioException catch (e) {
      final message =
          e.response?.data['message'] ??
          e.message ??
          'Failed to invite team members';

      log("❌ DioException: $message");
      AppToast.showError(message);
      return ApiResponse.error(message);
    } catch (e, s) {
      log("❌ Unexpected error: $e -= $s");
      /*  AppToast.showError("Something went wrong"); */
      return ApiResponse.error("Something went wrong");
    }
  }
}

class AuthApiEnhanced {
  final ApiManager apiManager;
  AuthBloc? authBloc;
  final AuthService _authService = AuthService(); // Add this

  AuthApiEnhanced(this.apiManager, {this.authBloc});

  // Helper method for handling common API errors
  String _handleApiError(DioException e) {
    if (e.response?.data is Map<String, dynamic>) {
      return e.response?.data['message'] ?? e.message ?? 'Unknown error';
    }
    return e.message ?? 'Network error occurred';
  }

  Future<VerifyOtpResponse> verifyOtp(String email, String otp) async {
    try {
      if (email.isEmpty || otp.isEmpty) {
        throw Exception('Email and OTP are required');
      }

      final otpInt = int.tryParse(otp.trim());
      final data = {
        'email': email.trim().toLowerCase(),
        'otp': otpInt ?? otp.trim(),
      };

      final response = await apiManager.post(
        ApiEndpoints.verifyOtp,
        body: data,
      );

      log(
        "OTP verification response: ${response.data} | Status: ${response.statusCode}",
      );

      final message = response.data['message'] ?? 'OTP verified successfully';
      AppToast.showMessage(message);

      return VerifyOtpResponse.fromJson(response.data);
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Error in verifyOtp: $errorMessage');
      AppToast.showError(errorMessage);
      throw Exception(errorMessage);
    } catch (e, s) {
      log('Unexpected error in verifyOtp: $e\n$s');
      AppToast.showError('Failed to verify OTP');
      throw Exception('Failed to verify OTP');
    }
  }

  // Future<LoginResponse?> createTeamProfile(Map<String, dynamic> data) async {
  //   try {
  //     // Validate required fields
  //     if (data['team_name']?.toString().trim().isEmpty ?? true) {
  //        AppToast.showError('Team name is required');
  //     }
  //
  //     final response = await apiManager.post(
  //       ApiEndpoints.createProfile,
  //       body: data,
  //     );
  //
  //     log('Team profile response: ${response.data}');
  //
  //     final message =
  //         response.data['message'] ?? 'Team profile created successfully';
  //     AppToast.showMessage(message);
  //
  //     return response;
  //   } on DioException catch (e) {
  //     final errorMessage = _handleApiError(e);
  //     log('Dio error in createTeamProfile: $errorMessage');
  //     AppToast.showError(errorMessage);
  //   } catch (e, s) {
  //     log('Unexpected error in createTeamProfile: $e\n$s');
  //     const errorMessage = 'Failed to create team profile';
  //     AppToast.showError(errorMessage);
  //   }
  // }

  Future<LoginResponse?> login(String email, String password) async {
    try {
      // Validate inputs
      if (email.isEmpty || password.isEmpty) {
        AppToast.showError('Email and password are required');
        return null;
      }

      if (!email.contains('@')) {
        AppToast.showError('Please enter a valid email address');
        return null;
      }

      final data = {'email': email.trim().toLowerCase(), 'password': password};
      log('Login request initiated');

      final response = await apiManager.post(ApiEndpoints.login, body: data);
      final statusCode = response.statusCode ?? 0;
      final responseData = response.data;

      log("Login response status: $statusCode");

      if (statusCode >= 400) {
        final errorMessage = responseData?['message'] ?? 'Login failed';
        AppToast.showError(errorMessage);
        return null;
      }

      // Validate response structure
      if (responseData == null ||
          responseData['user'] == null ||
          responseData['token'] == null) {
        const errorMessage = 'Invalid login response from server';
        log(errorMessage);
        AppToast.showError(errorMessage);
        return null;
      }

      final loginResponse = LoginResponse.fromJson(responseData);

      log("Login successful - User ID: ${loginResponse.user.id}");

      // 🔹 IMPORTANT: Save to AuthService immediately
      await _authService.saveAuthData(
        token: loginResponse.token,
        teamId: loginResponse.teamId,
        userId: loginResponse.user.id.toString(),
        userName: loginResponse.user.name,
        userEmail: loginResponse.user.email,
      );

      log("✅ Auth data saved to AuthService - TeamID: ${loginResponse.teamId}");

      // Show success message if available
      final successMessage = responseData['message'];
      if (successMessage?.isNotEmpty == true) {
        AppToast.showMessage(successMessage);
      }

      // 🔹 SOCKET & CHAT INIT
      final socketService = serviceLocator<SocketService>();
      socketService.setCurrentUserId(loginResponse.user.id.toString());
      socketService.initializeSocket(
        loginResponse.token,
        loginResponse.teamId.toString(),
        loginResponse.user.id.toString(),
        loginResponse.user.name.toString(),
      );

      final chatBloc = serviceLocator<ChatBloc>();
      chatBloc.initializeAuth(
        loginResponse.token,
        loginResponse.teamId,
        loginResponse.user.id.toString(),
        loginResponse.user.name,
      );

      return loginResponse;
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Login Dio error: $errorMessage');
      AppToast.showError(errorMessage);
      return null;
    } catch (e, stackTrace) {
      log('Login unexpected error: $e\n$stackTrace');
      AppToast.showError('Login failed. Please try again.');
      return null;
    }
  }

  // Helper method to get raw response for debugging
  Future<Map<String, dynamic>?> getRawLoginResponse(
    String email,
    String password,
  ) async {
    try {
      final data = {'email': email.trim().toLowerCase(), 'password': password};
      final response = await apiManager.post(ApiEndpoints.login, body: data);
      return response.data;
    } catch (e) {
      log('getRawLoginResponse error: $e');
      return null;
    }
  }

  Future<ResendOtpResponse> resendOtp(String email) async {
    try {
      if (email.isEmpty || !email.contains('@')) {
        throw Exception('Please enter a valid email address');
      }

      final response = await apiManager.post(
        ApiEndpoints.resendOtp,
        body: {'email': email.trim().toLowerCase()},
      );

      final message = response.data['message'] ?? 'OTP resent successfully';
      AppToast.showMessage(message);

      return ResendOtpResponse.fromJson(response.data);
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Error in resendOtp: $errorMessage');
      AppToast.showError(errorMessage);
      throw Exception(errorMessage);
    } catch (e, s) {
      log('Unexpected error in resendOtp: $e\n$s');
      AppToast.showError('Failed to resend OTP');
      throw Exception('Failed to resend OTP');
    }
  }

  Future<List<TeamModel>> searchTeams({
    String? term,
    required String email,
  }) async {
    try {
      if (email.isEmpty) {
        throw Exception('Email is required for team search');
      }

      final queryParams = {
        'email': email.trim().toLowerCase(),
        if (term?.isNotEmpty == true) 'term': term!.trim(),
      };

      final response = await apiManager.get(
        ApiEndpoints.findTeam,
        queryParams: queryParams,
      );

      log("Team search response: ${response.data}");

      // Handle empty results
      if (response.data['teams'] == null) {
        return [];
      }

      final List<dynamic> teamsJson = response.data['teams'] as List<dynamic>;
      return teamsJson.map((json) => TeamModel.fromJson(json)).toList();
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Error in searchTeams: $errorMessage');
      throw Exception(errorMessage);
    } catch (e, s) {
      log('Unexpected error in searchTeams: $e\n$s');
      throw Exception('Failed to search teams');
    }
  }

  Future<void> joinTeam({required int teamId, required String email}) async {
    try {
      if (email.isEmpty) {
        throw Exception('Email is required');
      }

      final data = {'team_id': teamId, 'email': email.trim().toLowerCase()};

      final response = await apiManager.post(ApiEndpoints.joinTeam, body: data);

      if (response.statusCode == 200) {
        final message = response.data['message'] ?? 'Successfully joined team';
        AppToast.showMessage(message);
      } else {
        throw Exception('Unexpected response: ${response.statusCode}');
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data?['message'] ?? 'Failed to join team';

      log('DioException in joinTeam: Status: $status, Message: $message');

      if (status == 409) {
        AppToast.showError(message);
        throw Exception(message);
      } else if (status == 404) {
        AppToast.showError('Team not found');
        throw Exception('Team not found');
      } else {
        AppToast.showError(message);
        throw Exception(message);
      }
    } catch (e, s) {
      log('Unexpected error in joinTeam: $e\n$s');
      AppToast.showError('Failed to join team');
      throw Exception('Failed to join team');
    }
  }

  Future<ApiResponse> createChannel(Map<String, dynamic> data) async {
    try {
      // Validate auth
      if (!_authService.validateAuthState()) {
        return ApiResponse.error('User not authenticated');
      }

      // Validate required fields
      if (data['name']?.toString().trim().isEmpty ?? true) {
        return ApiResponse.error('Channel name is required');
      }

      final headers = _authService.getAuthHeaders();

      final response = await apiManager.post(
        ApiEndpoints.createChannel,
        body: data,
        headers: headers,
      );

      log(
        'Channel creation response: ${response.statusCode} - ${response.data}',
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final message =
            response.data['message'] ?? 'Channel created successfully';
        // AppToast.showMessage(message);
        return ApiResponse.completed(response.data, message);
      } else {
        final errorMessage =
            response.data['message'] ??
            'Failed to create channel (Status: ${response.statusCode})';
        AppToast.showError(errorMessage);
        return ApiResponse.error(errorMessage, statusCode: response.statusCode);
      }
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Error creating channel: $errorMessage');
      AppToast.showError(errorMessage);
      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
      );
    } catch (e, s) {
      log('Unexpected error creating channel: $e\n$s');
      const errorMessage = 'Failed to create channel';
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    }
  }

  Future<ApiResponse<ForgotPasswordResponse>> forgotPassword(
    String email,
  ) async {
    try {
      if (email.isEmpty || !email.contains('@')) {
        return ApiResponse.error('Please enter a valid email address');
      }

      final response = await apiManager.post(
        ApiEndpoints.forgotPassword,
        body: {'email': email.trim().toLowerCase()},
      );

      log(
        "Forgot password response: ${response.statusCode} - ${response.data}",
      );

      // Validate response structure
      if (response.data is! Map<String, dynamic>) {
        return ApiResponse.error('Invalid response format from server');
      }

      final apiResponse = ApiResponse.fromJson(
        response.data as Map<String, dynamic>,
        ForgotPasswordResponse.fromJson,
      );

      // Show success message if available
      if (apiResponse.data != null && apiResponse.message?.isNotEmpty == true) {
        AppToast.showMessage(apiResponse.message!);
      }

      return apiResponse;
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Dio error in forgotPassword: $errorMessage');
      AppToast.showError(errorMessage);
      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
      );
    } catch (e, s) {
      log('Unexpected error in forgotPassword: $e\n$s');
      const errorMessage = 'Failed to send password reset request';
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    }
  }

  Future<ApiResponse> resetPassword(
    String email,
    String otp,
    String newPassword,
  ) async {
    try {
      // Validate inputs
      if (email.isEmpty || !email.contains('@')) {
        return ApiResponse.error('Please enter a valid email address');
      }
      if (otp.trim().isEmpty) {
        return ApiResponse.error('OTP is required');
      }
      if (newPassword.length < 6) {
        return ApiResponse.error('Password must be at least 6 characters long');
      }

      final response = await apiManager.post(
        ApiEndpoints.resetPassword,
        body: {
          'email': email.trim().toLowerCase(),
          'otp': otp.trim(),
          'new_password': newPassword,
        },
      );

      final apiResponse = ApiResponse.fromJson(response.data, (data) => data);

      // Show success message if available
      if (apiResponse.message?.isNotEmpty == true) {
        AppToast.showMessage(apiResponse.message!);
      }

      return apiResponse;
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Error in resetPassword: $errorMessage');
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    } catch (e, s) {
      log('Unexpected error in resetPassword: $e\n$s');
      const errorMessage = 'Failed to reset password';
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    }
  }

  Future<ApiResponse> setupProfile(Map<String, dynamic> data) async {
    try {
      // Validate required fields
      if (data['name']?.toString().trim().isEmpty ?? true) {
        return ApiResponse.error('Name is required');
      }

      log(
        'Making PUT request to setup profile with data keys: ${data.keys.toList()}',
      );

      final response = await apiManager.put(
        ApiEndpoints.setUpProfile,
        body: data,
      );

      log('Setup profile response: ${response.data}');

      final message =
          response.data['message'] ?? 'Profile updated successfully';
      AppToast.showMessage("Profile updated successfully");

      return ApiResponse.completed(response.data, message);
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('Dio error in setupProfile: $errorMessage');
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    } catch (e, s) {
      log('Unexpected error in setupProfile: $e\n$s');
      const errorMessage = 'Failed to setup profile';
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    }
  }

  Future<ApiResponse> inviteTeamMembers(Map<String, dynamic> data) async {
    try {
      // Validate auth
      if (!_authService.validateAuthState()) {
        return ApiResponse.error('User not authenticated');
      }

      // Validate required fields
      if (data['emails'] == null || (data['emails'] as List).isEmpty) {
        return ApiResponse.error('At least one email is required');
      }

      final headers = _authService.getAuthHeaders();

      log('📤 Inviting team members with TeamID: ${_authService.teamId}');

      final response = await apiManager.post(
        ApiEndpoints.inviteTeamMembers,
        body: data,
        headers: headers,
      );

      final statusCode = response.statusCode ?? 0;
      final message =
          response.data['message'] ?? 'Invitations sent successfully';

      log("✅ Invite response - Status: $statusCode");

      if (statusCode >= 200 && statusCode < 300) {
        AppToast.showMessage(message);
        return ApiResponse.completed(response.data, message);
      } else if (statusCode >= 400 && statusCode < 500) {
        AppToast.showError(message);
        return ApiResponse.error(message, statusCode: statusCode);
      } else {
        AppToast.showError('Server error occurred');
        return ApiResponse.error(message, statusCode: statusCode);
      }
    } on DioException catch (e) {
      final errorMessage = _handleApiError(e);
      log('❌ Dio error in inviteTeamMembers: $errorMessage');
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    } catch (e, s) {
      log('❌ Unexpected error in inviteTeamMembers: $e\n$s');
      const errorMessage = 'Failed to invite team members';
      AppToast.showError(errorMessage);
      return ApiResponse.error(errorMessage);
    }
  }
}
