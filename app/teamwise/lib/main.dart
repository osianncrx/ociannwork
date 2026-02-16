import 'package:country_picker/country_picker.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'package:teamwise/features/chat/presentation/bloc/chat_bloc.dart';
import 'package:teamwise/features/chat/presentation/widgets/call_widgets.dart';
import 'common/widgets/theme_statusbar.dart';
import 'config.dart';
import 'core/env/flavor_config.dart';
import 'core/network/api_manger.dart';
import 'core/network/api_response.dart';
import 'core/network/app_constants.dart';
import 'core/utils/onesignal_service.dart';
import 'features/auth/data/auth_services.dart';
import 'features/auth/data/datasources/auth_api.dart';
import 'features/chat/socket_service.dart' show SocketService;
import 'dart:developer';
import 'dart:async';
import 'dart:io';

import 'firebase_options.dart';

Future<void> initOneSignal() async {
  try {
    log('🔔 Initializing OneSignal...');

    const String oneSignalAppId = AppConstants.oneSignalAppId;

    // Enable debug logging
    OneSignal.Debug.setLogLevel(OSLogLevel.verbose);
    OneSignal.Debug.setAlertLevel(OSLogLevel.none);

    log('🆔 OneSignal App ID: $oneSignalAppId');
    log('📱 Platform: ${Platform.isAndroid ? "Android" : "iOS"}');

    // Initialize OneSignal
    OneSignal.initialize(oneSignalAppId);
    log('✅ OneSignal.initialize() called');

    // ✅ FIX 1: Setup handlers FIRST before any delays
    _setupNotificationHandlers();
    _setupSubscriptionListener();

    // ✅ FIX 2: Request permission with proper await
    log('📱 Requesting notification permission...');
    bool hasPermission = false;

    try {
      hasPermission = await OneSignal.Notifications.requestPermission(true);
      log('📱 Permission result: ${hasPermission ? "✅ GRANTED" : "❌ DENIED"}');
    } catch (e) {
      log('⚠️ Permission request error: $e');
    }

    if (!hasPermission) {
      log('⚠️ WARNING: Notification permission denied!');
      log('   Player ID generation may be delayed or fail');
    }

    // ✅ FIX 3: Longer wait time for OneSignal backend registration
    log('⏳ Waiting for OneSignal registration (1 seconds)...');
    Future.delayed(const Duration(seconds: 1));

    // ✅ FIX 4: Retry mechanism for player ID
    String? playerId = await _waitForPlayerId(maxAttempts: 5, delaySeconds: 3);

    if (playerId != null && playerId.isNotEmpty) {
      log('✅✅✅ Player ID obtained: $playerId');
      _handlePlayerIdReceived(playerId);
    } else {
      log('⚠️ Player ID not available yet, will retry via observer');
      _logTroubleshootingSteps();
    }

    log('✅ OneSignal initialization completed');
  } catch (e, s) {
    log('🔥 OneSignal initialization error: $e\n$s');
  }
}

void _logTroubleshootingSteps() {
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('❌ TROUBLESHOOTING STEPS:');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  log('1️⃣ ANDROID CONFIGURATION:');
  log('   ✓ google-services.json in android/app/');
  log('   ✓ FCM Server Key in OneSignal Dashboard');
  log('   ✓ Google Play Services installed on device');
  log('   ✓ Internet connection active');
  log('');
  log('2️⃣ ONESIGNAL DASHBOARD:');
  log('   → https://dashboard.onesignal.com');
  log('   → Settings → Keys & IDs');
  log('   → Platforms → Android → FCM Configuration');
  log('');
  log('3️⃣ COMMON FIXES:');
  log('   • Completely restart the app');
  log('   • Uninstall and reinstall app');
  log('   • Clear app data');
  log('   • Check device has Google Play Services');
  log('   • Wait 30-60 seconds after app starts');
  log('');
  log('4️⃣ TEST DEVICE REGISTRATION:');
  log('   → OneSignal Dashboard → Audience → All Users');
  log('   → Should see your device appear within 1-2 min');
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

Future<String?> _waitForPlayerId({
  required int maxAttempts,
  required int delaySeconds,
}) async {
  for (int attempt = 1; attempt <= maxAttempts; attempt++) {
    log('🔍 Attempt $attempt/$maxAttempts: Checking for Player ID...');

    final playerId = OneSignal.User.pushSubscription.id;
    final token = OneSignal.User.pushSubscription.token;
    final optedIn = OneSignal.User.pushSubscription.optedIn;

    log('   Player ID: ${playerId?.isEmpty ?? true ? "NULL/EMPTY" : playerId}');
    log('   Token: ${token?.isEmpty ?? true ? "NULL/EMPTY" : "Present"}');
    log('   Opted In: $optedIn');

    if (playerId != null && playerId.isNotEmpty) {
      log('✅ Player ID found on attempt $attempt');
      return playerId;
    }

    if (attempt < maxAttempts) {
      log('⏳ Waiting ${delaySeconds}s before next attempt...');
      await Future.delayed(Duration(seconds: delaySeconds));
    }
  }

  log('❌ Player ID not found after $maxAttempts attempts');
  return null;
}

void _setupSubscriptionListener() {
  log('👂 Setting up subscription listener...');

  OneSignal.User.pushSubscription.addObserver((state) {
    log('');
    log('🔔 ═══ SUBSCRIPTION STATE CHANGED ═══');

    final current = state.current;
    final playerId = current.id;
    final token = current.token;
    final optedIn = current.optedIn;

    log('   Player ID: ${playerId ?? "NULL"}');
    log(
      '   Token: ${token != null ? "${token.substring(0, token.length > 30 ? 30 : token.length)}..." : "NULL"}',
    );
    log('   Opted In: $optedIn');
    log('═══════════════════════════════════════');

    if (playerId != null && playerId.isNotEmpty) {
      log('✅✅✅ VALID PLAYER ID RECEIVED VIA OBSERVER: $playerId');
      _handlePlayerIdReceived(playerId);
    } else {
      log('⚠️ Observer triggered but Player ID still null/empty');
    }
  });

  log('✅ Subscription listener configured');
}

void _handlePlayerIdReceived(String playerId) {
  if (playerId.isEmpty) {
    log('⚠️ Empty player ID - ignoring');
    return;
  }

  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('✅ PLAYER ID CONFIRMED');
  log('🆔 ID: $playerId');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  // ✅ TODO: Send to your backend
  _sendPlayerIdToBackend(playerId);
}

Future<void> _sendPlayerIdToBackend(String playerId) async {
  try {
    final authService = AuthService();

    if (!authService.isAuthenticated || authService.userId == null) {
      log('⏳ User not authenticated, storing player ID for later...');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pending_player_id', playerId);
      return;
    }

    log('📤 Sending Player ID to backend...');
    log('   User ID: ${authService.userId}');
    log('   Player ID: $playerId');

    // Call the API

    final response = await AuthApi(
      serviceLocator<ApiManager>(),
    ).savePlayerId(playerId);
    log("response:::${response.data}");
    if (response.status == Status.completed) {
      log('✅ Player ID sent to backend successfully');
    } else {
      log('❌ Failed to send Player ID: ${response.message}');

      // Store for retry
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pending_player_id', playerId);
    }
  } catch (e, s) {
    log('🔥 Error sending Player ID to backend: $e\n$s');

    // Store for retry on error
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pending_player_id', playerId);
    } catch (_) {}
  }
}

/// Setup notification event handlers
void _setupNotificationHandlers() {
  log('📲 Setting up notification handlers...');

  OneSignal.Notifications.addClickListener((event) {
    log('📬 Notification clicked!');
    log('   Title: ${event.notification.title}');
    log('   Body: ${event.notification.body}');
    log('   Data: ${event.notification.additionalData}');

    // Handle navigation
    final data = event.notification.additionalData;
    if (data != null) {
      if (data.containsKey('chatId')) {
        final chatId = data['chatId'];
        log('💬 Navigate to chat: $chatId');
        // TODO: Add navigation
      }
    }
  });

  OneSignal.Notifications.addForegroundWillDisplayListener((event) {
    log('📨 Foreground notification:');
    log('   Title: ${event.notification.title}');
    log('   Body: ${event.notification.body}');
  });

  OneSignal.Notifications.addPermissionObserver((state) {
    log('🔔 Permission changed: $state');
  });

  log('✅ Notification handlers configured');
}

/// Set external user ID for OneSignal
Future<void> setOneSignalExternalUserId(String userId) async {
  try {
    if (userId.isEmpty) {
      log('⚠️ Empty user ID provided');
      return;
    }

    log('🔑 Setting OneSignal external user ID: $userId');
    await OneSignal.login(userId);
    log('✅ OneSignal.login() completed');

    await Future.delayed(const Duration(seconds: 2));

    // Check if we have a pending player ID to send
    final prefs = await SharedPreferences.getInstance();
    final pendingPlayerId = prefs.getString('pending_player_id');

    if (pendingPlayerId != null) {
      log('📤 Sending previously stored Player ID...');
      await _sendPlayerIdToBackend(pendingPlayerId);
    }

    // Check current player ID
    final playerId = OneSignal.User.pushSubscription.id;
    log('🔍 After login - Player ID: ${playerId ?? "NULL"}');

    if (playerId != null && playerId.isNotEmpty) {
      // Only send if different from pending
      if (playerId != pendingPlayerId) {
        await _sendPlayerIdToBackend(playerId);
      }
    } else {
      log('⏳ Player ID will arrive via observer');
    }
  } catch (e, s) {
    log('🔥 Error in setOneSignalExternalUserId: $e\n$s');
  }
}

/// Remove external user ID (on logout)
Future<void> removeOneSignalExternalUserId() async {
  try {
    log('🚪 Logging out OneSignal user...');
    await OneSignal.logout();

    // Clear any stored player ID
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('pending_player_id');

    log('✅ OneSignal logout completed');
  } catch (e) {
    log('🔥 Error in logout: $e');
  }
}

/// Get current player ID
String? getCurrentPlayerId() {
  final id = OneSignal.User.pushSubscription.id;
  return (id != null && id.isNotEmpty) ? id : null;
}

Future<void> initSocket() async {
  try {
    final authService = AuthService();

    if (authService.isAuthenticated) {
      final socketService = serviceLocator<SocketService>();

      if (!socketService.isConnected) {
        log("🔌 initSocket() → connecting with teamId=${authService.teamId}");
        await socketService.initializeSocket(
          authService.token!,
          authService.teamId!.toString(),
          authService.userId!,
          authService.userName ?? 'User',
        );
        log("✅ initSocket() → socket connected");

        // Set OneSignal external user ID after socket connection
        await setOneSignalExternalUserId(authService.userId!);
      } else {
        log("✅ Socket already connected");
      }
    } else {
      log(
        "⚠️ initSocket() → user not authenticated, skipping socket connection",
      );
    }
  } catch (e, s) {
    log("🔥 initSocket() error: $e\n$s");
  }
}

Future<void> retryPendingPlayerIdUpload() async {
  try {
    final authService = AuthService();

    if (!authService.isAuthenticated) {
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final pendingPlayerId = prefs.getString('pending_player_id');

    if (pendingPlayerId != null && pendingPlayerId.isNotEmpty) {
      log('🔄 Found pending Player ID, attempting to upload...');
      await _sendPlayerIdToBackend(pendingPlayerId);
    }
  } catch (e) {
    log('⚠️ Error in retryPendingPlayerIdUpload: $e');
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Hydrated Storage
  final storage = await HydratedStorage.build(
    storageDirectory: HydratedStorageDirectory(
      (await getApplicationDocumentsDirectory()).path,
    ),
  );

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  HydratedBloc.storage = storage;

  // Lock orientation
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  await retryPendingPlayerIdUpload();

  // Flavor configuration
  const values = FlavorValues(
    baseUrl: AppConstants.baseUrl,
    logNetworkInfo: true,
    authProvider: ' ',
  );
  FlavorConfig(
    flavor: Flavor.dev,
    name: 'DEV',
    color: Colors.white,
    values: values,
  );

  // Initialize DI
  await init();

  // Initialize OneSignal BEFORE auth check
  await initOneSignal();

  // AuthService initialization
  final authService = AuthService();
  await authService.initialize();
  log(
    '🔐 AuthService initialized - isAuthenticated: ${authService.isAuthenticated}',
  );
  final authApi = serviceLocator<AuthApi>();
  await authApi.settingsApi(); // preload pages

  await initSocket();
  await WebRTC.initialize();

  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<SharedPreferences>(
      future: SharedPreferences.getInstance(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const MaterialApp(
            home: Scaffold(body: Center(child: CircularProgressIndicator())),
          );
        }

        final prefs = snapshot.data!;

        return MultiBlocProvider(
          providers: [
            BlocProvider(create: (_) => ThemeServiceBloc(prefs)),
            BlocProvider<AuthBloc>(create: (_) => serviceLocator<AuthBloc>()),
            BlocProvider<CreateReminderBloc>(
              create: (_) => CreateReminderBloc(),
            ),
            BlocProvider<DropdownBloc>(
              create: (_) => serviceLocator<DropdownBloc>(),
            ),
            BlocProvider<DashboardBloc>(
              create: (_) => serviceLocator<DashboardBloc>()..add(LoadChats()),
            ),
            BlocProvider<ChatBloc>(
              create: (_) =>
                  serviceLocator<ChatBloc>()..add(LoadConversations()),
            ),
            BlocProvider<CurrencyBloc>(
              create: (_) => CurrencyBloc()..add(LoadCurrencyEvent()),
            ),
            BlocProvider<LanguageBloc>(
              create: (_) =>
                  LanguageBloc(helper: LanguageHelper())
                    ..add(LoadLanguageEvent()),
            ),
          ],
          child: const AppView(),
        );
      },
    );
  }
}

class AppView extends StatelessWidget {
  const AppView({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return BlocBuilder<ThemeServiceBloc, ThemeServiceState>(
      builder: (context, themeState) {
        return BlocBuilder<LanguageBloc, LanguageState>(
          builder: (context, languageState) {
            return BlocBuilder<AuthBloc, AuthState>(
              builder: (context, authState) {
                final isLoggedIn =
                    authService.isAuthenticated && authState is AuthSuccess;
                _handleSocketConnection(authState);

                return ThemedStatusBar(
                  child: ScreenUtilInit(
                    child: MaterialApp(
                      navigatorKey: OneSignalService().navigatorKey,
                      title: appFonts.teamWise,
                      debugShowCheckedModeBanner: false,
                      theme: themeState.appTheme.themeData,
                      darkTheme: ThemeData.dark(),
                      themeMode: themeState.themeMode,
                      locale: languageState.locale,
                      supportedLocales: appArray.localList,
                      localizationsDelegates: const [
                        AppLocalizations.delegate,
                        CountryLocalizations.delegate,
                        GlobalMaterialLocalizations.delegate,
                        GlobalWidgetsLocalizations.delegate,
                        GlobalCupertinoLocalizations.delegate,
                      ],
                      builder: (context, child) {
                        return Directionality(
                          textDirection: languageState.textDirection,
                          child: child!,
                        );
                      },
                      initialRoute: isLoggedIn
                          ? (authService.isTeamSelected
                              ? routeName.dashboard
                              : routeName.welcomeTeamwiseScreen)
                          : routeName.login,
                      routes: appRoute.route,
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  void _handleSocketConnection(AuthState authState) async {
    final authService = AuthService();
    final socketService = serviceLocator<SocketService>();

    if (authState is AuthSuccess && authService.isAuthenticated) {
      if (!socketService.isConnected) {
        log('🔌 Connecting socket...');
        await socketService.initializeSocket(
          authService.token!,
          authService.teamId!.toString(),
          authService.userId!,
          authService.userName ?? 'User',
        );
        log('✅ Socket connected');
        await setOneSignalExternalUserId(authService.userId!);
      }
    } else if (authState is AuthInitial) {
      if (socketService.isConnected) {
        log('🔌 Disconnecting socket...');
        await socketService.disconnect();
        log('❌ Socket disconnected');
        await removeOneSignalExternalUserId();
      }
    }
  }
}
