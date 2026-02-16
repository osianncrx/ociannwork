import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:teamwise/features/dashboard/data/models/team_setting_model.dart';
import 'package:teamwise/features/dashboard/data/models/update_profile_model.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../../core/network/app_constants.dart';
import '../../../../core/network/endpoints.dart';
import '../../../auth/data/auth_services.dart';
import '../models/files_model.dart';

class DashboardApi {
  final ApiManager apiManager;
  final AuthBloc authBloc;
  final AuthService _authService = AuthService(); // Add this

  DashboardApi(this.apiManager, this.authBloc);

  Future<Map<String, String>> _getAuthHeaders() async {
    return _authService.getAuthHeaders();
  }

  Future<void> pinChat(
    String chatId, {
    required bool pin,
    required String type,
  }) async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log("pin:::: $pin///$chatId///$type");
    log("🔐 Using TeamID: ${_authService.teamId}");

    try {
      final response = await apiManager.post(
        ApiEndpoints.pinChat,
        body: {'type': type, 'target_id': int.parse(chatId), 'pin': pin},
        headers: await _getAuthHeaders(), // Uses AuthService
      );

      log("pinChat response: ${response.data}");
    } on DioException catch (e) {
      log('DioException in pinChat: ${e.response?.data ?? e.message}');
      rethrow;
    } catch (e) {
      log('Unexpected error in pinChat: $e');
      rethrow;
    }
  }

  Future<void> muteNotification({
    required int targetId,
    required String targetType, // "user" or "channel"
    required String duration, // "1h", "1d", "1w", "forever"
  }) async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log("🔇 Muting notification: $targetType/$targetId for $duration");
    log("🔐 Using TeamID: ${_authService.teamId}");

    try {
      final response = await apiManager.post(
        ApiEndpoints.muteNotification,
        body: {
          'target_id': targetId,
          'target_type': targetType,
          'duration': duration,
        },
        headers: await _getAuthHeaders(),
      );

      log("✅ muteNotification response: ${response.data}");
    } on DioException catch (e) {
      log(
        '❌ DioException in muteNotification: ${e.response?.data ?? e.message}',
      );
      rethrow;
    } catch (e) {
      log('❌ Unexpected error in muteNotification: $e');
      rethrow;
    }
  }

  Future<void> unmuteNotification({
    required int targetId,
    required String targetType, // "user" or "channel"
  }) async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log("🔔 Unmuting notification: $targetType/$targetId");
    log("🔐 Using TeamID: ${_authService.teamId}");

    try {
      final response = await apiManager.post(
        ApiEndpoints.unmuteNotification,
        body: {'target_id': targetId, 'target_type': targetType},
        headers: await _getAuthHeaders(),
      );

      log("✅ unmuteNotification response: ${response.data}");
    } on DioException catch (e) {
      log(
        '❌ DioException in unmuteNotification: ${e.response?.data ?? e.message}',
      );
      rethrow;
    } catch (e) {
      log('❌ Unexpected error in unmuteNotification: $e');
      rethrow;
    }
  }

  Future<List<MessageModel>> fetchChats() async {
    if (!_authService.validateAuthState()) {
      AppToast.showError("Session expired! Please login again.");
      // Don't call logout here - let interceptor handle it
      throw Exception('User not authenticated');
    }

    log("🔐 Fetching chats with TeamID: ${_authService.teamId}");

    try {
      final response = await apiManager.get(
        ApiEndpoints.getChats,
        headers: await _getAuthHeaders(),
      );

      final data = response.data;
      final statusCode = response.statusCode ?? 0;
      log("✅ fetchChats response ($statusCode): $data");
      log("🔍 fetchChats Runtime Type: ${data.runtimeType}");

      // Handle list responses
      if (data is List) {
        return data
            .map<MessageModel>((json) => MessageModel.fromJson(json))
            .toList();
      }

      if (data is Map<String, dynamic>) {
        // Check for invalid token FIRST
        final message = data['message']?.toString() ?? '';
        log("message.toLowerCase()::${message.toLowerCase()}");
        if (message.toLowerCase().contains('invalid token') ||
            message.toLowerCase().contains('user not found')) {
          serviceLocator<AuthBloc>().add(LogoutPressed());
          AppToast.showError("Session expired. Please login again.");
          throw Exception("Invalid token");
        }

        // Try different list keys
        for (final key in ['data', 'chats', 'messages', 'results']) {
          if (data[key] is List) {
            return (data[key] as List)
                .map<MessageModel>((json) => MessageModel.fromJson(json))
                .toList();
          }
        }

        // If no list found but has message
        if (message.isNotEmpty) {
          AppToast.showError(message);
          throw Exception(message);
        }
      }

      log(
        "⚠️ fetchChats: Unexpected response format. Status: $statusCode, Type: ${data.runtimeType}",
      );
      throw Exception("Unexpected response format (Status: $statusCode)");
    } on DioException catch (e) {
      serviceLocator<AuthBloc>().add(LogoutPressed());
      return Future.error("Session expired. Please login again.");
    } on SocketException {
      const msg =
          "Cannot connect to server. Please check your internet connection.";
      AppToast.showError(msg);
      throw Exception(msg);
    } catch (e, s) {
      log("❌ Unexpected fetchChats Error: $e\n$s");
      AppToast.showError(e.toString());
      rethrow;
    }
  }
  // Future<List<MessageModel>> fetchChats() async {
  //   if (!_authService.validateAuthState()) {
  //     AppToast.showError("Session expired! Please login again.");
  //     _authService.logout();
  //     throw Exception('User not authenticated');
  //   }
  //
  //   log("🔐 Fetching chats with TeamID: ${_authService.teamId}");
  //
  //   try {
  //     final response = await apiManager.get(
  //       ApiEndpoints.getChats,
  //       headers: await _getAuthHeaders(),
  //     );
  //
  //     final data = response.data;
  //     log("✅ fetchChats response: $data");
  //
  //     // ✅ Most common list formats
  //     if (data is List) {
  //       return data
  //           .map<MessageModel>((json) => MessageModel.fromJson(json))
  //           .toList();
  //     }
  //
  //     if (data is Map<String, dynamic>) {
  //       if (data['data'] is List) {
  //         return (data['data'] as List)
  //             .map<MessageModel>((json) => MessageModel.fromJson(json))
  //             .toList();
  //       }
  //       if (data['chats'] is List) {
  //         return (data['chats'] as List)
  //             .map<MessageModel>((json) => MessageModel.fromJson(json))
  //             .toList();
  //       }
  //       if (data['messages'] is List) {
  //         return (data['messages'] as List)
  //             .map<MessageModel>((json) => MessageModel.fromJson(json))
  //             .toList();
  //       }
  //       if (data['results'] is List) {
  //         return (data['results'] as List)
  //             .map<MessageModel>((json) => MessageModel.fromJson(json))
  //             .toList();
  //       }
  //
  //       // ✅ Unauthorized / Token Invalid
  //       if (data['message']?.toString().contains("Invalid token") ?? false) {
  //         AppToast.showError("Session expired. Please login again.");
  //         _authService.logout();
  //         throw Exception("Invalid token");
  //       }
  //
  //       // ✅ Any other unexpected Map
  //       AppToast.showError(data['message']?.toString() ?? "Unexpected server response");
  //       throw Exception(data['message']?.toString() ??
  //           "Unexpected response: no list found");
  //     }
  //
  //     // ✅ Unknown response type
  //     throw Exception("Unexpected response format");
  //   } on DioException catch (e) {
  //     final error = e.response?.data['message'] ?? e.message;
  //     log("❌ Dio Error: $error");
  //     AppToast.showError(error);
  //     throw Exception(error);
  //   } on SocketException {
  //     const msg =
  //         "Cannot connect to server. Please check your internet connection.";
  //     AppToast.showError(msg);
  //     throw Exception(msg);
  //   } catch (e, s) {
  //     log("❌ Unexpected fetchChats Error: $e\n$s");
  //     AppToast.showError(e.toString());
  //     throw Exception('Failed to fetch chats');
  //   }
  // }

  Future<List<MessageModel>> searchChats(String query) async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    try {
      final response = await apiManager.get(
        ApiEndpoints.searchChats,
        headers: await _getAuthHeaders(), // Uses AuthService
        queryParams: {'search': query},
      );

      log('searchChats response 123456: ${response.data}');

      final List<dynamic>? membersJson =
          response.data['members'] as List<dynamic>?;

      if (membersJson == null) {
        return [];
      }

      return membersJson.map((json) => MessageModel.fromJson(json)).toList();
    } on DioException catch (e) {
      log('Dio error in searchChats: ${e.response?.data ?? e.message}');
      throw Exception(e.response?.data['message'] ?? 'Search failed');
    } catch (e) {
      log('Unexpected error in searchChats: $e');
      throw Exception('Search failed');
    }
  }

  Future<TeamSettingModel> teamSetting() async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    try {
      final response = await apiManager.get(
        ApiEndpoints.teamSetting,
        headers: await _getAuthHeaders(), // Uses AuthService
      );
      final message = response.data['message']?.toString() ?? '';
      if (message.toLowerCase().contains('invalid token') ||
          message.toLowerCase().contains('user not found')) {
        serviceLocator<AuthBloc>().add(LogoutPressed());
        throw DioException(
          requestOptions: RequestOptions(path: ApiEndpoints.getChats),
          response: Response(
            requestOptions: RequestOptions(path: ApiEndpoints.getChats),
            statusCode: 401,
            data: response.data,
          ),
        );
      }

      log('teamSetting response: ${response.data['teamSetting']}');
      teamSettingModel = TeamSetting.fromJson(response.data['teamSetting']);
      log('teamSetting response MODWL: ${teamSettingModel?.audioCallsEnabled}');
      final model = TeamSettingModel.fromJson(response.data);
      return model;
    } on DioException catch (e) {
      serviceLocator<AuthBloc>().add(LogoutPressed());
      log("e::$e");
      return Future.error("Session expired. Please login again.");
    } catch (e, s) {
      log("message =-=-=-===- $e =--=-= $s");
      rethrow;
    }
  }

  Future<UpdateProfileResponse> updateProfile({
    required String name,
    String? avatarPath,
    String? countryCode,
    String? phone,
    String? country,
  }) async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    try {
      log("Calling updateProfile API///$countryCode, $country");

      FormData formData = FormData.fromMap({
        'name': name,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (country != null && country.isNotEmpty) 'country': country,
        if (countryCode != null && countryCode.isNotEmpty)
          'country_code': countryCode,
        if (avatarPath == null || avatarPath.isEmpty) 'remove_avatar': 'true',
      });

      if (avatarPath != null && avatarPath.isNotEmpty) {
        if (avatarPath.startsWith('/storage') ||
            avatarPath.startsWith('/data')) {
          formData.files.add(
            MapEntry(
              'avatar',
              await MultipartFile.fromFile(
                avatarPath,
                filename: avatarPath.split('/').last,
              ),
            ),
          );
        }
      }

      log("--- 📤 Update Profile Request Body 📤 ---");
      for (var field in formData.fields) {
        log("📝 Field: ${field.key} = ${field.value}");
      }
      for (var file in formData.files) {
        log(
          "📁 File: ${file.key} = ${file.value.filename}, Length: ${file.value.length}",
        );
      }
      log("-------------------------------------------");

      final headers = await _getAuthHeaders(); // Uses AuthService
      headers['Accept'] = 'application/json';

      final response = await apiManager.put(
        ApiEndpoints.updateProfile,
        body: formData,
        headers: headers,
      );

      log("updateProfile response: ${response.data}");

      // Update AuthService with new profile data
      await _authService.updateUserProfile(
        userName: response.data['user']?['name'],
        userEmail: response.data['user']?['email'],
      );

      return UpdateProfileResponse.fromJson(response.data);
    } on DioException catch (e) {
      log('DioException in updateProfile: ${e.response?.data ?? e.message}');
      throw Exception(
        e.response?.data['message'] ?? 'Failed to update profile',
      );
    } catch (e, s) {
      log('Unexpected error in updateProfile: $e///$s');
      rethrow;
    }
  }

  Future<UserDetailsResponse> getUserDetails() async {
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    try {
      final headers = await _getAuthHeaders(); // Uses AuthService
      headers['Accept'] = 'application/json';

      final response = await apiManager.get(
        ApiEndpoints.getUserDetails,
        headers: headers,
      );

      log("getUserDetails response: ${response.data}");

      final statusCode = response.statusCode ?? 0;
      final data = response.data;

      log("🔍 getUserDetails Response Status: $statusCode");
      log("🔍 getUserDetails Response Type: ${data.runtimeType}");

      if (data == null) {
        log("❌ getUserDetails: Response data is null");
        throw Exception('Server returned no data');
      }

      // Handle invalid token / user not found from response data
      if (data is Map<String, dynamic>) {
        final message = (data['message']?.toString() ?? '').toLowerCase();
        if (message.contains('invalid token') ||
            message.contains('token is invalid') ||
            message.contains('user not found')) {
          log("🚨 Session invalid detected in getUserDetails: $message");
          authBloc.add(LogoutPressed());
          throw Exception('Session expired');
        }
      } else if (data is String) {
        log(
          "❌ getUserDetails: Server returned String instead of Map. Data starts with: ${data.substring(0, data.length > 50 ? 50 : data.length)}",
        );
        throw Exception('Invalid server response format');
      }

      if (statusCode == 200) {
        if (data is! Map<String, dynamic>) {
          log("❌ getUserDetails: Data is not a Map, it is ${data.runtimeType}");
          throw Exception('Unexpected data format from server');
        }
        try {
          return UserDetailsResponse.fromJson(data);
        } catch (e, stack) {
          log("❌ getUserDetails: Error parsing UserDetailsResponse: $e");
          log("❌ Stacktrace: $stack");
          throw Exception('Error parsing user data: $e');
        }
      } else {
        final msg = (data is Map && data.containsKey('message'))
            ? data['message']
            : 'Failed to load profile (Status: $statusCode)';
        log("❌ getUserDetails failed with status $statusCode: $msg");
        throw Exception(msg);
      }
    } on DioException catch (e) {
      log('DioException in getUserDetails: ${e.response?.data ?? e.message}');

      final statusCode = e.response?.statusCode;
      if (statusCode == 401) {
        log("🚨 401 Unauthorized in getUserDetails - triggering logout");
        authBloc.add(LogoutPressed());
      }

      throw Exception(e.response?.data['message'] ?? 'Failed to load profile');
    } catch (e) {
      log('Unexpected error in getUserDetails: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateDND({
    required String duration,
    required bool value,
  }) async {
    try {
      final response = await apiManager
          .put(
            ApiEndpoints.updateDND,
            headers: await _getAuthHeaders(),
            body: {
              // ✅ Use 'data' instead of 'body'
              'duration': duration,
              'value': value,
            },
          )
          .timeout(const Duration(seconds: 30));

      log('📥 Update DND Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Data: ${response.data}'); // ✅ response.data

      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300) {
        final responseData = response.data as Map<String, dynamic>;
        log('✅ DND updated successfully');
        return responseData;
      } else {
        final errorMessage =
            (response.data as Map<String, dynamic>?)?['message'] ??
            'Unknown error occurred';
        throw HttpException('API Error ${response.statusCode}: $errorMessage');
      }
    } catch (e) {
      log('❌ Error in updateDND: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    log("payload of chnage password $currentPassword , $newPassword");
    // Validate auth
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    try {
      log("🔐 Changing password");

      final response = await apiManager.put(
        ApiEndpoints.changePassword,
        body: {'old_password': currentPassword, 'password': newPassword},
        headers: await _getAuthHeaders(),
      );
      log("payload of chnage password $currentPassword , $newPassword");
      log("✅ changePassword response: ${response.data}");

      final statusCode = response.statusCode ?? 0;
      if (statusCode >= 200 && statusCode < 300) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception(
          response.data['message'] ?? 'Failed to change password',
        );
      }
    } on DioException catch (e) {
      log('❌ DioException in changePassword: ${e.response?.data ?? e.message}');
      throw Exception(
        e.response?.data['message'] ?? 'Failed to change password',
      );
    } catch (e) {
      log('❌ Unexpected error in changePassword: $e');
      rethrow;
    }
  }

  Future<FilesData> fetchFiles({String? channelId, String? recipientId}) async {
    Uri uri;

    try {
      // ✅ Determine which ID to use
      if (channelId != null) {
        uri = Uri.parse("${ApiEndpoints.files}?channel_id=$channelId");
      } else if (recipientId != null) {
        uri = Uri.parse("${ApiEndpoints.files}?recipient_id=$recipientId");
      } else {
        throw Exception("Either channelId or recipientId is required");
      }

      log("📡 Fetching files from: $uri");

      // ✅ Perform GET request
      final response = await apiManager.get(
        uri.toString(),
        headers: await _getAuthHeaders(),
      );

      log("response::$response");

      if (response.statusCode == 200) {
        // ✅ Use response.data directly
        return FilesData.fromJson(response.data);
      } else {
        log("❌ Failed to load files. Status: ${response.statusCode}");
        throw Exception(
          "Failed to load files (status: ${response.statusCode})",
        );
      }
    } catch (e, st) {
      log("🚨 Exception while fetching files: $e\n$st");
      throw Exception("Error fetching files: $e");
    }
  }
}

TeamSetting? teamSettingModel;
