import 'dart:developer';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_gallery_saver_plus/image_gallery_saver_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import 'package:teamwise/features/chat/presentation/widgets/video_playerScreen.dart';
import 'package:teamwise/features/chat/presentation/widgets/voice_recording.dart';
import 'package:video_thumbnail/video_thumbnail.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../../core/network/app_constants.dart';
import '../../data/datasources/chat_Api.dart';
import '../../data/models/channel_info_model.dart';
import '../../data/models/chat_message_model.dart';
import '../../socket_service.dart';
import '../bloc/chat_bloc.dart';
import '../bloc/chat_state.dart';
import 'MentionOverlayHelper.dart';

class ChatsLayout {
  Widget buildDocumentMessage(context, ChatMessageModel message, bool isMe) {
    final fileUrl = message.fileUrl?.startsWith('http') == true
        ? message.fileUrl!
        : '${AppConstants.appUrl}${message.fileUrl}';
    String? originalFileName;
    try {
      if (message.metadata != null && message.metadata!.isNotEmpty) {
        final metadata = message.metadata;
        originalFileName = metadata!['original_filename'];
      }
    } catch (e) {
      log("Metadata parse error: $e");
    }
    final fileName =
        originalFileName ?? message.fileUrl.toString().split('/').last;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: isMe
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Container(
          width: 250,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isMe
                ? appColor(context).primary.withOpacity(0.1)
                : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isMe
                  ? Colors.white.withValues(alpha: 0.3)
                  : appColor(context).primary.withValues(alpha: 0.3),
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isMe
                          ? Colors.white.withValues(alpha: 0.1)
                          : appColor(context).primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SvgPicture.asset(
                      svgAssets.document,
                      colorFilter: ColorFilter.mode(
                        isMe ? Colors.white : appColor(context).primary,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                  HSpace(Sizes.s20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          fileName,
                          style: appCss.dmSansRegular14.textColor(
                            isMe ? Colors.white : appColor(context).primary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  HSpace(Sizes.s10),
                  Icon(
                    Icons.file_download_outlined,
                    size: 30,
                    color: isMe ? Colors.white : appColor(context).primary,
                  ),
                ],
              ).inkWell(
                onTap: () => downloadDocument(context, fileUrl, fileName),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> downloadDocument(
    BuildContext context,
    String fileUrl,
    String fileName,
  ) async {
    try {
      log('📥 Starting document download from: $fileUrl');
      AppToast.showMessage('Downloading document');
      // Show loading SnackBar

      // ✅ Request permission
      if (Platform.isAndroid) {
        if (await Permission.manageExternalStorage.isDenied) {
          await Permission.manageExternalStorage.request();
        }
        if (await Permission.storage.isDenied) {
          await Permission.storage.request();
        }
      }

      // Check permission
      if (await Permission.storage.isGranted == false &&
          await Permission.manageExternalStorage.isGranted == false) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        AppToast.showError('Storage permission required');

        return;
      }

      // ✅ Get download path
      Directory? directory;
      if (Platform.isAndroid) {
        directory = Directory('/storage/emulated/0/Download');
        if (!await directory.exists()) {
          directory = await getExternalStorageDirectory();
        }
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      final filePath = '${directory!.path}/$fileName';
      log('📂 Saving file to: $filePath');

      // ✅ Download file
      final dio = Dio();
      await dio.download(
        fileUrl,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            log('📊 Progress: ${(received / total * 100).toStringAsFixed(0)}%');
          }
        },
      );

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      AppToast.showMessage('Downloaded to: ${directory.path}');
      /*ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Expanded(child: Text('Downloaded to: ${directory.path}')),
            ],
          ),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Open',
            textColor: Colors.white,
            onPressed: () => OpenFilex.open(filePath),
          ),
        ),
      );*/

      log('✅ Document downloaded successfully: $filePath');
    } catch (e, s) {
      log('❌ Download failed: $e\n$s');
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      AppToast.showError("Failed to download document");
    }
  }

  Widget buildImageMessage(context, ChatMessageModel message, bool isMe) {
    final imageUrl = message.fileUrl?.startsWith('http') == true
        ? message.fileUrl!
        : '${AppConstants.appUrl}${message.fileUrl}';

    return Container(
      margin: EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: isMe
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: imageUrl,
                  width: 250,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    width: 250,
                    height: 250,
                    color: Colors.grey[300],
                    child: Center(
                      child: CircularProgressIndicator(
                        color: appColor(context).primary,
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) {
                    log('❌ Image load error: $error');
                    return Container(
                      width: 250,
                      height: 250,
                      color: Colors.grey[300],
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [CircularProgressIndicator().center()],
                      ),
                    );
                  },
                ),
              ),

              // Download button overlay
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => _downloadImage(context, imageUrl, message),
                  child: Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.download, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String formatTimestampSafe(String? timestamp) {
    if (timestamp == null || timestamp.isEmpty) return 'Now';
    try {
      final dateTime = DateTime.parse(timestamp).toLocal();
      return DateFormat(
        'hh:mm a',
      ).format(dateTime); // ✅ 12-hour format with AM/PM
    } catch (e) {
      return 'Now';
    }
  }

  // Updated _buildVideoMessage with download button
  Widget buildVideoMessage(context, ChatMessageModel message, bool isMe) {
    final videoUrl = message.fileUrl?.startsWith('http') == true
        ? message.fileUrl!
        : '${AppConstants.appUrl}${message.fileUrl}';

    return FutureBuilder<Uint8List?>(
      future: VideoThumbnail.thumbnailData(
        video: videoUrl,
        imageFormat: ImageFormat.PNG,
        maxWidth: 250,
        quality: 75,
      ),
      builder: (context, snapshot) {
        final thumb = snapshot.data;

        return Column(
          crossAxisAlignment: isMe
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VideoPlayerScreen(videoUrl: videoUrl),
                  ),
                );
              },
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 250,
                          height: 250,
                          color: Colors.black,
                          child: thumb != null
                              ? Image.memory(
                                  thumb,
                                  width: 250,
                                  height: 250,
                                  fit: BoxFit.cover,
                                )
                              : const Center(
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                        Icon(
                          Icons.play_circle_fill,
                          size: 64,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ],
                    ),
                  ),

                  // Download button overlay
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () => _downloadVideo(context, videoUrl, message),
                      child: Container(
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.download,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _downloadImage(
    context,
    String imageUrl,
    ChatMessageModel message,
  ) async {
    try {
      // Build complete URL if needed
      final String completeUrl = imageUrl.startsWith('http')
          ? imageUrl
          : '${AppConstants.appUrl}${imageUrl}';

      log('📥 Starting image download from: $completeUrl');
      // Show loading indicator

      AppToast.showMessage('Downloading image...');

      // Request multiple permissions
      Map<Permission, PermissionStatus> statuses = await [
        Permission.storage,
        Permission.photos,
      ].request();

      // Check if any permission is granted
      bool hasPermission =
          statuses[Permission.storage]?.isGranted == true ||
          statuses[Permission.photos]?.isGranted == true;

      if (!hasPermission) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();

        // Check if permanently denied
        bool isPermanentlyDenied =
            statuses[Permission.storage]?.isPermanentlyDenied == true ||
            statuses[Permission.photos]?.isPermanentlyDenied == true;
        AppToast.showError(
          isPermanentlyDenied
              ? 'Please enable storage permission from Settings'
              : 'Storage permission denied',
        );

        return;
      }

      // Get temporary directory
      final tempDir = await getTemporaryDirectory();
      final fileName = 'teamwise_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final filePath = '${tempDir.path}/$fileName';

      log('📁 Saving to temp path: $filePath');

      // Download image with proper URL
      final dio = Dio();
      await dio.download(
        completeUrl, // Use complete URL here
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = (received / total * 100).toStringAsFixed(0);
            log('📊 Download progress: $progress%');
          }
        },
      );

      log('✅ Download completed, saving to gallery...');

      // Save to gallery using image_gallery_saver
      final result = await ImageGallerySaverPlus.saveFile(
        filePath,
        isReturnPathOfIOS: true,
      );

      log('💾 Gallery save result: $result');

      // Hide loading and show success
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (result != null && result['isSuccess'] == true) {
        AppToast.showMessage('Image saved to gallery');

        log('✅ Image saved successfully to gallery');
      } else {
        throw Exception('Failed to save image to gallery');
      }
    } catch (e) {
      log('❌ Error downloading image: $e');
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      AppToast.showMessage('Failed to download image: ${e.toString()}');
    }
  }

  // Method to download and save video
  Future<void> _downloadVideo(
    context,
    String videoUrl,
    ChatMessageModel message,
  ) async {
    try {
      // Build complete URL if needed
      final String completeUrl = videoUrl.startsWith('http')
          ? videoUrl
          : '${AppConstants.appUrl}${videoUrl}';

      log('📥 Starting video download from: $completeUrl');
      AppToast.showMessage('Downloading video...');
      // Show loading indicator

      // Request multiple permissions
      Map<Permission, PermissionStatus> statuses = await [
        Permission.storage,
        Permission.videos,
        Permission.photos,
      ].request();

      // Check if any permission is granted
      bool hasPermission =
          statuses[Permission.storage]?.isGranted == true ||
          statuses[Permission.videos]?.isGranted == true ||
          statuses[Permission.photos]?.isGranted == true;

      if (!hasPermission) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();

        // Check if permanently denied
        bool isPermanentlyDenied =
            statuses[Permission.storage]?.isPermanentlyDenied == true ||
            statuses[Permission.videos]?.isPermanentlyDenied == true ||
            statuses[Permission.photos]?.isPermanentlyDenied == true;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isPermanentlyDenied
                  ? 'Please enable storage permission from Settings'
                  : 'Storage permission denied',
            ),
            backgroundColor: Colors.red,
            action: isPermanentlyDenied
                ? SnackBarAction(
                    label: 'Settings',
                    textColor: Colors.white,
                    onPressed: () => openAppSettings(),
                  )
                : null,
            duration: Duration(seconds: 4),
          ),
        );
        return;
      }

      // Get temporary directory
      final tempDir = await getTemporaryDirectory();
      final fileName = 'teamwise_${DateTime.now().millisecondsSinceEpoch}.mp4';
      final filePath = '${tempDir.path}/$fileName';

      log('📁 Saving to temp path: $filePath');

      // Download video with progress and proper URL
      final dio = Dio();
      await dio.download(
        completeUrl, // Use complete URL here
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = (received / total * 100).toStringAsFixed(0);
            log('📊 Download progress: $progress%');
          }
        },
      );

      log('✅ Download completed, saving to gallery...');

      // Save to gallery using image_gallery_saver
      final result = await ImageGallerySaverPlus.saveFile(
        filePath,
        isReturnPathOfIOS: true,
      );

      log('💾 Gallery save result: $result');

      // Hide loading and show success
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (result != null && result['isSuccess'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Video saved to gallery'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
        log('✅ Video saved successfully to gallery');
      } else {
        throw Exception('Failed to save video to gallery');
      }
    } catch (e) {
      log('❌ Error downloading video: $e');
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to download video: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  List<ChannelMember> _channelMembers = [];

  Future<void> fetchChannelMembers(String channelId) async {
    try {
      final channelInfo = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).channelInfo(channelId: channelId);

      _channelMembers = (channelInfo.channel.members as List).map((m) {
        if (m is Map<String, dynamic>) {
          // API JSON
          return ChannelMember.fromJson(m);
        } else if (m is ChannelMember) {
          // Already parsed object
          return m;
        } else {
          // fallback empty member
          return ChannelMember(
            channelId: 0,
            userId: 0,
            role: '',
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            user: User(
              id: 0,
              name: '',
              email: '',
              avatar: null,
              profileColor: '#FFFFFF',
            ),
          );
        }
      }).toList();

      log('✅ Loaded ${_channelMembers.length} channel members for mentions');
    } catch (e, s) {
      log('❌ Error fetching channel members: $e//$s');
      _channelMembers = [];
    }
  }

  void _sendTextMessage(
    BuildContext context,
    TextEditingController messageController,
    bool isReplying,
    dynamic replyToMessage,
    VoidCallback cancelReply,
    ScrollController scrollController,
    String? channelId,
    String recipientId,
    mentionedUserIds,
    mentionHelper,
  ) {
    final message = messageController.text.trim();
    if (message.isEmpty) return;

    String? parentId;
    log('isReplying::$isReplying///$replyToMessage');
    if (isReplying && replyToMessage != null) {
      final replyId = replyToMessage.id;
      if (replyId != 0) parentId = replyId.toString();
    }

    log('parentId::$parentId');
    final chatBloc = context.read<ChatBloc>();
    log("mentionHelper.mentionedUserIds::${mentionedUserIds}");

    var mentions = mentionHelper.mentionedUserIds.isNotEmpty
        ? List<int>.from(mentionHelper.mentionedUserIds)
        : null;

    log('📤 Sending message with mentions: $mentions');

    chatBloc.add(
      SendMessage(
        message: message,
        parentId: parentId,
        channelId: channelId,
        recipientId: recipientId,
        mentions: mentions,
      ),
    );

    messageController.clear();
    mentionHelper.clearMentionedUsers();
    log("mentions::${mentions}");

    if (isReplying) cancelReply();
    _scrollToBottom(scrollController);
  }

  void _updateTextMessage(BuildContext context, int? msgId, String? content) {
    final chatBloc = context.read<ChatBloc>();
    // Get mentions from helper

    // log('📤 Sending message with mentions: $mentions');

    chatBloc.add(EditMessage(messageId: msgId, content: content.toString()));
    content = null;
    /*  messageController.clear();
      mentionHelper.clearMentionedUsers(); // ✅ clear properly
      log("mentions::${mentions}");
      if (isReplying) cancelReply();
      _scrollToBottom(scrollController); */
  }

  void _scrollToBottom(scrollController) {
    if (scrollController.hasClients) {
      scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> toggleFavoriteMessage(
    String messageId,
    bool isCurrentlyFav,
  ) async {
    bool success;
    log("isCurrentlyFav::$isCurrentlyFav");
    if (isCurrentlyFav) {
      success = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).removeFavoriteMessage(messageId);
      if (success) {
        log("Message $messageId unfavorited");
      }
    } else {
      success = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).addFavoriteMessage(messageId);
      if (success) {
        // update UI -> mark as favorite
        log("Message $messageId favorited");
      }
    }
  }

  String getParentMessageContent(ChatMessageModel parentMessage) {
    // Try different content fields based on your model structure
    String content = '';

    if (parentMessage.plainTextContent.isNotEmpty) {
      content = parentMessage.plainTextContent;
    } else if (parentMessage.content.isNotEmpty) {
      content = parentMessage.content;
    } else {
      content = '';
    }

    return content.length > 50 ? '${content.substring(0, 50)}...' : content;
  }

  String getParentSenderName(
    ChatMessageModel parentMessage,
    String? currentUserId,
  ) {
    final parentSenderId = parentMessage.senderId.toString() ?? '';

    if (parentSenderId == currentUserId) {
      return 'You';
    }

    // Try different sender name fields
    if (parentMessage.senderName.isNotEmpty) {
      return parentMessage.senderName;
    } else if (parentMessage.sender.name.isNotEmpty == true) {
      return parentMessage.sender.name;
    } else {
      return 'Unknown User';
    }
  }

  Widget _buildReplyPreview(isReplying, replyToMessage, cancelReply, context) {
    if (!isReplying || replyToMessage == null) {
      return SizedBox.shrink();
    }

    final replyContent = getParentMessageContent(replyToMessage!);
    final currentUserId = AuthService().userId;
    final isMyReply = replyToMessage!.senderId.toString() == currentUserId;

    // Get the appropriate sender name for display
    final replySenderName = getParentSenderName(replyToMessage!, currentUserId);

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(12),
      margin: EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: appColor(context).primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border(
          left: BorderSide(color: appColor(context).primary, width: 4),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.reply, size: 16, color: appColor(context).primary),
          SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Replying to $replySenderName',
                  style: TextStyle(
                    color: appColor(context).primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  replyContent,
                  style: TextStyle(color: appColor(context).gray, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.close, color: appColor(context).gray, size: 20),
            onPressed: cancelReply,
            padding: EdgeInsets.zero,
            constraints: BoxConstraints(minWidth: 30, minHeight: 30),
          ),
        ],
      ),
    );
  }

  final ChatsLayoutVoiceExtension _voiceExtension = ChatsLayoutVoiceExtension();
  bool _isRecording = false;

  // 2. Update buildMessageInput method
  Widget buildMessageInput(
    selectedMessage,
    messageController,
    isReplying,

    cancelReply,
    scrollController,
    channelId,
    recipientId,
    List<int> mentionedUserIds,
    MentionOverlayHelper mentionHelper, {
    ChatMessageModel? replyToMessage,
  }) {
    return BlocBuilder<ChatBloc, ChatState>(
      builder: (context, state) {
        final chatBloc = context.read<ChatBloc>(); // Ca
        final isSendingText =
            state is MessageSending && messageController.text.isNotEmpty;
        log("replyToMessage::${replyToMessage?.messageType}");
        return Stack(
          children: [
            Column(
              children: [
                // 🔥 IMPROVED REPLY PREVIEW
                if (isReplying && replyToMessage != null)
                  Container(
                    margin: EdgeInsets.symmetric(
                      horizontal: Sizes.s16,
                      vertical: Sizes.s8,
                    ),
                    padding: EdgeInsets.all(Sizes.s12),
                    decoration: BoxDecoration(
                      color: appColor(context).bgColor,
                      borderRadius: BorderRadius.circular(Sizes.s12),
                      border: Border(
                        left: BorderSide(
                          color: appColor(context).primary,
                          width: 3,
                        ),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.reply,
                                    size: 16,
                                    color: appColor(context).primary,
                                  ),
                                  HSpace(Sizes.s5),
                                  Text(
                                    'Replying to ${replyToMessage.senderName}',
                                    style: appCss.dmSansBold12.textColor(
                                      appColor(context).primary,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 4),
                              if (replyToMessage.messageType == 'image' &&
                                  replyToMessage.content == '')
                                Row(
                                  children: [
                                    CachedNetworkImage(
                                      imageUrl:
                                          '${AppConstants.appUrl}${replyToMessage.fileUrl}',
                                      width: 50,
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Container(
                                        width: 50,
                                        height: 50,
                                        color: Colors.grey[300],
                                        child: Center(
                                          child: CircularProgressIndicator(
                                            color: appColor(context).primary,
                                          ),
                                        ),
                                      ),
                                      errorWidget: (context, url, error) {
                                        log('❌ Image load error: $error');
                                        return Container(
                                          width: 50,
                                          height: 50,
                                          color: Colors.grey[300],
                                          child: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                Icons.error,
                                                color: Colors.red,
                                                size: 40,
                                              ),
                                              SizedBox(height: 8),
                                              Text(
                                                'Failed to load image',
                                                style: TextStyle(
                                                  color: Colors.red,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                                    HSpace(Sizes.s8),
                                    Expanded(
                                      child: Text(
                                        replyToMessage
                                            .metadata!['original_filename'],
                                      ),
                                    ),
                                  ],
                                ),
                              if ((replyToMessage.messageType == 'call' ||
                                      replyToMessage.messageType == "audio" ||
                                      replyToMessage.messageType == 'video') &&
                                  replyToMessage.content == '')
                                Row(
                                      children: [
                                        if (replyToMessage.messageType ==
                                                "audio" &&
                                            replyToMessage.content == '')
                                          Icon(Icons.audiotrack_outlined)
                                              .padding(all: Sizes.s6)
                                              .decorated(
                                                color: appColor(context).primary
                                                    .withValues(alpha: 0.2),
                                                borderRadius:
                                                    BorderRadius.circular(
                                                      Sizes.s8,
                                                    ),
                                              ),
                                        if ((replyToMessage.messageType ==
                                                    'call' ||
                                                replyToMessage.messageType ==
                                                    'video') &&
                                            replyToMessage.content == '')
                                          SvgPicture.asset(
                                                replyToMessage.messageType ==
                                                        'video'
                                                    ? svgAssets.video
                                                    : svgAssets.call,
                                                colorFilter: ColorFilter.mode(
                                                  appColor(context).black,
                                                  BlendMode.srcIn,
                                                ),
                                              )
                                              .padding(all: Sizes.s10)
                                              .decorated(
                                                color: appColor(context).primary
                                                    .withValues(alpha: 0.2),
                                                borderRadius:
                                                    BorderRadius.circular(
                                                      Sizes.s8,
                                                    ),
                                              ),
                                        HSpace(Sizes.s10),
                                        if ((replyToMessage.messageType ==
                                                    'call' ||
                                                replyToMessage.messageType ==
                                                    'video') &&
                                            replyToMessage.content == '')
                                          Text(
                                            replyToMessage.messageType == 'call'
                                                ? "Call"
                                                : replyToMessage.messageType ==
                                                      'video'
                                                ? "Video"
                                                : "Audio",
                                            style: appCss.dmSansMedium12
                                                .textColor(
                                                  appColor(context).gray,
                                                ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                      ],
                                    )
                                    .padding(
                                      vertical: Sizes.s10,
                                      horizontal: Sizes.s10,
                                    )
                                    .decorated(
                                      borderRadius: BorderRadius.circular(
                                        Sizes.s8,
                                      ),
                                      border: BoxBorder.all(
                                        color: appColor(context).primary,
                                        width: 1,
                                      ),
                                    ),
                              if (replyToMessage.messageType == 'text')
                                Text(
                                  replyToMessage.plainTextContent ??
                                      replyToMessage.content ??
                                      'Message',
                                  style: appCss.dmSansMedium12.textColor(
                                    appColor(context).gray,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.close,
                            color: appColor(context).gray,
                            size: 20,
                          ),
                          onPressed: cancelReply,
                        ),
                      ],
                    ),
                  ),

                // Show recording UI when recording
                if (_isRecording)
                  _voiceExtension.buildRecordingUI(
                    context,
                    () async {
                      await _voiceExtension.cancelRecording((recording) {
                        _isRecording = recording;
                        (context as Element).markNeedsBuild();
                      });
                    },
                    () async {
                      final chatBloc = context.read<ChatBloc>();
                      await _voiceExtension.handleMicrophoneTap(
                        context,
                        chatBloc,
                        isReplying,
                        replyToMessage,
                        scrollController,
                        cancelReply,
                        (recording) {
                          _isRecording = recording;
                          (context as Element).markNeedsBuild();
                        },
                      );
                    },
                  ),

                // Normal message input (hide when recording)
                if (!_isRecording)
                  Row(
                        children: [
                          Expanded(
                            child: FocusScope(
                              child: Focus(
                                onFocusChange: (hasFocus) {
                                  if (!hasFocus) mentionHelper.hideOverlay();
                                },
                                child: TextFieldCommon(
                                  hintText: isReplying && replyToMessage != null
                                      ? 'Reply to ${replyToMessage.senderName}...'
                                      : appFonts.typeHere,
                                  isEnable: true,
                                  controller: messageController,
                                  radius: Sizes.s30,
                                  keyboardType: TextInputType.multiline,
                                  onChanged: (text) {
                                    (context as Element).markNeedsBuild();
                                    mentionHelper.handleMentionTrigger(
                                      context,
                                      text,
                                      messageController,
                                      _channelMembers,
                                      (ChannelMember selected) {
                                        final mentionText =
                                            '@${selected.user.name} ';
                                        mentionHelper.insertMention(
                                          messageController,
                                          mentionText,
                                          selected.user.id.toString(),
                                        );
                                      },
                                    );
                                  },
                                  onFieldSubmitted: (_) => _sendTextMessage(
                                    context,
                                    messageController,
                                    isReplying,
                                    replyToMessage,
                                    cancelReply,
                                    scrollController,
                                    channelId,
                                    recipientId,
                                    mentionedUserIds,
                                    mentionHelper,
                                  ),

                                  prefixIcon: svgAssets.add,
                                  prefixTap: () {
                                    log(
                                      "message-=-=-=-=-=FILE SHARING CLICKED ${chatBloc.currentSubscription?['data']['subscription']["plan"]["allows_file_sharing"]}",
                                    );
                                    (chatBloc.currentSubscription?['data']['subscription']["plan"]["allows_file_sharing"] ==
                                            false)
                                        ? _showUpgradeDialog(context)
                                        : _showMediaOptions(
                                            context,
                                            isReplying,
                                            replyToMessage,
                                            scrollController,
                                            cancelReply,
                                          );
                                  },
                                  suffixIcon: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // Camera button
                                      if (messageController.text.trim().isEmpty)
                                        GestureDetector(
                                          onTap: () async {
                                            final chatBloc = context.read<ChatBloc>();
                                            await _pickImageFromCamera(
                                              context,
                                              chatBloc,
                                              isReplying,
                                              replyToMessage,
                                              scrollController,
                                              cancelReply,
                                            );
                                          },
                                          child: Icon(
                                            Icons.camera_alt_outlined,
                                            color: appColor(context).darkText,
                                            size: Sizes.s24,
                                          ).paddingDirectional(
                                            horizontal: Sizes.s8,
                                          ),
                                        ),

                                      // Microphone button
                                      GestureDetector(
                                        onTap: () async {
                                          final chatBloc = context
                                              .read<ChatBloc>();
                                          await _voiceExtension
                                              .handleMicrophoneTap(
                                                context,
                                                chatBloc,
                                                isReplying,
                                                replyToMessage,
                                                scrollController,
                                                cancelReply,
                                                (recording) {
                                                  _isRecording = recording;
                                                  (context as Element)
                                                      .markNeedsBuild();
                                                },
                                              );
                                        },
                                        child:
                                            SvgPicture.asset(
                                              svgAssets.microphone,
                                            ).paddingDirectional(
                                              horizontal: Sizes.s12,
                                            ),
                                      ),

                                      // Send button
                                      if (messageController.text.trim().isNotEmpty || isSendingText)
                                        (isSendingText
                                            ? const Padding(
                                                padding: EdgeInsets.all(8.0),
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                ),
                                              )
                                            : SvgPicture.asset(svgAssets.send)
                                                  .paddingDirectional(
                                                    all: Sizes.s7,
                                                  )
                                                  .decorated(
                                                    color: appColor(
                                                            context,
                                                          ).primary,
                                                    shape: BoxShape.circle,
                                                  ))
                                                .inkWell(
                                                  enableRipple: false,
                                                  onTap:
                                                      messageController.text
                                                          .trim()
                                                          .isEmpty
                                                      ? null
                                                      : () {
                                                          log(
                                                            "selectedMessage: ${selectedMessage?.id}",
                                                          );
                                                          if (selectedMessage ==
                                                              null) {
                                                            _sendTextMessage(
                                                              context,
                                                              messageController,
                                                              isReplying,
                                                              replyToMessage,
                                                              cancelReply,
                                                              scrollController,
                                                              channelId,
                                                              recipientId,
                                                              mentionedUserIds,
                                                              mentionHelper,
                                                            );
                                                          } else {
                                                            _updateTextMessage(
                                                              context,
                                                              selectedMessage
                                                                  .id,
                                                              messageController
                                                                  .text,
                                                            );
                                                          }
                                                          messageController
                                                              .clear();
                                                        },
                                                ),
                                    ],
                                  ).paddingDirectional(horizontal: Sizes.s9),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                      .decorated(
                        boxShadow: [
                          BoxShadow(
                            color: const Color(
                              0xFF00000033,
                            ).withValues(alpha: 0.1),
                            blurRadius: 5,
                            spreadRadius: .20,
                          ),
                        ],
                      )
                      .paddingDirectional(
                        horizontal: Sizes.s10,
                        bottom: Sizes.s20,
                      ),
              ],
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickDocument(
    ChatBloc chatBloc,
    // ✅ Changed from context to chatBloc
    isReplying,
    replyToMessage,
    scrollController,
    _cancelReply,
  ) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'txt',
          'zip',
        ],
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        final file = File(result.files.single.path!);
        final fileSize = await file.length();

        // Check file size (max 50MB)
        if (fileSize > 50 * 1024 * 1024) {
          log('❌ File too large. Max 50MB');
          return;
        }

        log('📄 Document selected: ${result.files.single.name}');
        _sendMediaFile(
          chatBloc,
          // ✅ Use chatBloc directly
          file,
          'document',
          isReplying,
          replyToMessage,
          scrollController,
          _cancelReply,
        );
      }
    } catch (e, s) {
      log('❌ Error picking document: $e///$s');
    }
  }

  void _showUpgradeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                color: Colors.red,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Feature Not Available',
              style: appCss.dmSansSemiBold18.textColor(
                appColor(context).darkText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'File sharing is not available in your current plan. Please upgrade to enable this feature.',
              style: appCss.dmSansRegular14.textColor(appColor(context).gray),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(
                    0xFFFFB800,
                  ), // Matching the yellow from image
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Got it',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Update _showMediaOptions method to include document option
  void _showMediaOptions(
    BuildContext context,
    bool isReplying,
    replyToMessage,
    ScrollController scrollController,
    VoidCallback _cancelReply,
  ) {
    final chatBloc = context.read<ChatBloc>(); // Capture it here

    /* // ✅ SHARI CHECK: Check if subscription allow file sharing
    final subscription = chatBloc.currentSubscription;
    final bool allowsFileSharing =
        subscription?['plan']?['allows_file_sharing'] == true;

    if (!allowsFileSharing) {
      _showUpgradeDialog(context);
      return;
    } */

    showModalBottomSheet(
      context: context,
      backgroundColor: appColor(context).white,
      builder: (context) => Container(
        padding: EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: Sizes.s60,
                height: Sizes.s5,
                margin: EdgeInsets.only(bottom: Sizes.s10),
                decoration: BoxDecoration(
                  color: appColor(context).gray.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            ListTile(
              leading: Icon(
                Icons.photo_library_outlined,
                color: appColor(context).darkText,
              ),
              title: Text(
                'Photo',
                style: appCss.dmSansMedium16.textColor(
                  appColor(context).darkText,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _pickImage(
                  context,
                  chatBloc,
                  isReplying,
                  replyToMessage,
                  scrollController,
                  _cancelReply,
                );
              },
            ),
            ListTile(
              leading: Icon(
                Icons.video_library_outlined,
                color: appColor(context).darkText,
              ),
              title: Text(
                'Video',
                style: appCss.dmSansMedium16.textColor(
                  appColor(context).darkText,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _pickVideo(
                  context,
                  chatBloc,
                  isReplying,
                  replyToMessage,
                  scrollController,
                  _cancelReply,
                );
              },
            ),
            ListTile(
              leading: Icon(
                Icons.insert_drive_file_outlined,
                color: appColor(context).darkText,
              ),
              title: Text(
                'Document',
                style: appCss.dmSansMedium16.textColor(
                  appColor(context).darkText,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                // ✅ FIX: Pass context instead of chatBloc as first parameter
                _pickDocument(
                  chatBloc,
                  isReplying,
                  replyToMessage,
                  scrollController,
                  _cancelReply,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImageFromCamera(
    context,
    ChatBloc chatBloc,
    isReplying,
    replyToMessage,
    scrollController,
    _cancelReply,
  ) async {
    try {
      // Check camera permission
      var status = await Permission.camera.status;
      if (status.isDenied) {
        status = await Permission.camera.request();
      }

      if (status.isPermanentlyDenied) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Camera Permission Required'),
            content: const Text(
              'Camera access is required to take photos. Please enable it in settings.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  openAppSettings();
                },
                child: const Text('Settings'),
              ),
            ],
          ),
        );
        return;
      }

      if (status.isGranted) {
        final XFile? image = await _picker.pickImage(
          source: ImageSource.camera,
          maxWidth: 1920,
          maxHeight: 1080,
          imageQuality: 85,
        );

        if (image != null) {
          _sendMediaFile(
            chatBloc,
            File(image.path),
            'image',
            isReplying,
            replyToMessage,
            scrollController,
            _cancelReply,
          );
        }
      }
    } catch (e, s) {
      log('Error picking image from camera: $e///$s');
      _showErrorSnackbar(context, 'Failed to capture image');
    }
  }

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(
    context,
    ChatBloc chatBloc,
    isReplying,
    replyToMessage,
    scrollController,
    _cancelReply,
  ) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null) {
        _sendMediaFile(
          chatBloc,
          File(image.path),
          'image',
          isReplying,
          replyToMessage,
          scrollController,
          _cancelReply,
        );
      }
    } catch (e, s) {
      log('Error picking image: $e///$s');
      _showErrorSnackbar(context, 'Failed to pick image');
    }
  }

  Future<void> _pickVideo(
    context,
    ChatBloc chatBloc,
    isReplying,
    replyToMessage,
    scrollController,
    _cancelReply,
  ) async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5),
      );

      if (video != null) {
        // Check file size (e.g., max 100MB)
        final file = File(video.path);
        final fileSize = await file.length();

        if (fileSize > 100 * 1024 * 1024) {
          _showErrorSnackbar(context, 'Video too large. Max 100MB');
          return;
        }

        _sendMediaFile(
          chatBloc,
          file,
          'video',
          isReplying,
          replyToMessage,
          scrollController,
          _cancelReply,
        );
      }
    } catch (e) {
      log('Error picking video: $e');
      _showErrorSnackbar(context, 'Failed to pick video');
    }
  }

  void _sendMediaFile(
    ChatBloc chatBloc,
    File file,
    String type,
    isReplying,
    replyToMessage,
    scrollController,
    cancelReply,
  ) {
    String? parentId;
    if (isReplying && replyToMessage != null) {
      final replyId = replyToMessage!.id;
      if (replyId != 0) {
        parentId = replyId.toString();
      }
    }

    chatBloc.add(
      SendMessage(
        message: '', // media માટે empty message
        parentId: parentId,
        mediaFile: file, // આ parameter પહેલેથી છે
        messageType: type,
      ),
    );

    if (isReplying) {
      cancelReply();
    }

    _scrollToBottom(scrollController);
  }

  void _showErrorSnackbar(context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }
}
