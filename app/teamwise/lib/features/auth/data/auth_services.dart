import 'dart:developer';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../config.dart';
import '../../chat/socket_service.dart';

/// Centralized authentication data manager
/// Single source of truth for all auth-related data
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  // Keys for SharedPreferences
  static const String _keyToken = 'token';
  static const String _keyTeamId = 'teamId';
  static const String _keyUserId = 'userId';
  static const String _keyUserName = 'userName';
  static const String _keyUserEmail = 'userEmail';
  static const String _keyIsTeamSelected = 'isTeamSelected';

  // In-memory cache
  String? _token;
  dynamic _teamId;
  String? _userId;
  String? _userName;
  String? _userEmail;
  bool _isTeamSelected = false;

  // Getters
  String? get token => _token;
  dynamic get teamId => _teamId;
  String? get userId => _userId;
  String? get userName => _userName;
  String? get userEmail => _userEmail;
  bool get isTeamSelected => _isTeamSelected;

  bool get isAuthenticated => _token != null && _userId != null;

  /// Initialize and load from SharedPreferences
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();

    _token = prefs.getString(_keyToken);
    // ✅ Handle both int and string with safe fallback
    final storedTeamId = prefs.get(_keyTeamId);
    if (storedTeamId is int) {
      _teamId = storedTeamId;
    } else if (storedTeamId is String) {
      _teamId = int.tryParse(storedTeamId);
    } else {
      _teamId = null;
    }
    _userId = prefs.getString(_keyUserId);
    _userName = prefs.getString(_keyUserName);
    _userEmail = prefs.getString(_keyUserEmail);
    _isTeamSelected = prefs.getBool(_keyIsTeamSelected) ?? false;

    log('🔐 AuthService initialized: token=${_token != null}, teamId=$_teamId, userId=$_userId, isTeamSelected=$_isTeamSelected');

  }
// Update only team ID (for team switching)
  Future<void> updateTeamId(int teamId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyTeamId, teamId);  // ✅ Consistent int storage
    await prefs.setBool(_keyIsTeamSelected, true);
    _teamId = teamId;
    _isTeamSelected = true;
    log('🔄 Team updated to: $teamId (Type: ${teamId.runtimeType})');
    log('🔄 AuthService._teamId is now: $_teamId');
  }

  /// Save complete auth data
  Future<void> saveAuthData({
    required String token,
    required int teamId,
    required String userId,
    String? userName,
    String? userEmail,
    bool isTeamSelected = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
log("_keyTeamId::$teamId");
    // Save to SharedPreferences
    await Future.wait([
      prefs.setString(_keyToken, token),
      prefs.setString(_keyTeamId, teamId.toString()),
      prefs.setString(_keyUserId, userId),
      if (userName != null) prefs.setString(_keyUserName, userName),
      if (userEmail != null) prefs.setString(_keyUserEmail, userEmail),
      prefs.setBool(_keyIsTeamSelected, isTeamSelected),
    ]);

    // Update in-memory cache
    _token = token;
    _teamId = teamId;
    _userId = userId;
    _userName = userName;
    _userEmail = userEmail;
    _isTeamSelected = isTeamSelected;

    log('✅ AuthService saved: token=${token.substring(0, 10)}..., teamId=$teamId, userId=$userId, isTeamSelected=$isTeamSelected');
  }



  /// Update user profile data
  Future<void> updateUserProfile({
    String? userName,
    String? userEmail,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    if (userName != null) {
      await prefs.setString(_keyUserName, userName);
      _userName = userName;
    }

    if (userEmail != null) {
      await prefs.setString(_keyUserEmail, userEmail);
      _userEmail = userEmail;
    }

    log('🔄 User profile updated: name=$userName, email=$userEmail');
  }

  /// Clear all auth data (logout)
  Future<void> clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();

    await Future.wait([
      prefs.remove(_keyToken),
      prefs.remove(_keyTeamId),
      prefs.remove(_keyUserId),
      prefs.remove(_keyUserName),
      prefs.remove(_keyUserEmail),
      prefs.remove(_keyIsTeamSelected),
    ]);

    _token = null;
    _teamId = null;
    _userId = null;
    _userName = null;
    _userEmail = null;
    _isTeamSelected = false;

    log('🔓 AuthService cleared');
  }
  /// Full logout logic WITHOUT context or navigation
  Future<void> logout() async {
    log("🚪 Logging out user...");

    // 1️⃣ Clear stored auth values
    await clearAuthData();

    // 2️⃣ Disconnect socket if connected
    try {
      SocketService().disconnect();
      log("🔌 Socket disconnected");
    } catch (_) {}

    // 3️⃣ Clear push notifications token if needed
    // try {
    //   await NotificationService().clearToken();
    //   log("🔕 Notification token cleared");
    // } catch (_) {}

    log("✅ Logout completed (No navigation)");
  }

  /// Get auth headers for API calls
  Map<String, String> getAuthHeaders() {
    final headers = <String, String>{};
log("_token::$_token///$_teamId");
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }

    if (_teamId != null) {
      headers['X-Team-ID'] = _teamId.toString();
    }

    return headers;
  }

  /// Validate current auth state
  bool validateAuthState() {
    if (!isAuthenticated) {
      log('⚠️ Auth validation failed: token=${_token != null}, teamId=$_teamId, userId=$_userId');
      return false;
    }
    return true;
  }
}