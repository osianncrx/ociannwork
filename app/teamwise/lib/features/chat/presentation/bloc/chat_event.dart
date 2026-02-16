// chat_event.dart
part of 'chat_bloc.dart';

abstract class ChatEvent extends Equatable {
  const ChatEvent();

  @override
  List<Object?> get props => [];
}

class InitializeChat extends ChatEvent {}

class FetchCurrentSubscription extends ChatEvent {}

class LoadMessages extends ChatEvent {}

class LoadMoreMessages extends ChatEvent {}

class MarkMessagesAsReadLocally extends ChatEvent {
  final List<String> messageIds;

  const MarkMessagesAsReadLocally(this.messageIds);
}

class SendMessage extends ChatEvent {
  final String message;
  final String? messageType;
  final String? fileUrl;
  final String? fileType;
  final Map<String, dynamic>? metadata;
  final String? parentId;
  final File? mediaFile;

  // 🔹 NEW FIELDS
  final String? channelId;
  final String? recipientId;
  final List<int>? mentions;

  const SendMessage({
    required this.message,
    this.messageType = 'text',
    this.fileUrl,
    this.fileType,
    this.metadata,
    this.parentId,
    this.mediaFile,
    this.channelId, // optional
    this.recipientId, // optional
    this.mentions, // optional
  });

  @override
  List<Object?> get props => [
    message,
    messageType,
    fileUrl,
    fileType,
    metadata,
    parentId,
    mediaFile,
    channelId,
    recipientId,
  ];
}

class EditMessage extends ChatEvent {
  final int? messageId;
  final String? content;

  const EditMessage({
    this.content,
    this.messageId, // optional
  });

  @override
  List<Object?> get props => [content, messageId];
}

class SendMediaMessage extends ChatEvent {
  final File file;
  final String messageType; // 'image' or 'video'
  final String? parentId;

  const SendMediaMessage({
    required this.file,
    required this.messageType,
    this.parentId,
  });
}

class RefreshMessages extends ChatEvent {}

class LoadConversations extends ChatEvent {}

class DeleteMessage extends ChatEvent {
  final String messageId;

  const DeleteMessage({required this.messageId});

  @override
  List<Object?> get props => [messageId];
}

class DeleteMultipleMessages extends ChatEvent {
  final List<String> messageIds;

  const DeleteMultipleMessages({required this.messageIds});

  @override
  List<Object?> get props => [messageIds];
}

// Socket Events
class SocketMessageReceived extends ChatEvent {
  final ChatMessageModel message;

  const SocketMessageReceived(this.message);

  @override
  List<ChatMessageModel?> get props => [message];
}

class SocketMessageStatusUpdated extends ChatEvent {
  final Map<String, dynamic> data;

  const SocketMessageStatusUpdated(this.data);

  @override
  List<Object?> get props => [data];
}

class SocketMessageDeleted extends ChatEvent {
  final Map<String, dynamic> data;

  const SocketMessageDeleted(this.data);

  @override
  List<Object?> get props => [data];
}

class SocketMessageUpdated extends ChatEvent {
  final Map<String, dynamic> data;

  const SocketMessageUpdated(this.data);

  @override
  List<Object?> get props => [data];
}

class SocketMessageReactionUpdated extends ChatEvent {
  final Map<String, dynamic> data;

  const SocketMessageReactionUpdated(this.data);

  @override
  List<Object?> get props => [data];
}

class MessageReactionUpdated extends ChatEvent {
  final Map<String, dynamic> data;
  const MessageReactionUpdated(this.data);
}

// Message Actions
class UpdateMessage extends ChatEvent {
  final String messageId;
  final String newContent;

  const UpdateMessage({required this.messageId, required this.newContent});

  @override
  List<Object?> get props => [messageId, newContent];
}

class AddReaction extends ChatEvent {
  final String messageId;
  final String emoji;

  const AddReaction({required this.messageId, required this.emoji});

  @override
  List<Object?> get props => [messageId, emoji];
}

class RemoveReaction extends ChatEvent {
  final String messageId;
  final String emoji;

  const RemoveReaction({required this.messageId, required this.emoji});

  @override
  List<Object?> get props => [messageId, emoji];
}

// Add these to your existing ChatEvent classes
class MessagePinUpdated extends ChatEvent {
  final String messageId;
  final bool isPinned;

  const MessagePinUpdated({required this.messageId, required this.isPinned});

  @override
  List<Object> get props => [messageId, isPinned];
}

class MessageFavoriteUpdated extends ChatEvent {
  final String messageId;
  final bool isFavorite;

  const MessageFavoriteUpdated({
    required this.messageId,
    required this.isFavorite,
  });

  @override
  List<Object> get props => [messageId, isFavorite];
}

class AddReactionLocally extends ChatEvent {
  final String messageId;
  final String emoji;
  final String userId;

  const AddReactionLocally({
    required this.messageId,
    required this.emoji,
    required this.userId,
  });
}

class RemoveReactionLocally extends ChatEvent {
  final String messageId;
  final String emoji;
  final String userId;

  const RemoveReactionLocally({
    required this.messageId,
    required this.emoji,
    required this.userId,
  });
}
