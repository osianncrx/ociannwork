// ignore_for_file: deprecated_member_use

import 'package:teamwise/config.dart';

void showCancelReminderDialog(BuildContext context, VoidCallback onCancel) {
  showDialog(
    context: context,
    barrierDismissible: true,
    builder: (BuildContext context) {
      return AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.fromLTRB(15, 24, 15, 8),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ⚠️ Icon
            Container(
              decoration: BoxDecoration(
                color: appColor(context).red.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(16),
              child: Icon(
                Icons.warning_amber_rounded,
                color: appColor(context).red,
                size: 48,
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Text(
              "Cancel Reminder",
              style: appCss.dmSansBold19.textColor(appColor(context).black),
            ),
            VSpace(Sizes.s8),

            // Description
            Text(
              "Are you sure you want to cancel this reminder? This action cannot be undone.",
              textAlign: TextAlign.center,
              style: appCss.dmSansRegular14.textColor(appColor(context).black),
            ),
            VSpace(Sizes.s24),

            // Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.grey[200],
                      foregroundColor: appColor(context).black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text("Keep Reminder"),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: appColor(
                        context,
                      ).red, // Your yellow color
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () {
                      Navigator.of(context).pop();
                      onCancel();
                    },
                    child: Text("Cancel Reminder"),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    },
  );
}
