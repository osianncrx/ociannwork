import 'dart:convert';
import 'dart:developer';
import 'package:flutter/services.dart';
import 'package:teamwise/core/network/app_constants.dart';
import 'package:teamwise/core/network/extensions.dart';
import '../../../../core/services/encryption_service.dart';
import '../../../chat/data/datasources/chat_Api.dart';
import '../../../../config.dart';
import '../../../../core/utils/quill_parser.dart';
import '../../../auth/data/auth_services.dart';

class ChatItemWidget extends StatefulWidget {
  final MessageModel chat;
  final VoidCallback? onTap;
  final VoidCallback? onPinToggle;
  final bool showDivider, isOnline;

  const ChatItemWidget({
    super.key,
    required this.chat,
    this.onTap,
    this.onPinToggle,
    this.showDivider = true,
    this.isOnline = false,
  });

  @override
  State<ChatItemWidget> createState() => _ChatItemWidgetState();
}

class _ChatItemWidgetState extends State<ChatItemWidget> {
  bool isLongPressed = false;
  final EncryptionService _encryptionService = EncryptionService();
  String? _decryptedContent;
  bool _isDecrypting = false;

  @override
  void initState() {
    super.initState();
    log("message-=-=-=-=-=-=${widget.chat.lastMessage}");
    _tryDecryptLastMessage();
  }

  @override
  void didUpdateWidget(ChatItemWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    log("message-=-=-=-=-=-= OLD${oldWidget.chat.lastMessage}");
    // 🔍 Log state changes for debugging
    if (oldWidget.chat.pinned != widget.chat.pinned) {
      log(
        '📌 Pin state changed for ${widget.chat.name}: ${oldWidget.chat.pinned} -> ${widget.chat.pinned}',
      );
    }

    if (oldWidget.chat.muted != widget.chat.muted) {
      log(
        '🔕 Mute state changed for ${widget.chat.name}: ${oldWidget.chat.muted} -> ${widget.chat.muted}',
      );
    }

    if (oldWidget.chat.unreadCount != widget.chat.unreadCount) {
      log(
        '📬 Unread count changed for ${widget.chat.name}: ${oldWidget.chat.unreadCount} -> ${widget.chat.unreadCount}',
      );
    }

    if (oldWidget.chat.lastMessage != widget.chat.lastMessage) {
      _tryDecryptLastMessage();
    }
  }

  Future<void> _tryDecryptLastMessage() async {
    final lastMessage = widget.chat.lastMessage;
    final isEncrypted = widget.chat.isEncrypted;

    if (lastMessage == null || !isEncrypted) {
      if (mounted) setState(() => _decryptedContent = null);
      /* return; */
    }
    log("message TRT DECRYPT LAST MESSAGE ");
    if (_decryptedContent != null) return; // Already decrypted

    // Avoid multiple simultaneous decryptions
    if (_isDecrypting) return;
    _isDecrypting = true;

    try {
      final senderId = widget.chat.lastMessageSenderId;
      if (senderId == null) {
        // If no sender ID, cannot fetch key
        _isDecrypting = false;
        return;
      }

      final chatApi = serviceLocator<ChatApi>();
      final pubKey = await chatApi.getPublicKey(senderId);

      if (pubKey != null) {
        final aesKey = _encryptionService.deriveAESKey(pubKey);
        final decrypted = _encryptionService.decryptMessage(
          lastMessage.toString(),
          aesKey,
        );
        if (mounted) {
          setState(() {
            _decryptedContent = decrypted;
          });
        }
      }
    } catch (e) {
      log('❌ Error decrypting last message in widget: $e');
    } finally {
      _isDecrypting = false;
    }
  }

  Future<void> _showChatMenu(BuildContext context) async {
    final RenderBox renderBox = context.findRenderObject() as RenderBox;
    final Offset offset = renderBox.localToGlobal(Offset.zero);
    final Size size = renderBox.size;
    final isMe = widget.chat.recipientId?.toString() == AuthService().userId;

    log('📋 Opening context menu for: ${widget.chat.name}');
    log('   Pinned: ${widget.chat.pinned}');
    log('   Muted: ${widget.chat.muted}');

    final result = await showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        offset.dx + size.width / 2,
        offset.dy - 10,
        offset.dx,
        offset.dy + size.height,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: appColor(context).white,
      elevation: 8,
      items: [
        // Pin/Unpin Option
        PopupMenuItem(
          value: 'pin',
          child: Row(
            children: [
              Icon(
                widget.chat.pinned ? Icons.push_pin : Icons.push_pin_outlined,
                color: appColor(context).darkText,
                size: 20,
              ),
              const SizedBox(width: 12),
              Text(
                widget.chat.pinned ? 'Unpin Chat' : 'Pin Chat',
                style: appCss.dmSansMedium14.textColor(
                  appColor(context).darkText,
                ),
              ),
            ],
          ),
        ),

        // Mute/Unmute Option (only if not self)
        if (!isMe)
          PopupMenuItem(
            value: 'mute',
            child: Row(
              children: [
                Icon(
                  widget.chat.muted ? Icons.volume_up : Icons.volume_off,
                  color: appColor(context).darkText,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.chat.muted ? 'Unmute Chat' : 'Mute Chat',
                      style: appCss.dmSansMedium14.textColor(
                        appColor(context).darkText,
                      ),
                    ),
                    if (widget.chat.muted)
                      Text(
                        'Notifications are off',
                        style: appCss.dmSansRegular12.textColor(
                          appColor(context).gray,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );

    setState(() => isLongPressed = false);

    if (result == 'pin') {
      log('📌 Pin action selected for: ${widget.chat.name}');
      widget.onPinToggle?.call();
    } else if (result == 'mute') {
      if (widget.chat.muted) {
        log('🔔 Unmute action selected for: ${widget.chat.name}');
        _handleUnmute(context);
      } else {
        log('🔇 Mute action selected for: ${widget.chat.name}');
        _showMuteBottomSheet(context);
      }
    }
  }

  void _showMuteBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => MuteNotificationBottomSheet(
        chat: widget.chat,
        onMute: (duration) {
          log('🔇 Muting chat ${widget.chat.name} for $duration');
          context.read<DashboardBloc>().add(
            ToggleMuteChat(
              chatId: widget.chat.id,
              duration: duration,
              mute: true,
            ),
          );
        },
      ),
    );
  }

  void _handleUnmute(BuildContext context) {
    log('🔔 Unmuting chat ${widget.chat.name}');
    context.read<DashboardBloc>().add(
      ToggleMuteChat(chatId: widget.chat.id, duration: '', mute: false),
    );
  }

  Widget _buildLastMessagePreview() {
    final lastMessage = widget.chat.lastMessage;
    final lastMessageType = widget.chat.lastMessageType ?? 'text';
    final contentToUse = _decryptedContent ?? lastMessage ?? '';
    log(
      "lastMessage, lastMessageType, contentToUse $lastMessage, $lastMessageType, $contentToUse",
    );
    // If it's pure text, we might need to parse Quill Delta if it is in that format
    String displayText = '';
    // if (contentToUse.contains('{"ops":') && contentToUse.contains('"insert"')) {
    //   displayText = QuillParser.deltaToPlainText(contentToUse).trim();
    // } else {
    //   displayText = contentToUse.trim();
    // }
    if ((contentToUse.contains('{"ops":') &&
            contentToUse.contains('"insert"')) ||
        (contentToUse.contains('mention') && contentToUse.contains('value:'))) {
      displayText = QuillParser.deltaToPlainText(contentToUse).trim();
    } else {
      displayText = contentToUse.trim();
    }
    // Truncate
    if (displayText.length > 50) {
      displayText = '${displayText.substring(0, 50)}...';
    }

    final style = appCss.dmSansMedium12.textColor(
      appColor(context).black.withOpacity(0.7),
    );
    final iconColor = appColor(context).black.withOpacity(0.7);
    const double iconSize = 14;
    const double spacerWidth = 4;

    switch (lastMessageType) {
      case 'image':
        return Row(
          children: [
            Icon(Icons.image_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Image",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'video':
        return Row(
          children: [
            Icon(Icons.videocam_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Video",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'audio':
      case 'voice':
        return Row(
          children: [
            Icon(Icons.mic_none_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Audio",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'file':
      case 'document':
        return Row(
          children: [
            Icon(
              Icons.insert_drive_file_outlined,
              size: iconSize,
              color: iconColor,
            ),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "File",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'location':
        return Row(
          children: [
            Icon(Icons.location_on_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Location",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'poll':
      case 'chart':
        return Row(
          children: [
            Icon(Icons.bar_chart_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Chart",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'form':
        return Row(
          children: [
            Icon(Icons.assignment_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Form",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'call':
        return Row(
          children: [
            Icon(Icons.call_outlined, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Call",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case 'link':
        return Row(
          children: [
            Icon(Icons.link, size: iconSize, color: iconColor),
            SizedBox(width: spacerWidth),
            Expanded(
              child: Text(
                "Link",
                style: style,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      default:
        // For text, check if it's empty (maybe just whitespace or empty delta)
        if (displayText.isEmpty) {
          return Text(
            lastMessageType.toTitleCase(),
            style: style,
            overflow: TextOverflow.ellipsis,
          );
        }
        return Text(displayText, style: style, overflow: TextOverflow.ellipsis);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isChannel =
        widget.chat.chatType == 'channel' || widget.chat.isChannel;
    final bool isMuted = widget.chat.muted;
    final isMe = widget.chat.recipientId?.toString() == AuthService().userId;

    final displayName = isMe
        ? "${widget.chat.name.toTitleCase()} (ME)"
        : widget.chat.name.toTitleCase();

    return Column(
      children: [
        GestureDetector(
          onTap: widget.onTap,
          onLongPress: () {
            HapticFeedback.selectionClick();
            setState(() => isLongPressed = true);
            _showChatMenu(context);
          },
          onLongPressEnd: (_) {
            setState(() => isLongPressed = false);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: isLongPressed
                  ? appColor(context).primary.withOpacity(0.15)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: ListTile(
              enabled: true,
              enableFeedback: true,

              // ✅ Leading: Avatar with online status
              leading: Stack(
                children: [
                  Container(
                    height: Sizes.s40,
                    width: Sizes.s40,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: isDark(context)
                            ? appColor(context).gray.withValues(alpha: 0.8)
                            : appColor(context).darkText,
                      ),
                      color: widget.chat.profileColor != null
                          ? hexToColor(widget.chat.profileColor!)
                          : appColor(context).primary,
                      borderRadius: BorderRadius.all(
                        Radius.circular(Sizes.s10),
                      ),
                    ),
                    child: isChannel
                        ? Icon(Icons.tag, color: Colors.black, size: 24)
                        : (widget.chat.avatarUrl == null
                              ? Text(
                                  widget.chat.name[0].toUpperCase(),
                                  style: appCss.dmSansMedium18.textColor(
                                    Colors.black,
                                  ),
                                ).center()
                              : ClipRRect(
                                  borderRadius: BorderRadius.circular(
                                    Sizes.s10,
                                  ),
                                  child: Image.network(
                                    "${AppConstants.appUrl}${widget.chat.avatarUrl}",
                                    fit: BoxFit.cover,
                                    width: Sizes.s40,
                                    height: Sizes.s40,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Text(
                                        widget.chat.name[0].toUpperCase(),
                                        style: appCss.dmSansMedium18.textColor(
                                          appColor(context).darkText,
                                        ),
                                      ).center();
                                    },
                                  ),
                                )),
                  ),

                  // Online status indicator (only for DMs, not for self)
                  if (!isChannel && !isMe)
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: widget.isOnline ? Colors.green : Colors.orange,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                ],
              ),

              // ✅ Title alignment
              titleAlignment: isMe
                  ? ListTileTitleAlignment.top
                  : ListTileTitleAlignment.center,

              // ✅ Title: Chat name
              title: Row(
                children: [
                  Expanded(
                    child: Text(
                      displayName,
                      style: appCss.dmSansSemiBold16.textColor(
                        appColor(context).black,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              // ✅ Subtitle: Last message preview
              subtitle: _buildLastMessagePreview(),

              // ✅ Trailing: Badges and icons
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Unread count badge
                  if (widget.chat.unreadCount > 0 && !isMe)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: appColor(context).primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.chat.unreadCount > 99
                            ? '99+'
                            : widget.chat.unreadCount.toString(),
                        style: appCss.dmSansMedium11.textColor(
                          appColor(context).white,
                        ),
                      ),
                    ),

                  if (widget.chat.unreadCount > 0 && !isMe)
                    const SizedBox(width: 8),

                  // Mute icon (shows when chat is muted)
                  if (isMuted && !isMe)
                    GestureDetector(
                      onTap: () {
                        log('🔔 Quick unmute tapped for: ${widget.chat.name}');
                        _handleUnmute(context);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: appColor(context).red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(
                          Icons.notifications_off_outlined,
                          size: Sizes.s18,
                          color: appColor(context).red,
                        ),
                      ),
                    ),

                  if (isMuted && !isMe) const SizedBox(width: 8),

                  // Pin icon (shows when chat is pinned)
                  if (widget.chat.pinned)
                    GestureDetector(
                      onTap: () {
                        log('📌 Quick unpin tapped for: ${widget.chat.name}');
                        widget.onPinToggle?.call();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: appColor(context).primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: SvgPicture.asset(svgAssets.pin),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),

        // Divider
        if (widget.showDivider)
          Divider(
            height: 1,
            color: appColor(context).gray.withValues(alpha: 0.1),
          ),
      ],
    );
  }

  Color hexToColor(String hexCode) {
    hexCode = hexCode.replaceAll('#', '');
    if (hexCode.length == 6) {
      hexCode = 'FF$hexCode';
    }
    return Color(int.parse(hexCode, radix: 16));
  }
}

class MuteNotificationBottomSheet extends StatefulWidget {
  final MessageModel chat;
  final Function(String duration) onMute;

  const MuteNotificationBottomSheet({
    super.key,
    required this.chat,
    required this.onMute,
  });

  @override
  State<MuteNotificationBottomSheet> createState() =>
      _MuteNotificationBottomSheetState();
}

class _MuteNotificationBottomSheetState
    extends State<MuteNotificationBottomSheet> {
  String selectedDuration = '1h';

  final List<Map<String, String>> durations = [
    {"value": "1h", "title": "1 hour", "subtitle": "Mute for 1 hour"},
    {"value": "8h", "title": "8 hours", "subtitle": "Mute for 8 hours"},
    {"value": "1w", "title": "1 week", "subtitle": "Mute for 7 days"},
    {
      "value": "forever",
      "title": "Forever",
      "subtitle": "Mute until you unmute",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: appColor(context).white,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Mute Notifications",
                        style: appCss.dmSansSemiBold18.textColor(
                          appColor(context).darkText,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "for ${widget.chat.name}",
                        style: appCss.dmSansRegular14.textColor(
                          appColor(context).black.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Duration options
              ...List.generate(durations.length, (index) {
                final duration = durations[index];
                final isSelected = selectedDuration == duration["value"];

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      selectedDuration = duration["value"]!;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? appColor(context).primary.withOpacity(0.1)
                          : appColor(context).white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? appColor(context).primary
                            : Colors.grey.shade300,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        // Radio button
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected
                                  ? appColor(context).primary
                                  : Colors.grey.shade400,
                              width: 2,
                            ),
                          ),
                          child: isSelected
                              ? Center(
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: appColor(context).primary,
                                    ),
                                  ),
                                )
                              : null,
                        ),

                        const SizedBox(width: 16),

                        // Duration info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                duration["title"]!,
                                style: appCss.dmSansMedium16.textColor(
                                  appColor(context).darkText,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                duration["subtitle"]!,
                                style: appCss.dmSansRegular12.textColor(
                                  appColor(context).black.withOpacity(0.5),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Icon
                        Icon(
                          duration["value"] == "forever"
                              ? Icons.all_inclusive
                              : Icons.access_time,
                          color: isSelected
                              ? appColor(context).primary
                              : Colors.grey.shade400,
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: BorderSide(
                          color: Colors.grey.shade300,
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        "Cancel",
                        style: appCss.dmSansMedium16.textColor(
                          appColor(context).darkText,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        widget.onMute(selectedDuration);
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: appColor(context).primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.volume_off, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            "Mute",
                            style: appCss.dmSansMedium16.textColor(
                              appColor(context).white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
