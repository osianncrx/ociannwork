// import 'dart:async';
// import 'dart:developer';
//
// import '../../../../config.dart';
// import '../../socket_service.dart';
// import '../bloc/chat_bloc.dart';
//
// class ReactiveMessageBubble extends StatefulWidget {
//   final Map<String, dynamic> message;
//   final bool isMe;
//   final String recipientName;
//   final bool isChannel;
//   final Function(String, String) onAddReaction;
//   final Function(String, String) onRemoveReaction;
//
//   const ReactiveMessageBubble({
//     super.key,
//     required this.message,
//     required this.isMe,
//     required this.recipientName,
//     required this.isChannel,
//     required this.onAddReaction,
//     required this.onRemoveReaction,
//   });
//
//   @override
//   State<ReactiveMessageBubble> createState() => _ReactiveMessageBubbleState();
// }
//
// class _ReactiveMessageBubbleState extends State<ReactiveMessageBubble> {
//   List<dynamic> _reactions = [];
//   StreamSubscription<Map<String, dynamic>>? _reactionSubscription;
//
//   @override
//   void initState() {
//     super.initState();
//     _reactions = List.from(widget.message['reactions'] ?? []);
//
//     // Listen for reaction updates from the bloc
//     final chatBloc = context.read<ChatBloc>();
//     _reactionSubscription = chatBloc.reactionUpdates.listen((update) {
//       final messageId = update['messageId'];
//       final currentMessageId = widget.message['id']?.toString();
//
//       if (messageId == currentMessageId) {
//         log('🔄 Reaction update received for this message: $update');
//
//         // Refresh the message from the bloc to get updated reactions
//         final updatedMessages = chatBloc.messages;
//         final updatedMessage = updatedMessages.firstWhere(
//               (msg) => msg['id']?.toString() == currentMessageId,
//           orElse: () => widget.message,
//         );
//
//         if (mounted) {
//           setState(() {
//             _reactions = List.from(updatedMessage['reactions'] ?? []);
//           });
//         }
//       }
//     });
//   }
//
//   @override
//   void didUpdateWidget(ReactiveMessageBubble oldWidget) {
//     super.didUpdateWidget(oldWidget);
//
//     // Update if the message data changed
//     if (!_areMessagesEqual(oldWidget.message, widget.message)) {
//       setState(() {
//         _reactions = List.from(widget.message['reactions'] ?? []);
//       });
//     }
//   }
//
//   bool _areMessagesEqual(Map<String, dynamic> msg1, Map<String, dynamic> msg2) {
//     final reactions1 = msg1['reactions'] ?? [];
//     final reactions2 = msg2['reactions'] ?? [];
//
//     if (reactions1.length != reactions2.length) return false;
//
//     for (int i = 0; i < reactions1.length; i++) {
//       final r1 = reactions1[i];
//       final r2 = reactions2[i];
//       if (r1['emoji'] != r2['emoji'] || r1['user_id'] != r2['user_id']) {
//         return false;
//       }
//     }
//
//     return true;
//   }
//
//   @override
//   void dispose() {
//     _reactionSubscription?.cancel();
//     super.dispose();
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     return _buildMessageBubbleWithReactions();
//   }
//
//   Widget _buildMessageBubbleWithReactions() {
//     return Column(
//       crossAxisAlignment: widget.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
//       children: [
//         _buildMessageContent(),
//
//         // Show reactions below the message
//         if (_reactions.isNotEmpty)
//           Container(
//             margin: EdgeInsets.only(
//               top: 4,
//               left: widget.isMe ? 0 : 40,
//               right: widget.isMe ? 10 : 0,
//             ),
//             child: Wrap(
//               children: _buildReactionChips(),
//             ),
//           ),
//       ],
//     );
//   }
//
//   Widget _buildMessageContent() {
//     // Your existing message bubble implementation
//     final content = widget.message['content']?.toString() ?? '';
//     final timestamp = widget.message['created_at']?.toString() ?? '';
//     final senderName = widget.message['sender']?['name']?.toString() ?? '?';
//     final isPending = widget.message['isPending'] == true;
//     final isFavorite = widget.message['isFavorite'] == true;
//     final isPinned = widget.message['isPinned'] == true;
//
//     final bubbleColor = widget.isMe ?  appColor(context).primary : const Color(0xfff0f0f0);
//
//     return Container(
//       margin: const EdgeInsets.only(bottom: 8),
//       child: Row(
//         mainAxisAlignment: widget.isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           if (!widget.isMe)
//             Container(
//               width: Sizes.s30,
//               height: Sizes.s30,
//               decoration: BoxDecoration(
//                 borderRadius: BorderRadius.circular(10),
//                 color: const Color(0xfff0f0f0),
//               ),
//               child: Text(senderName[0].toUpperCase()).center(),
//             ),
//           if (!widget.isMe) HSpace(Sizes.s10),
//           Flexible(
//             child: CustomPaint(
//               painter: _CustomChatBubble(color: bubbleColor, isOwn: widget.isMe),
//               child: Container(
//                 margin: EdgeInsets.only(right: widget.isMe ? Sizes.s10 : 0),
//                 padding: EdgeInsets.symmetric(
//                   horizontal: Sizes.s16,
//                   vertical: Sizes.s12,
//                 ),
//                 child: Column(
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     if (!widget.isMe && widget.isChannel)
//                       Text(
//                         senderName,
//                         style: appCss.dmSansMedium18.textColor(
//                            appColor(context).fieldCardBg,
//                         ),
//                       ),
//                     ConstrainedBox(
//                       constraints: const BoxConstraints(maxWidth: 230),
//                       child: Text(
//                         content,
//                         style: TextStyle(
//                           color: widget.isMe ?  appColor(context).white :  appColor(context).black,
//                           fontSize: 16,
//                         ),
//                       ),
//                     ),
//                     VSpace(Sizes.s5),
//                     Row(
//                       mainAxisSize: MainAxisSize.min,
//                       children: [
//                         if (isFavorite)
//                           Icon(
//                             Icons.star,
//                             color: Colors.yellow,
//                             size: 16,
//                           ),
//                         if (isPinned)
//                           Icon(
//                             Icons.push_pin,
//                             color: Colors.blue,
//                             size: 16,
//                           ),
//                         if (isFavorite || isPinned) HSpace(Sizes.s5),
//                         if (isPending)
//                           Container(
//                             margin: EdgeInsets.only(right: Sizes.s5),
//                             child: SizedBox(
//                               width: 12,
//                               height: 12,
//                               child: CircularProgressIndicator(
//                                 strokeWidth: 1.5,
//                                 valueColor: AlwaysStoppedAnimation<Color>(
//                                   widget.isMe ? Colors.white70 : Colors.grey,
//                                 ),
//                               ),
//                             ),
//                           ),
//                         Text(
//                           _formatTimestampSafe(timestamp),
//                           style: appCss.dmSansMedium11.textColor(
//                             widget.isMe
//                                 ?  appColor(context).white.withValues(alpha: 0.5)
//                                 :  appColor(context).gray,
//                           ),
//                         ),
//                       ],
//                     ),
//                   ],
//                 ),
//               ),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
//
//   List<Widget> _buildReactionChips() {
//     // Group reactions by emoji
//     Map<String, List<dynamic>> groupedReactions = {};
//     final currentUserId = SocketService().currentUserId;
//
//     for (var reaction in _reactions) {
//       final emoji = reaction['emoji']?.toString() ?? '';
//       final userId = reaction['user_id']?.toString();
//
//       if (emoji.isNotEmpty) {
//         groupedReactions.putIfAbsent(emoji, () => []);
//         groupedReactions[emoji]!.add(reaction);
//       }
//     }
//
//     return groupedReactions.entries.map((entry) {
//       final emoji = entry.key;
//       final reactionList = entry.value;
//       final count = reactionList.length;
//
//       final hasUserReacted = reactionList.any((r) =>
//       r['user_id']?.toString() == currentUserId
//       );
//
//       return GestureDetector(
//         onTap: () {
//           if (hasUserReacted) {
//             widget.onRemoveReaction(widget.message['id']?.toString() ?? '', emoji);
//           } else {
//             widget.onAddReaction(widget.message['id']?.toString() ?? '', emoji);
//           }
//         },
//         child: Container(
//           margin: EdgeInsets.only(right: 4, bottom: 4),
//           padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
//           decoration: BoxDecoration(
//             color: hasUserReacted
//                 ?  appColor(context).primary.withValues(alpha: 0.2)
//                 : Colors.grey.withValues(alpha: 0.2),
//             borderRadius: BorderRadius.circular(12),
//             border: Border.all(
//               color: hasUserReacted
//                   ?  appColor(context).primary
//                   : Colors.grey.withValues(alpha: 0.5),
//               width: 1,
//             ),
//           ),
//           child: Row(
//             mainAxisSize: MainAxisSize.min,
//             children: [
//               Text(emoji, style: TextStyle(fontSize: 14)),
//               if (count > 1) ...[
//                 SizedBox(width: 4),
//                 Text(
//                   count.toString(),
//                   style: TextStyle(
//                     fontSize: 12,
//                     color: hasUserReacted
//                         ?  appColor(context).primary
//                         : Colors.grey[700],
//                     fontWeight: FontWeight.w500,
//                   ),
//                 ),
//               ],
//             ],
//           ),
//         ),
//       );
//     }).toList();
//   }
//
//   String _formatTimestampSafe(String? timestamp) {
//     if (timestamp == null || timestamp.isEmpty) return 'Now';
//     try {
//       final dateTime = DateTime.parse(timestamp).toLocal();
//       return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
//     } catch (e) {
//       return 'Now';
//     }
//   }
// }
//
// class _CustomChatBubble extends CustomPainter {
//   final Color color;
//   final bool isOwn;
//
//   _CustomChatBubble({required this.color, required this.isOwn});
//
//   @override
//   void paint(Canvas canvas, Size size) {
//     final paint = Paint()..color = color;
//     final rrect = RRect.fromRectAndRadius(
//       Rect.fromLTWH(0, 0, size.width, size.height),
//       const Radius.circular(12),
//     );
//     canvas.drawRRect(rrect, paint);
//
//     final tail = Path();
//     if (isOwn) {
//       tail
//         ..moveTo(size.width - 6, size.height - 4)
//         ..quadraticBezierTo(
//           size.width + 3,
//           size.height,
//           size.width + 10,
//           size.height - 4,
//         )
//         ..quadraticBezierTo(
//           size.width + 3,
//           size.height - 5,
//           size.width,
//           size.height - 12,
//         );
//     } else {
//       tail
//         ..moveTo(6, size.height - 4)
//         ..quadraticBezierTo(-3, size.height, -10, size.height - 4)
//         ..quadraticBezierTo(-3, size.height - 5, 0, size.height - 12);
//     }
//     canvas.drawPath(tail, paint);
//   }
//
//   @override
//   bool shouldRepaint(covariant _CustomChatBubble old) =>
//       old.color != color || old.isOwn != isOwn;
// }
