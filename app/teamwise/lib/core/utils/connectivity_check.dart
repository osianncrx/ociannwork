import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../../common/widgets/app_toast.dart';

final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

class ConnectivityService {
  ConnectivityService._internal();

  static final ConnectivityService _instance = ConnectivityService._internal();

  factory ConnectivityService() => _instance;

  final Connectivity _connectivity = Connectivity();
  Connectivity get connectivity => _connectivity;

  void initialize() {
    _connectivity.onConnectivityChanged.listen((
      List<ConnectivityResult> result,
    ) {
      String message;
      if (result.first == ConnectivityResult.mobile) {
        message = 'Connected to Mobile Network';
        AppToast.showMessage(             message,
        );

        scaffoldMessengerKey.currentState?.clearSnackBars();
        /* navigatorKey.currentState?.pop(); */
      } else if (result.first == ConnectivityResult.wifi) {
        message = 'Connected to WiFi';
        AppToast.showMessage(             message,
        );

        scaffoldMessengerKey.currentState?.clearSnackBars();
        /* navigatorKey.currentState?.pop(); */
      } else {
        message = 'No Network Connection';
        // scaffoldMessengerKey.currentState?.showMaterialBanner(
        //   const MaterialBanner(
        //     content: Text('No Network Connection'),
        //     actions: [],

        //   ),
        // );
        // scaffoldMessengerKey.currentState?.showSnackBar(SnackBar(
        //   content: Text(
        //     message,
        //     style: const TextStyle(color: Colors.white),
        //   ),
        //   backgroundColor: Colors.red,
        //   duration: const Duration(minutes: 1),
        //   dismissDirection: DismissDirection.down,
        // ));
        /*  if (navigatorKey.currentContext != null) {
          _showNoConnectionDialog(navigatorKey.currentContext!);
        } */
      }
    });
  }

  Future<List<ConnectivityResult>> checkConnectivity() {
    return _connectivity.checkConnectivity();
  }
}
