import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import 'package:teamwise/core/network/endpoints.dart';
import 'package:teamwise/features/chat/socket_service.dart';
import 'package:teamwise/features/dashboard/data/models/global_search_model.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../../core/network/api_response.dart';
import '../../../../core/network/app_constants.dart';
import '../../../auth/data/auth_services.dart';
import '../../../dashboard/data/models/conversations_data_model.dart';
import '../../../dashboard/domain/entities/conversation.dart';
import '../models/channel_info_model.dart';
import '../models/chat_message_model.dart';
import '../models/contact_profile_model.dart';

class ChatApi {
  final AuthBloc? authBloc;
  final ApiManager apiManager;
  final AuthService _authService = AuthService();

  ChatApi(this.authBloc, this.apiManager);

  Map<String, String> _getAuthHeaders() {
    return _authService.getAuthHeaders();
  }

  Future<void> updateMemberRole({
    required dynamic channelId,
    required dynamic userId,
    required String newRole,
  }) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.memberRole,
        headers: _getAuthHeaders(),
        body: {
          'channel_id': channelId,
          'user_id': userId.toString(),
          'new_role': newRole,
        },
      );

      log("✅ Role updated successfully: $response");
    } catch (e) {
      log("🔥 Error updating role: $e");
      rethrow;
    }
  }

  Future<void> addMembersToChannel({
    required dynamic channelId,
    required List<Map<String, dynamic>> members,
  }) async {
    try {
      final body = {"channel_id": channelId, "members": members};
      log("🚀 Adding members request: ${jsonEncode(body)}");

      final response = await apiManager.post(
        ApiEndpoints.addMembers,
        headers: _getAuthHeaders(),
        body: body,
      );

      log("📩 Response => ${response.statusCode} | ${response.data}");

      if (response.statusCode! < 200 || response.statusCode! >= 300) {
        final errorMessage = response.data.toString();
        throw Exception('Failed to add members: $errorMessage');
      }
      // socket!.on(SocketEvents.membersAdded, (data) {
      //  log('[${SocketEvents.membersAdded}] Members added: $data');
      //  _notifyEventCallbacks(SocketEvents.membersAdded, data);
      //  });
      log("✅ Members added successfully");
    } catch (e, s) {
      log("🔥 Error adding members: $e\n$s");
      rethrow;
    }
  }

  // Remove member from channel
  Future<void> removeMemberFromChannel({
    required dynamic channelId,
    required dynamic userId,
  }) async {
    try {
      final response = await apiManager.delete(
        ApiEndpoints.removeMembers,
        headers: _getAuthHeaders(),
        body: {"channel_id": channelId, "user_id": userId.toString()},
      );
      log("response::=>///$channelId////$userId");
      log("response::=>${response}///$channelId////$userId");
      if (response.statusCode! < 200 || response.statusCode! >= 300) {
        throw Exception('Failed to remove member');
      }
    } catch (e) {
      log("🔥 Error removing member: $e");
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchCurrentSubscription() async {
    try {
      final response = await http
          .get(
            Uri.parse(ApiEndpoints.currentSubscription),
            headers: _getAuthHeaders(),
          )
          .timeout(const Duration(seconds: 30));
      log("🔥 Error fetching current subscription: ${response.statusCode}");
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final errorResponse =
            jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage =
            errorResponse?['message'] ?? 'Unknown error occurred';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log("🔥 Error fetching current subscription: $e");
      rethrow;
    }
  }

  Future<void> savePublicKey(String publicKey) async {
    try {
      final response = await apiManager.post(
        '${AppConstants.baseUrl}/e2e/keys',
        headers: _getAuthHeaders(),
        body: {'public_key': publicKey},
      );
      if (response.statusCode != 200) {
        throw Exception('Failed to save public key');
      }
    } catch (e) {
      log("🔥 Error saving public key: $e");
      rethrow;
    }
  }

  Future<String?> getPublicKey(String userId) async {
    try {
      final response = await apiManager.get(
        '${AppConstants.baseUrl}/e2e/keys/$userId',
        headers: _getAuthHeaders(),
      );
      if (response.statusCode == 200) {
        return response.data['public_key'];
      }
      return null;
    } catch (e) {
      log("🔥 Error fetching public key for user $userId: $e");
      return null;
    }
  }

  Future<bool> getE2EStatus() async {
    try {
      final response = await apiManager.get(
        ApiEndpoints.e2eStatus,
        headers: _getAuthHeaders(),
      );
      if (response.statusCode == 200) {
        final e2eEnabled = response.data['e2e_enabled'] ?? false;
        log("🔐 E2E Status: $e2eEnabled");
        return e2eEnabled;
      }
      return false;
    } catch (e) {
      log("🔥 Error fetching E2E status: $e");
      return false;
    }
  }

  // Add this method to your existing ChatApi class
  Future<ApiResponse> createChannel(Map<String, dynamic> data, context) async {
    try {
      // Validate auth
      if (!_authService.validateAuthState()) {
        return ApiResponse.error('User not authenticated');
      }

      // Validate required fields
      if (data['name']?.toString().trim().isEmpty ?? true) {
        return ApiResponse.error('Channel name is required');
      }

      final response = await apiManager.post(
        ApiEndpoints.createChannel,
        body: data,
        headers: _getAuthHeaders(), // Now uses AuthService
      );

      log(
        'Channel creation response: ${response.statusCode} - ${response.data}',
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final message =
            response.data['message'] ?? 'Channel created successfully';
        // AppToast.showMessage(message);
        Navigator.pushReplacementNamed(context, routeName.dashboard);
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

  String _handleApiError(DioException e) {
    if (e.response?.data is Map<String, dynamic>) {
      return e.response?.data['message'] ?? e.message ?? 'Unknown error';
    }
    return e.message ?? 'Network error occurred';
  }

  Future<Map<String, dynamic>> forwardMessage({
    required String recipientId,
    required String content,
    required ChatMessageModel originalMessage,
    String? channelId,
    String messageType = 'text',
  }) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}/message/start');

      // Validate required fields
      if (content.isEmpty) {
        throw ArgumentError('Message content cannot be empty');
      }

      final headers = {
        ..._getAuthHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // Create forward metadata based on your API response structure
      final forwardMetadata = {
        "forwarded": true,
        "original_sender": {
          "id": originalMessage.sender.id ?? originalMessage.senderId,
          "name": originalMessage.sender.name ?? originalMessage.senderName,
          "email": originalMessage.sender.email ?? "",
          "avatar": originalMessage.sender.avatar,
        },
        "original_message_id": originalMessage.id,
      };

      // Build request body based on chat type
      final bodyMap = <String, dynamic>{
        'content': content,
        'message_type': messageType,
        'metadata': forwardMetadata, // Add metadata for forwarded message
      };

      if (channelId != null) {
        // Channel message
        bodyMap['channel_id'] = int.tryParse(channelId) ?? channelId;
        log('📤 Forwarding message to CHANNEL: $channelId');
      } else {
        // DM message
        bodyMap['recipient_id'] = int.tryParse(recipientId) ?? recipientId;
        log('📤 Forwarding message to DM recipient: $recipientId');
      }

      // Debug logs
      log('📤 Forward API Request Details:');
      log('  - URL: $url');
      log('  - Headers: $headers');
      log('  - Body: ${jsonEncode(bodyMap)}');

      final response = await http
          .post(url, headers: headers, body: jsonEncode(bodyMap))
          .timeout(const Duration(seconds: 30));

      log('📥 Forward Message Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Body: ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        log('✅ Message forwarded successfully via API');
        return responseData;
      } else {
        final errorResponse =
            jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage =
            errorResponse?['message'] ?? 'Unknown error occurred';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in forwardMessage: $e');
      rethrow;
    }
  }

  Future<ChannelInfo> channelInfo({required channelId}) async {
    try {
      final url = Uri.parse('${ApiEndpoints.channelInfo}/$channelId');

      final response = await http
          .get(url, headers: _getAuthHeaders())
          .timeout(const Duration(seconds: 30));

      log('📥 Channel Info Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Body: ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        // Convert JSON to ChannelInfo model
        channelInfoData = ChannelInfo.fromJson(responseData);
        final channelInfo = ChannelInfo.fromJson(responseData);
        log(
          '✅ Channel info parsed successfully ${channelInfo.channel.members.length}',
        );
        return channelInfo;
      } else {
        final errorResponse =
            jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage =
            errorResponse?['message'] ?? 'Unknown error occurred';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in channelInfo: $e');
      rethrow;
    }
  }

  Future<void> leaveChannel({required dynamic channelId}) async {
    try {
      final response = await apiManager
          .post(
            ApiEndpoints.channelLeave,
            headers: _getAuthHeaders(),
            body: {
              'channel_id': channelId,
            }, // Dio handles encoding automatically
          )
          .timeout(const Duration(seconds: 30));

      log('📥 Leave Channel Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Data: ${response.data}');

      if (response.statusCode! >= 200 && response.statusCode! < 300) {
        final responseData = response.data as Map<String, dynamic>;
        log('✅ ${responseData['message']}');
      } else {
        final errorResponse = response.data as Map<String, dynamic>?;
        final errorMessage =
            errorResponse?['message'] ?? 'Unknown error occurred';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in leaveChannel: $e');
      rethrow;
    }
  }

  Future<void> deleteChannel({required dynamic channelId}) async {
    try {
      final response = await apiManager.delete(
        ApiEndpoints.deleteChannel,
        headers: _getAuthHeaders(),
        body: {
          "ids": [int.tryParse(channelId.toString()) ?? channelId],
        },
      );

      log('📥 Delete Channel Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Data: ${response.data}');

      if (response.statusCode! < 200 || response.statusCode! >= 300) {
        final errorResponse = response.data as Map<String, dynamic>?;
        final errorMessage =
            errorResponse?['message'] ?? 'Unknown error occurred';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
      log('✅ Channel deleted successfully');
    } catch (e) {
      log('❌ Error in deleteChannel: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendMessage({
    required String recipientId,
    String? channelId,
    String? content,
    String messageType = 'text',
    File? mediaFile,
    int? parentId,
    String? fileUrl,
    String? fileType,
    String? metadata,
    Map<String, dynamic>? additionalParams,
    Map<String, dynamic>? metadataObject,
    List<int>? mentions,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}/message/start');

      // ✅ CASE 1: Media Upload (image, video, pdf, document)
      if (mediaFile != null && messageType != 'text') {
        log('📤 MEDIA UPLOAD: $messageType');

        var request = http.MultipartRequest('POST', url);

        // Add auth headers
        request.headers.addAll({
          ..._getAuthHeaders(),
          'Accept': 'application/json',
        });

        // Get MIME type
        final mimeType =
            lookupMimeType(mediaFile.path) ?? 'application/octet-stream';
        final mimeTypeData = mimeType.split('/');

        // ✅ Correct field key expected by your backend ("files")
        request.files.add(
          await http.MultipartFile.fromPath(
            "files", // 👈 Backend expects this
            mediaFile.path,
            contentType: MediaType(mimeTypeData[0], mimeTypeData[1]),
          ),
        );

        log("request.files::${request.files}");

        // Add form fields
        request.fields['message_type'] = messageType;

        if (channelId != null) {
          request.fields['channel_id'] = channelId;
        } else {
          request.fields['recipient_id'] = recipientId;
        }
        if (mentions != null && mentions.isNotEmpty) {
          request.fields['mentions'] = jsonEncode(mentions); // ✅ FIXED
        }

        if (parentId != null) {
          request.fields['parent_id'] = parentId.toString();
        }

        if (metadataObject != null) {
          request.fields['metadata'] = jsonEncode(metadataObject);
        }

        log('📤 Multipart Fields: ${request.fields}');

        // Send request
        final streamedResponse = await request.send().timeout(
          const Duration(seconds: 60),
        );

        final response = await http.Response.fromStream(streamedResponse);

        log('📥 Media Response: ${response.statusCode}');
        log('📥 Media Response Body: ${response.body}');

        if (response.statusCode >= 200 && response.statusCode < 300) {
          final data = jsonDecode(response.body) as Map<String, dynamic>;
          log('✅ Media upload success: $data');
          return data;
        } else {
          final errorResponse =
              jsonDecode(response.body) as Map<String, dynamic>?;
          throw HttpException(
            'Upload failed: ${errorResponse?['message'] ?? response.statusCode}',
            statusCode: response.statusCode,
          );
        }
      }

      // ✅ CASE 2: Text Message (JSON)
      log('📤 TEXT MESSAGE');

      if (content == null || content.isEmpty) {
        throw ArgumentError('Message content cannot be empty');
      }

      final headers = {
        ..._getAuthHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      final bodyMap = <String, dynamic>{
        'content': content,
        'message_type': messageType,
      };

      if (channelId != null) {
        bodyMap['channel_id'] = int.tryParse(channelId) ?? channelId;
        log('📤 Sending to CHANNEL: $channelId');
      } else {
        bodyMap['recipient_id'] = int.tryParse(recipientId) ?? recipientId;
        log('📤 Sending to RECIPIENT: $recipientId');
        log('📤 Sending to parentId: $parentId');
      }

      if (fileUrl != null) bodyMap['file_url'] = fileUrl;
      if (fileType != null) bodyMap['file_type'] = fileType;
      if (metadata != null) bodyMap['metadata'] = metadata;
      if (metadataObject != null) bodyMap['metadata'] = metadataObject;
      if (parentId != null) bodyMap['parent_id'] = parentId;
      if (additionalParams != null) bodyMap.addAll(additionalParams);
      if (mentions != null && mentions.isNotEmpty) {
        bodyMap['mentions'] = mentions; // ✅ Add mentions here
      }

      if (additionalParams != null &&
          additionalParams.containsKey('is_encrypted')) {
        bodyMap['is_encrypted'] = additionalParams['is_encrypted'];
      }

      log('📤 Request Body: ${jsonEncode(bodyMap)}');

      final response = await http
          .post(url, headers: headers, body: jsonEncode(bodyMap))
          .timeout(const Duration(seconds: 30));

      log('📥 Text Response: ${response.statusCode} - ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        log('✅ Message sent successfully');
        return responseData;
      } else {
        final errorResponse =
            jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage = errorResponse?['message'] ?? 'Unknown error';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in sendMessage: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateMessage({
    String? content,
    int? messageId,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}/message/update');

      // ✅ CASE 1: Media Upload (image, video, pdf, document)

      // ✅ CASE 2: Text Message (JSON)
      log('📤 TEXT MESSAGE');

      if (content == null || content.isEmpty) {
        throw ArgumentError('Message content cannot be empty');
      }

      final headers = {
        ..._getAuthHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      final bodyMap = <String, dynamic>{
        'content': content,
        'message_id': messageId,
      };

      log('📤 Request Body: ${jsonEncode(bodyMap)}');

      final response = await http
          .post(url, headers: headers, body: jsonEncode(bodyMap))
          .timeout(const Duration(seconds: 30));

      log('📥 Text Response: ${response.statusCode} - ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        log('✅ Message Update successfully');
        return responseData;
      } else {
        final errorResponse =
            jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage = errorResponse?['message'] ?? 'Unknown error';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in sendMessage: $e');
      rethrow;
    }
  }

  /*Future<Map<String, dynamic>> sendMessage({
    required String recipientId,
    String? channelId,
    String? content,
    String messageType = 'text',
    File? mediaFile,
    int? parentId,
    String? fileUrl,
    String? fileType,
    String? metadata,
    Map<String, dynamic>? additionalParams,
    Map<String, dynamic>? metadataObject,
  }) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}/message/start');

      // ✅ CASE 1: Media Upload (image, video, pdf, document)
      if (mediaFile != null && messageType != 'text') {
        log('📤 MEDIA UPLOAD: $messageType');

        var request = http.MultipartRequest('POST', url);

        // Add auth headers
        request.headers.addAll({
          ..._getAuthHeaders(),
          'Accept': 'application/json',
        });

        // Get MIME type
        final mimeType = lookupMimeType(mediaFile.path) ?? 'application/octet-stream';
        final mimeTypeData = mimeType.split('/');
          final List<String> possibleFieldNames = ['media', 'file', 'attachment', 'image', 'upload'];

        // Add file
        request.files.add(
          await http.MultipartFile.fromPath(
            "file",
            mediaFile.path,
            contentType: MediaType(mimeTypeData[0], mimeTypeData[1]),
          ),
        );

        log("request.files::${request.files}");

        // Add form fields
        request.fields['message_type'] = messageType;

        if (channelId != null) {
          request.fields['channel_id'] = channelId;
        } else {
          request.fields['recipient_id'] = recipientId;
        }

        if (parentId != null) {
          request.fields['parent_id'] = parentId.toString();
        }

        if (metadataObject != null) {
          request.fields['metadata'] = jsonEncode(metadataObject);
        }

        log('📤 Multipart Fields: ${request.fields}');

        final streamedResponse = await request.send().timeout(
          const Duration(seconds: 60),
        );

        final response = await http.Response.fromStream(streamedResponse);

        log('📥 Media Response: ${response.statusCode}');
        log('📥 Media Response request.files: ${response.body}');

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        } else {
          final errorResponse = jsonDecode(response.body) as Map<String, dynamic>?;
          throw HttpException(
            'Upload failed: ${errorResponse?['message'] ?? response.statusCode}',
            statusCode: response.statusCode,
          );
        }
      }

      // ✅ CASE 2: Text Message (JSON)
      log('📤 TEXT MESSAGE');

      if (content == null || content.isEmpty) {
        throw ArgumentError('Message content cannot be empty');
      }

      final headers = {
        ..._getAuthHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      final bodyMap = <String, dynamic>{
        'content': content,
        'message_type': messageType,
      };

      if (channelId != null) {
        bodyMap['channel_id'] = int.tryParse(channelId) ?? channelId;
        log('📤 Sending to CHANNEL: $channelId');
      } else {
        bodyMap['recipient_id'] = int.tryParse(recipientId) ?? recipientId;
        log('📤 Sending to RECIPIENT: $recipientId');
      }

      if (fileUrl != null) bodyMap['file_url'] = fileUrl;
      if (fileType != null) bodyMap['file_type'] = fileType;
      if (metadata != null) bodyMap['metadata'] = metadata;
      if (metadataObject != null) bodyMap['metadata'] = metadataObject;
      if (parentId != null) bodyMap['parent_id'] = parentId;
      if (additionalParams != null) bodyMap.addAll(additionalParams);

      log('📤 Request Body: ${jsonEncode(bodyMap)}');

      final response = await http
          .post(url, headers: headers, body: jsonEncode(bodyMap))
          .timeout(const Duration(seconds: 30));

      log('📥 Text Response: ${response.statusCode} - ${response.body}');

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        log('✅ Message sent successfully');
        return responseData;
      } else {
        final errorResponse = jsonDecode(response.body) as Map<String, dynamic>?;
        final errorMessage = errorResponse?['message'] ?? 'Unknown error';
        throw HttpException(
          'API Error ${response.statusCode}: $errorMessage',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      log('❌ Error in sendMessage: $e');
      rethrow;
    }
  }*/

  Future<bool> pinMessage(String messageId) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.pinMessageChat,
        body: {"message_id": messageId},
        headers: _getAuthHeaders(),
      );
      log("Pin response: ${response.data}");
      return true;
    } catch (e) {
      log("Error pinMessage: $e");
      return false;
    }
  }

  Future<bool> unPinMessage(String messageId) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.unPinMessageChat,
        body: {"message_id": messageId},
        headers: _getAuthHeaders(),
      );
      log("Unpin response: ${response.data}");
      return true;
    } catch (e) {
      log("Error unPinMessage: $e");
      return false;
    }
  }

  Future<List<ChatMessageModel>> loadMessages({
    String? recipientId,
    String? channelId,
    String? filter,
    int? page, // Add pagination
    int? limit = 20, // Messages per page
    String? beforeMessageId, // Load messages before this ID
  }) async {
    print("function caaledd ");
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log('🔐 Loading messages with TeamID: ${_authService.teamId}');
    log('📄 Page: $page, Limit: $limit, Before: $beforeMessageId');

    String endpoint;
    Map<String, String> queryParams = {};

    if (channelId != null) {
      endpoint = ApiEndpoints.message;
      queryParams['channel_id'] = channelId;
      log('📡 Loading CHANNEL messages for channel ID: $channelId');
    } else if (recipientId != null) {
      endpoint = ApiEndpoints.message;
      queryParams['recipient_id'] = recipientId;
      log('📡 Loading DM messages for recipient ID: $recipientId');
    } else {
      throw Exception('Either recipientId or channelId must be provided');
    }

    // Add pagination params
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();
    if (beforeMessageId != null) queryParams['before'] = beforeMessageId;

    final uri = Uri.parse(endpoint).replace(queryParameters: queryParams);
    log("uri:::$uri");

    final headers = {..._getAuthHeaders()};

    try {
      final response = await http
          .get(uri, headers: headers)
          .timeout(Duration(seconds: 30));

      if (response.statusCode == 200) {
        dynamic responseData;
        try {
          responseData = jsonDecode(response.body);
        } catch (e) {
          log('❌ JSON Decode Error: $e');
          log('📥 Raw Response Body: ${response.body}');
          throw Exception('Invalid response format: data is not valid JSON');
        }

        if (responseData is List) {
          log('✅ Received ${responseData.length} messages');
          return responseData
              .map<ChatMessageModel>((json) => ChatMessageModel.fromJson(json))
              .toList();
        } else if (responseData is Map) {
          List<dynamic>? messagesList;
          if (responseData.containsKey('messages')) {
            messagesList = responseData['messages'];
          } else if (responseData.containsKey('data')) {
            messagesList = responseData['data'];
          }

          if (messagesList is List) {
            log('✅ Found ${messagesList.length} messages');
            return messagesList
                .map<ChatMessageModel>(
                  (json) => ChatMessageModel.fromJson(json),
                )
                .toList();
          }
        }
        log('⚠️ Unexpected response format. Data: $responseData');
        return [];
      } else {
        log('❌ API Error ${response.statusCode}');
        log('📥 Response Body: ${response.body}');
        throw Exception('Failed to load messages: HTTP ${response.statusCode}');
      }
    } catch (e, s) {
      log("❌ Error loading messages: $e\n$s");
      rethrow;
    }
  }
  /*
  Future<List<ChatMessageModel>> loadMessages({
    String? recipientId,
    String? channelId,
    String? filter,
  }) async {
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log('🔐 Loading messages with TeamID: ${_authService.teamId}');

    String endpoint;
    Map<String, String> queryParams = {};

    if (channelId != null) {
      endpoint = ApiEndpoints.message;
      queryParams['channel_id'] = channelId;
      log('📡 Loading CHANNEL messages for channel ID: $channelId');
    } else if (recipientId != null) {
      endpoint = ApiEndpoints.message;
      queryParams['recipient_id'] = recipientId;

      log('📡 Loading DM messages for recipient ID: $recipientId');
    } else {
      throw Exception('Either recipientId or channelId must be provided');
    }

    final uri = Uri.parse(endpoint).replace(queryParameters: queryParams);
    log("uri:::$uri");
    final headers = {
      ..._getAuthHeaders(), // Uses AuthService
    };

    log('📤 Request headers: $headers');

    try {
      final response = await http
          .get(uri, headers: headers)
          .timeout(Duration(seconds: 30));

      if (response.statusCode == 503) {
        throw Exception('Server temporarily unavailable');
      }

      log("response.statusCode: ${response.statusCode}");

      if (response.statusCode == 403) {
        log('🚫 403 Forbidden - TeamID mismatch detected!');
        log('🔍 Current TeamID: ${_authService.teamId}');
        log('🔍 Response: ${response.body}');
      }

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);

        if (responseData is List) {
          log('✅ Received List format: ${responseData.length} messages');
          return responseData
              .map<ChatMessageModel>((json) => ChatMessageModel.fromJson(json))
              .toList();
        } else if (responseData is Map) {
          log('✅ Received Map format, extracting messages...');

          List<dynamic>? messagesList;
          if (responseData.containsKey('messages')) {
            messagesList = responseData['messages'];
          } else if (responseData.containsKey('data')) {
            messagesList = responseData['data'];
          } else if (responseData.containsKey('results')) {
            messagesList = responseData['results'];
          }

          if (messagesList is List) {
            log('✅ Found ${messagesList.length} messages in response');
            return messagesList
                .map<ChatMessageModel>(
                  (json) => ChatMessageModel.fromJson(json),
                )
                .toList();
          } else {
            log('⚠️ No messages array found in Map response');
            log('⚠️ Available keys: ${responseData.keys.toList()}');
            return [];
          }
        } else {
          log('⚠️ Unexpected response format: ${responseData.runtimeType}');
          return [];
        }
      } else {
        throw Exception('Failed to load messages: HTTP ${response.statusCode}');
      }
    } catch (e, s) {
      log("❌ Error loading messages: $e\n$s");
      rethrow;
    }
  }
*/

  Future<List<ChatMessageModel>> filterMessages({String? filter}) async {
    if (!_authService.validateAuthState()) {
      throw Exception('User not authenticated');
    }

    log('🔐 Loading messages with TeamID: ${_authService.teamId}');

    String endpoint;
    Map<String, String> queryParams = {};
    queryParams['filter'] = filter!;

    final uri = Uri.parse(
      ApiEndpoints.message,
    ).replace(queryParameters: queryParams);
    log("uri:::$uri");
    final headers = {
      ..._getAuthHeaders(), // Uses AuthService
    };

    log('📤 Request headers: $headers');

    try {
      final response = await http
          .get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      log("response::${response.body}");
      if (response.statusCode == 503) {
        throw Exception('Server temporarily unavailable');
      }

      log("response.statusCode: ${response.statusCode}");

      if (response.statusCode == 403) {
        log('🚫 403 Forbidden - TeamID mismatch detected!');
        log('🔍 Current TeamID: ${_authService.teamId}');
        log('🔍 Response: ${response.body}');
        throw Exception('Access denied. Please select the correct team.');
      }

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);

        if (responseData is List) {
          log('✅ Received List format: ${responseData.length} messages');
          return responseData
              .map<ChatMessageModel>((json) => ChatMessageModel.fromJson(json))
              .toList();
        } else if (responseData is Map) {
          log('✅ Received Map format, extracting messages...');

          List<dynamic>? messagesList;
          if (responseData.containsKey('messages')) {
            messagesList = responseData['messages'];
          } else if (responseData.containsKey('data')) {
            messagesList = responseData['data'];
          } else if (responseData.containsKey('results')) {
            messagesList = responseData['results'];
          }

          if (messagesList is List) {
            log('✅ Found ${messagesList.length} messages in response');
            return messagesList
                .map<ChatMessageModel>(
                  (json) => ChatMessageModel.fromJson(json),
                )
                .toList();
          } else {
            log('⚠️ No messages array found in Map response');
            log('⚠️ Available keys: ${responseData.keys.toList()}');
            return [];
          }
        } else {
          log('⚠️ Unexpected response format: ${responseData.runtimeType}');
          return [];
        }
      } else {
        throw Exception('Failed to load messages: HTTP ${response.statusCode}');
      }
    } catch (e, s) {
      log("❌ Error loading messages: $e\n$s");
      rethrow;
    }
  }

  Future<List<MessageModel>> teamMembers() async {
    try {
      final token = AuthService().token;
      final teamId = AuthService().teamId;
      log("teamId::$teamId");
      final response = await apiManager.get(
        ApiEndpoints.searchChats,
        headers: {
          'Authorization': 'Bearer $token',
          'X-Team-ID': teamId.toString(),
        },
      );

      final uri = Uri.parse(ApiEndpoints.searchChats);
      log('SearchChats URL: $uri');
      log('searchChats response: ${response.data}');

      // Get 'members' list from response data (not 'results')
      final List<dynamic>? membersJson =
          response.data['members'] as List<dynamic>?;

      if (membersJson == null) {
        // No members key or null value - return empty list or throw
        return [];
      }

      // Map the members list to ChatModel list
      return membersJson.map((json) => MessageModel.fromJson(json)).toList();
    } on DioException catch (e) {
      log('Dio error in searchChats: ${e.response?.data ?? e.message}');
      throw Exception(e.response?.data['message'] ?? 'Search failed');
    } catch (e) {
      log('Unexpected error in searchChats: $e');
      throw Exception('Search failed');
    }
  }

  // Update deleteMessage to use correct endpoint:
  Future<bool> deleteMessage(String messageId) async {
    try {
      // Correct endpoint: /message/delete/:id (not /:messageId)
      final url = Uri.parse(
        '${AppConstants.baseUrl}/message/delete/$messageId',
      );
      final headers = {
        ..._getAuthHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      log("Deleting message at: $url");

      final response = await http
          .delete(url, headers: headers)
          .timeout(const Duration(seconds: 30));

      log("Delete response: ${response.statusCode} - ${response.body}");

      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e) {
      log("Error deleting message: $e");
      return false;
    }
  }

  Future<ContactProfileModel> fetchContactProfile({
    required String chatType,
    required dynamic recipientId,
  }) async {
    final url = '${ApiEndpoints.getChats}/$chatType/$recipientId/info';
    final headers = _getAuthHeaders();

    log("📡 Fetching ContactProfile URL => $url");

    try {
      final response = await apiManager.get(url, headers: headers);

      log("📥 Response status: ${response.statusCode}");

      final responseData = response.data is String
          ? jsonDecode(response.data)
          : response.data;

      return ContactProfileModel.fromJson(responseData);
    } catch (e, st) {
      log('🔥 Error fetching contact profile: $e\n$st');
      rethrow;
    }
  }

  // // New method to delete a message
  // Future<bool> deleteMessage({
  //   required String messageId,
  //   required String recipientId,
  // }) async {
  //   final url = Uri.parse('${AppConstants.baseUrl}/message/delete/:$messageId');
  //   final headers = _getAuthHeaders();
  //   final body = jsonEncode({'recipient_id': recipientId});
  //
  //   log("Deleting message at: $url///$recipientId");
  //
  //   try {
  //     final response = await http
  //         .delete(url, headers: headers, body: body)
  //         .timeout(const Duration(seconds: 30));
  //
  //     if (response.statusCode == 200 || response.statusCode == 204) {
  //       log("Message deleted successfully");
  //       return true;
  //     } else {
  //       final error = 'Failed to delete message: ${response.statusCode}';
  //       log(error);
  //       throw HttpException(error, statusCode: response.statusCode);
  //     }
  //   } catch (e) {
  //     log("Error deleting message: $e");
  //     rethrow;
  //   }
  // }

  Future<bool> addFavoriteMessage(String messageId) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.favorite,
        body: {"message_id": int.parse(messageId)},
        headers: _getAuthHeaders(),
      );
      log("favorite response: ${response.statusCode}///${response.data}");
      return true;
    } catch (e) {
      log("Error in favorite API: $e");
      return false;
    }
  }

  Future<bool> removeFavoriteMessage(String messageId) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.unFavorite,
        body: {"message_id": int.parse(messageId)},
        headers: _getAuthHeaders(),
      );
      log("unfavorite response: ${response.statusCode}///${response.data}");
      return true;
    } catch (e) {
      log("Error in unfavorite API: $e");
      return false;
    }
  }

  // Future<bool> addFavoriteMessage(String messageId) async {
  //   final url = Uri.parse(ApiEndpoints.favorite);
  //   final headers = _getAuthHeaders();
  //
  //   try {
  //     final response = await http.post(
  //       url,
  //       headers: headers,
  //       body: jsonEncode({'message_id': messageId}),
  //     );
  //
  //     if (response.statusCode == 200) {
  //       final data = jsonDecode(response.body);
  //       log("Favorite API Response: $data");
  //       return true; // success
  //     } else {
  //       throw Exception('Failed to favorite message: ${response.statusCode}');
  //     }
  //   } catch (e) {
  //     log('Error in addFavoriteMessage: $e');
  //     return false;
  //   }
  // }

  Future<List<Conversation>> getConversations() async {
    final url = Uri.parse(ApiEndpoints.getChats);
    final headers = _getAuthHeaders();

    log("Calling getConversations////$url");

    try {
      final response = await http.get(url, headers: headers);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        log("DATA::$data");
        return data.map((json) => Conversation.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load conversations: ${response.statusCode}');
      }
    } catch (e) {
      log('Error loading conversations: $e');
      rethrow;
    }
  }

  Future<bool> addMessageReaction(String messageId, String emoji) async {
    try {
      final response = await apiManager.post(
        ApiEndpoints.reaction,

        body: {"message_id": int.parse(messageId), "emoji": emoji},
        headers: _getAuthHeaders(),
      );
      log("Add reaction response: ${response.statusCode}///${response.data}");
      return response.statusCode == 200;
    } catch (e) {
      log("Error in add reaction API: $e");
      return false;
    }
  }

  Future<bool> removeMessageReaction(String messageId, String emoji) async {
    try {
      final response = await apiManager.delete(
        ApiEndpoints.reaction,
        body: {"message_id": int.parse(messageId), "emoji": emoji},
        headers: _getAuthHeaders(),
      );
      log(
        "Remove reaction response: ${response.statusCode}///${response.data}",
      );
      return response.statusCode == 200;
    } catch (e) {
      log("Error in remove reaction API: $e");
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> searchMessages({
    required String query,
    String? searchType,
    String? scopType,
    int? channelId,
    int? recipientId,
    int? senderId,
  }) async {
    try {
      // Build the base URL
      final url = Uri.parse('${AppConstants.baseUrl}/message/search');

      // Build query parameters
      final queryParams = {
        'query': query,
        if (scopType != null) 'scope': scopType,
        if (searchType != null) "search_Type": searchType,
        // Changed from 'search_type' to match your API
        if (channelId != null) 'channel_id': channelId.toString(),
        if (recipientId != null) 'recipient_id': recipientId.toString(),
        if (senderId != null) 'sender_id': senderId.toString(),
      };

      // Create the final URI with query parameters
      final uri = url.replace(queryParameters: queryParams);

      final headers = {
        ..._getAuthHeaders(), // This should be a method in ChatApi
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      log('🔍 Search Messages API Call:');
      log('  - URL: $uri');
      log('  - Query: $query');
      log('  - Search Type: $searchType');
      log('  - Channel ID: $channelId');
      log('  - Recipient ID: $recipientId');

      final response = await http
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 30));
      log("uri::$uri");
      log('📥 Search Response:');
      log('  - Status: ${response.statusCode}');
      log('  - Body: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        globalSearchData = GlobalSearchData.fromJson(responseData);
        // Handle the response based on your API structure
        if (responseData.containsKey('messages') &&
            responseData['messages'] is List) {
          final messages = responseData['messages'];
          log('✅ Search returned ${messages.length} results');
          return List<Map<String, dynamic>>.from(messages);
        }

        return [];
      } else {
        Fluttertoast.showToast(msg: response.body);
        throw Exception('Search failed with status ${response.statusCode}');
      }
    } catch (e, s) {
      log('❌ Error in searchMessages: $e-=-=-=-=$s');
      rethrow;
    }
  }
}

// Custom exception class for HTTP errors
class HttpException implements Exception {
  final String message;
  final int? statusCode;

  HttpException(this.message, {this.statusCode});

  @override
  String toString() {
    return statusCode != null
        ? 'HttpException [$statusCode]: $message'
        : 'HttpException: $message';
  }
}

GlobalSearchData? globalSearchData;
ChannelInfo? channelInfoData;
