// chat_state.dart

import 'package:equatable/equatable.dart';

import '../../data/models/chat_message_model.dart';

abstract class ChatState extends Equatable {
  const ChatState();

  @override
  List<Object?> get props => [];
}

class ChatInitial extends ChatState {}

class ChatLoading extends ChatState {}

class MessagesLoaded extends ChatState {
  final List<ChatMessageModel> messages;
  final bool isLoadingMore;

  const MessagesLoaded({
    required this.messages,
    this.isLoadingMore = false,
  });

  @override
  List<Object?> get props => [messages, isLoadingMore];
}
class NewMessageReceived extends ChatState {
  final List<ChatMessageModel> messages;

  const NewMessageReceived({required this.messages});

  @override
  List<Object?> get props => [messages];
}

class MessageSending extends ChatState {
  final List<ChatMessageModel> messages;

  const MessageSending({required this.messages});

  @override
  List<Object?> get props => [messages];
}

class MessageSent extends ChatState {
  final List<ChatMessageModel> messages;

  const MessageSent({required this.messages});

  @override
  List<Object?> get props => [messages];
}

class ConversationsLoaded extends ChatState {
  final List<dynamic> conversations;

  const ConversationsLoaded({required this.conversations});

  @override
  List<Object?> get props => [conversations];
}

class ChatError extends ChatState {
  final String error;

  const ChatError({required this.error});

  @override
  List<Object?> get props => [error];
}

class MessageDeleted extends ChatState {
  final List<Map<String, dynamic>> messages;
  final String deletedMessageId;

  const MessageDeleted({required this.messages, required this.deletedMessageId});

  @override
  List<Object?> get props => [messages, deletedMessageId];
}

class MessageUpdated extends ChatState {
  final List<Map<String, dynamic>> messages;
  final String updatedMessageId;

  const MessageUpdated({required this.messages, required this.updatedMessageId});

  @override
  List<Object?> get props => [messages, updatedMessageId];
}

class MessageStatusUpdated extends ChatState {
  final List<Map<String, dynamic>> messages;
  final String messageId;
  final String status;

  const MessageStatusUpdated({
    required this.messages,
    required this.messageId,
    required this.status,
  });

  @override
  List<Object?> get props => [messages, messageId, status];
}