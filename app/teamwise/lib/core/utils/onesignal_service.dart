import 'dart:developer';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'package:flutter/material.dart';

import '../network/app_constants.dart';

class OneSignalService {
  static final OneSignalService _instance = OneSignalService._internal();
  factory OneSignalService() => _instance;
  OneSignalService._internal();

  // Replace with your OneSignal App ID
  static const String _appId = AppConstants.oneSignalAppId;

  // Navigator key for handling navigation from notifications
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Initialize OneSignal
  Future<void> initialize() async {
    try {
      log('🔔 Initializing OneSignal...');

      // Initialize with App ID
      OneSignal.initialize(_appId);

      // Request permission
      final hasPermission = await OneSignal.Notifications.requestPermission(true);
      log('📱 Notification permission: ${hasPermission ? "granted" : "denied"}');

      // Setup handlers
      _setupHandlers();

      // Log player ID
      final playerId = OneSignal.User.pushSubscription.id;
      log('🆔 OneSignal Player ID: $playerId');

      log('✅ OneSignal initialized');
    } catch (e, s) {
      log('🔥 OneSignal init error: $e\n$s');
    }
  }

  /// Setup notification event handlers
  void _setupHandlers() {
    // Notification clicked
    OneSignal.Notifications.addClickListener((event) {
      log('📬 Notification clicked');
      _handleNotificationOpened(event);
    });

    // Foreground notification
    OneSignal.Notifications.addForegroundWillDisplayListener((event) {
      log('📨 Foreground notification: ${event.notification.title}');
      // Show notification even in foreground
      event.notification.display();
    });

    // Permission observer
    OneSignal.Notifications.addPermissionObserver((state) {
      log('🔔 Permission changed: $state');
    });

    // Subscription observer
    OneSignal.User.pushSubscription.addObserver((state) {
      log('📲 Subscription state: ${state.current}');
    });
  }

  /// Handle notification opened
  void _handleNotificationOpened(OSNotificationClickEvent event) {
    final notification = event.notification;
    final additionalData = notification.additionalData;

    log('📦 Notification data: $additionalData');

    if (additionalData == null) return;

    // Handle different notification types
    if (additionalData.containsKey('type')) {
      final type = additionalData['type'];

      switch (type) {
        case 'chat':
          _navigateToChat(additionalData);
          break;
        case 'call':
          _navigateToCall(additionalData);
          break;
        case 'reminder':
          _navigateToReminder(additionalData);
          break;
        default:
          log('⚠️ Unknown notification type: $type');
      }
    }
  }

  /// Navigate to chat screen
  void _navigateToChat(Map<String, dynamic> data) {
    final chatId = data['chatId'];
    log('💬 Navigating to chat: $chatId');
    navigatorKey.currentState?.pushNamed('/chat', arguments: chatId);
  }

  /// Navigate to call screen
  void _navigateToCall(Map<String, dynamic> data) {
    final callId = data['callId'];
    log('📞 Navigating to call: $callId');
    navigatorKey.currentState?.pushNamed('/call', arguments: callId);
  }

  /// Navigate to reminder screen
  void _navigateToReminder(Map<String, dynamic> data) {
    final reminderId = data['reminderId'];
    log('⏰ Navigating to reminder: $reminderId');
    navigatorKey.currentState?.pushNamed('/reminder', arguments: reminderId);
  }

  /// Set external user ID (link to backend user)
  Future<void> setExternalUserId(String userId) async {
    try {
      await OneSignal.login(userId);
      log('✅ External user ID set: $userId');
    } catch (e) {
      log('🔥 Error setting external user ID: $e');
    }
  }

  /// Remove external user ID (on logout)
  Future<void> removeExternalUserId() async {
    try {
      await OneSignal.logout();
      log('✅ User logged out from OneSignal');
    } catch (e) {
      log('🔥 Error logging out: $e');
    }
  }

  /// Send tag to OneSignal
  Future<void> sendTag(String key, String value) async {
    try {
      await OneSignal.User.addTagWithKey(key, value);
      log('✅ Tag sent: $key = $value');
    } catch (e) {
      log('🔥 Error sending tag: $e');
    }
  }

  /// Send multiple tags
  Future<void> sendTags(Map<String, String> tags) async {
    try {
      await OneSignal.User.addTags(tags);
      log('✅ Tags sent: $tags');
    } catch (e) {
      log('🔥 Error sending tags: $e');
    }
  }

  /// Remove tag
  Future<void> removeTag(String key) async {
    try {
      await OneSignal.User.removeTag(key);
      log('✅ Tag removed: $key');
    } catch (e) {
      log('🔥 Error removing tag: $e');
    }
  }

  /// Get player ID (device identifier)
  String? getPlayerId() {
    return OneSignal.User.pushSubscription.id;
  }

  /// Get push token
  String? getPushToken() {
    return OneSignal.User.pushSubscription.token;
  }

  /// Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    return await OneSignal.Notifications.permission;
  }

  /// Prompt for push permission
  Future<bool> promptForPushPermission() async {
    return await OneSignal.Notifications.requestPermission(true);
  }

  /// Set notification will show in foreground handler
  void setNotificationWillShowInForegroundHandler(
      void Function(OSNotificationWillDisplayEvent) handler,
      ) {
    OneSignal.Notifications.addForegroundWillDisplayListener(handler);
  }

  /// Set notification opened handler
  void setNotificationOpenedHandler(
      void Function(OSNotificationClickEvent) handler,
      ) {
    OneSignal.Notifications.addClickListener(handler);
  }

  /// Enable verbose logging (for debugging)
  void enableVerboseLogging() {
    OneSignal.Debug.setLogLevel(OSLogLevel.verbose);
  }

  /// Disable verbose logging
  void disableVerboseLogging() {
    OneSignal.Debug.setLogLevel(OSLogLevel.none);
  }
}