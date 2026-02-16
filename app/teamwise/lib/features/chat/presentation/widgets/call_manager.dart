// import 'dart:developer';
// import 'package:flutter/material.dart';
// import 'package:teamwise/features/chat/presentation/widgets/WebRTCCallService.dart';
// import 'package:teamwise/features/chat/presentation/pages/call_screen.dart';
//
// import 'incoming_call.dart';
//
// class CallManager {
//   static final CallManager _instance = CallManager._internal();
//   factory CallManager() => _instance;
//   CallManager._internal();
//
//   static CallManager get instance => _instance;
//
//   final WebRTCCallService _callService = WebRTCCallService();
//   BuildContext? _currentContext;
//   bool _isCallActive = false;
//
//   void initialize(BuildContext context) {
//     _currentContext = context;
//     _setupCallListeners();
//     _callService.initialize();
//     log('CallManager initialized');
//   }
//
//   void _setupCallListeners() {
//     // Listen for incoming calls
//     _callService.socketService.onSocketEvent('incoming-call', (data) {
//       log('CallManager received incoming call: $data');
//       _handleIncomingCall(data);
//     });
//
//     // Listen for call state changes
//     _callService.callStateStream.listen((state) {
//       if (state == CallState.ended || state == CallState.idle) {
//         _isCallActive = false;
//       } else if (state == CallState.connected) {
//         _isCallActive = true;
//       }
//     });
//   }
//
//   void _handleIncomingCall(Map<String, dynamic> data) {
//     if (_currentContext == null) {
//       log('No context available for incoming call');
//       return;
//     }
//
//     if (_isCallActive) {
//       log('Already in a call, declining incoming call');
//       _callService.declineCall();
//       return;
//     }
//
//     try {
//       final callerId = data['initiator']['userId'];
//       final callerName = data['initiator']['name'] ?? 'Unknown';
//       final callId = data['callId'];
//       final callType = data['callType'] == 'video' ? CallType.video : CallType.audio;
//
//       log('Showing incoming call dialog for $callerName ($callType)');
//
//       showDialog(context: _currentContext!, builder: (context) {
//         return IncomingCallDialog( callerId: callerId,
//           callerName: callerName,
//           callType: callType,
//           callId: callId);
//       },);
//
//     } catch (e) {
//       log('Error handling incoming call: $e');
//     }
//   }
//
//   Future<void> startCall({
//     required String recipientId,
//     required String recipientName,
//     required CallType callType,
//   }) async {
//     if (_isCallActive) {
//       log('Already in a call');
//       return;
//     }
//
//     if (_currentContext == null) {
//       log('No context available for starting call');
//       return;
//     }
//
//     try {
//       // Navigate to call screen first
//       Navigator.of(_currentContext!).push(
//         MaterialPageRoute(
//           builder: (context) => CallScreen(
//             participantId: recipientId,
//             participantName: recipientName,
//             callType: callType,
//             isIncoming: false,
//           ),
//         ),
//       );
//
//       // Start the actual call
//       final success = await _callService.startCall(
//         recipientId: recipientId,
//         recipientName: recipientName,
//         callType: callType,
//       );
//
//       if (!success) {
//         log('Failed to start call');
//         Navigator.of(_currentContext!).pop();
//       }
//     } catch (e) {
//       log('Error starting call: $e');
//     }
//   }
//
//   void updateContext(BuildContext context) {
//     _currentContext = context;
//   }
//
//   void dispose() {
//     _callService.dispose();
//     _currentContext = null;
//     _isCallActive = false;
//   }}