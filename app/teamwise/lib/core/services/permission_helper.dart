import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionHelper {
  static Future<bool> requestCallPermissions(BuildContext context, bool needVideo) async {
    List<Permission> permissions = [Permission.microphone];
    if (needVideo) {
      permissions.add(Permission.camera);
    }

    Map<Permission, PermissionStatus> statuses = await permissions.request();

    bool allGranted = statuses.values.every((status) => status.isGranted);

    if (!allGranted) {
      // Show dialog explaining why permissions are needed
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Permissions Required'),
          content: Text(
            needVideo
                ? 'Camera and microphone access are required for video calls.'
                : 'Microphone access is required for audio calls.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                openAppSettings();
              },
              child: Text('Settings'),
            ),
          ],
        ),
      );
    }

    return allGranted;
  }
}