// import 'package:flutter/material.dart';
// import 'package:flutter_bloc/flutter_bloc.dart';
// import '../bloc/call_bloc.dart';
// import '../pages/call_screens.dart';
// import '../../data/models/call_models.dart';
//
// /// Main call widget that handles call state and routing to appropriate screens
// class CallWidget extends StatelessWidget {
//   final CallUser currentUser;
//
//   const CallWidget({
//     super.key,
//     required this.currentUser,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return BlocConsumer<CallBloc, CallBlocState>(
//       listener: (context, state) {
//         // Handle state changes that require navigation or showing dialogs
//         if (state is CallError) {
//           _showErrorDialog(context, state.message);
//         } else if (state is CallEnded) {
//           Navigator.of(context).pop();
//         }
//       },
//       builder: (context, state) {
//         if (state is CallInProgress) {
//           final callState = state.callState;
//
//           if (callState.callStatus == CallStatus.ringing && !callState.isInitiator) {
//             // Show incoming call screen
//             return IncomingCallScreen(
//               callState: callState,
//               onAccept: () => context.read<CallBloc>().add(
//                 CallAccept(callId: callState.callId!, currentUser: currentUser),
//               ),
//               onDecline: () => context.read<CallBloc>().add(
//                 CallDecline(callId: callState.callId!),
//               ),
//             );
//           } else if (callState.isInCall ||
//                      callState.callStatus == CallStatus.calling ||
//                      callState.callStatus == CallStatus.connected) {
//             // Show active call screen
//             return VideoCallScreen(
//               callState: callState,
//               participants: state.participants,
//             );
//           }
//         }
//
//         // No active call or loading state
//         return const SizedBox.shrink();
//       },
//     );
//   }
//
//   void _showErrorDialog(BuildContext context, String message) {
//     showDialog(
//       context: context,
//       builder: (context) => AlertDialog(
//         title: const Text('Call Error'),
//         content: Text(message),
//         actions: [
//           TextButton(
//             onPressed: () => Navigator.of(context).pop(),
//             child: const Text('OK'),
//           ),
//         ],
//       ),
//     );
//   }
// }
//
// /// Call notification widget for showing call status in chat
// class CallNotificationWidget extends StatelessWidget {
//   final String callId;
//   final CallType callType;
//   final String callerName;
//   final CallStatus status;
//   final DateTime timestamp;
//   final Duration? duration;
//
//   const CallNotificationWidget({
//     super.key,
//     required this.callId,
//     required this.callType,
//     required this.callerName,
//     required this.status,
//     required this.timestamp,
//     this.duration,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
//       padding: const EdgeInsets.all(12),
//       decoration: BoxDecoration(
//         color: _getStatusColor().withOpacity(0.1),
//         borderRadius: BorderRadius.circular(8),
//         border: Border.all(color: _getStatusColor().withOpacity(0.3)),
//       ),
//       child: Row(
//         children: [
//           Icon(
//             _getStatusIcon(),
//             color: _getStatusColor(),
//             size: 20,
//           ),
//           const SizedBox(width: 8),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 Text(
//                   _getStatusText(),
//                   style: TextStyle(
//                     fontWeight: FontWeight.w500,
//                     color: _getStatusColor(),
//                   ),
//                 ),
//                 Text(
//                   _formatTimestamp(),
//                   style: TextStyle(
//                     fontSize: 12,
//                     color: Colors.grey[600],
//                   ),
//                 ),
//               ],
//             ),
//           ),
//           if (duration != null)
//             Text(
//               _formatDuration(),
//               style: TextStyle(
//                 fontSize: 12,
//                 color: Colors.grey[600],
//               ),
//             ),
//         ],
//       ),
//     );
//   }
//
//   IconData _getStatusIcon() {
//     switch (status) {
//       case CallStatus.missed:
//         return Icons.call_received;
//       case CallStatus.ended:
//         return callType == CallType.video ? Icons.videocam : Icons.call;
//       case CallStatus.calling:
//         return Icons.call_made;
//       case CallStatus.noAnswer:
//         return Icons.call_made;
//       default:
//         return callType == CallType.video ? Icons.videocam : Icons.call;
//     }
//   }
//
//   Color _getStatusColor() {
//     switch (status) {
//       case CallStatus.missed:
//         return Colors.red;
//       case CallStatus.ended:
//         return Colors.green;
//       case CallStatus.calling:
//         return Colors.blue;
//       case CallStatus.noAnswer:
//         return Colors.orange;
//       default:
//         return Colors.grey;
//     }
//   }
//
//   String _getStatusText() {
//     switch (status) {
//       case CallStatus.missed:
//         return 'Missed ${callType.name} call from $callerName';
//       case CallStatus.ended:
//         return '${callType.name.capitalizeFirst} call with $callerName';
//       case CallStatus.calling:
//         return 'Calling $callerName...';
//       case CallStatus.noAnswer:
//         return 'No answer from $callerName';
//       default:
//         return '${callType.name.capitalizeFirst} call';
//     }
//   }
//
//   String _formatTimestamp() {
//     final now = DateTime.now();
//     final diff = now.difference(timestamp);
//
//     if (diff.inDays > 0) {
//       return '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
//     } else if (diff.inHours > 0) {
//       return '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
//     } else if (diff.inMinutes > 0) {
//       return '${diff.inMinutes} minute${diff.inMinutes > 1 ? 's' : ''} ago';
//     } else {
//       return 'Just now';
//     }
//   }
//
//   String _formatDuration() {
//     if (duration == null) return '';
//
//     final minutes = duration!.inMinutes;
//     final seconds = duration!.inSeconds % 60;
//
//     if (minutes > 0) {
//       return '${minutes}m ${seconds}s';
//     } else {
//       return '${seconds}s';
//     }
//   }
// }
//
// /// Floating call widget for showing minimal call interface when user navigates away
// class FloatingCallWidget extends StatelessWidget {
//   final CallState callState;
//   final VoidCallback onTap;
//
//   const FloatingCallWidget({
//     super.key,
//     required this.callState,
//     required this.onTap,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     if (!callState.isInCall) return const SizedBox.shrink();
//
//     return Positioned(
//       top: MediaQuery.of(context).padding.top + 10,
//       left: 20,
//       right: 20,
//       child: GestureDetector(
//         onTap: onTap,
//         child: Container(
//           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
//           decoration: BoxDecoration(
//             color: Colors.green,
//             borderRadius: BorderRadius.circular(25),
//             boxShadow: [
//               BoxShadow(
//                 color: Colors.black.withOpacity(0.2),
//                 blurRadius: 8,
//                 offset: const Offset(0, 2),
//               ),
//             ],
//           ),
//           child: Row(
//             children: [
//               Icon(
//                 callState.callType == CallType.video
//                     ? Icons.videocam
//                     : Icons.call,
//                 color: Colors.white,
//                 size: 20,
//               ),
//               const SizedBox(width: 8),
//               Expanded(
//                 child: Text(
//                   callState.chatName ?? 'Ongoing call',
//                   style: const TextStyle(
//                     color: Colors.white,
//                     fontWeight: FontWeight.w500,
//                   ),
//                   overflow: TextOverflow.ellipsis,
//                 ),
//               ),
//               const SizedBox(width: 8),
//               StreamBuilder<int>(
//                 stream: Stream.periodic(const Duration(seconds: 1))
//                     .map((_) => callState.callStartTime != null
//                         ? DateTime.now().difference(callState.callStartTime!).inSeconds
//                         : 0),
//                 builder: (context, snapshot) {
//                   final seconds = snapshot.data ?? 0;
//                   final minutes = seconds ~/ 60;
//                   final remainingSeconds = seconds % 60;
//
//                   return Text(
//                     '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}',
//                     style: const TextStyle(
//                       color: Colors.white,
//                       fontSize: 12,
//                     ),
//                   );
//                 },
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }
//
// /// Call action buttons for chat interface
// class CallActionButtons extends StatelessWidget {
//   final String chatId;
//   final String chatName;
//   final ChatType chatType;
//   final CallUser currentUser;
//   final String? teamId;
//
//   const CallActionButtons({
//     super.key,
//     required this.chatId,
//     required this.chatName,
//     required this.chatType,
//     required this.currentUser,
//     this.teamId,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return BlocBuilder<CallBloc, CallBlocState>(
//       builder: (context, state) {
//         // Don't show call buttons if already in call
//         if (state is CallInProgress) {
//           return const SizedBox.shrink();
//         }
//
//         return Row(
//           children: [
//             // Audio call button
//             IconButton(
//               onPressed: () => _initiateCall(context, CallType.audio),
//               icon: const Icon(Icons.call),
//               tooltip: 'Audio call',
//             ),
//
//             // Video call button
//             IconButton(
//               onPressed: () => _initiateCall(context, CallType.video),
//               icon: const Icon(Icons.videocam),
//               tooltip: 'Video call',
//             ),
//           ],
//         );
//       },
//     );
//   }
//
//   void _initiateCall(BuildContext context, CallType callType) {
//     context.read<CallBloc>().add(
//       CallInitiate(
//         chatId: chatId,
//         chatName: chatName,
//         chatType: chatType,
//         callType: callType,
//         currentUser: currentUser,
//         teamId: teamId,
//       ),
//     );
//   }
// }
//
// // Extension for string capitalization
// extension StringExtension on String {
//   String get capitalizeFirst {
//     if (isEmpty) return this;
//     return this[0].toUpperCase() + substring(1);
//   }
// }