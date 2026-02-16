import 'package:teamwise/features/chat/presentation/widgets/WebRTCCallService.dart';

import '../../../../config.dart';

class IncomingCallDialog extends StatelessWidget {
  final String callerId;
  final String callerName;
  final CallType callType;
  final String callId;
  final String? timestamp;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const IncomingCallDialog({super.key, required this.callerId, required this.callerName, required this.callType, required this.callId, this.timestamp, required this.onAccept, required this.onDecline});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Incoming ${callType.name} call'),
      content: Text('$callerName is calling...'),
      actions: [
        TextButton(onPressed: onDecline, child: Text('Decline')),
        ElevatedButton(onPressed: onAccept, child: Text('Accept')),
      ],
    );
  }
}
