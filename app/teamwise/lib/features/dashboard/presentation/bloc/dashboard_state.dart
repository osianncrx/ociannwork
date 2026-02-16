// dashboard_state.dart
import '../../data/models/message_model.dart';

abstract class DashboardState {
  Map<String, bool> get visibilityMap => {};
}

class ChatInitial extends DashboardState {}

class ChatLoading extends DashboardState {}

class ChatLoaded extends DashboardState {
  final List<MessageModel> chats;
  final List<MessageModel> filteredChats;
  final String searchQuery;
  final int? selectedChatId;
  final String? selectedChatType;
  @override
  final Map<String, bool> visibilityMap;

  ChatLoaded({
    required this.chats,
    required this.filteredChats,
    required this.searchQuery,
    this.selectedChatId,
    this.selectedChatType,
    this.visibilityMap = const {},
  });

  ChatLoaded copyWith({
    List<MessageModel>? chats,
    List<MessageModel>? filteredChats,
    String? searchQuery,
    int? selectedChatId,
    String? selectedChatType,
    Map<String, bool>? visibilityMap,
  }) {
    return ChatLoaded(
      chats: chats ?? this.chats,
      filteredChats: filteredChats ?? this.filteredChats,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedChatId: selectedChatId ?? this.selectedChatId,
      selectedChatType: selectedChatType ?? this.selectedChatType,
      visibilityMap: visibilityMap ?? this.visibilityMap,
    );
  }
}

class ChatError extends DashboardState {
  final String message;
  ChatError(this.message);
}

class PasswordChangeLoading extends DashboardState {
  @override
  final Map<String, bool> visibilityMap;
  PasswordChangeLoading({this.visibilityMap = const {}});
}

class PasswordChangeSuccess extends DashboardState {
  final String message;
  @override
  final Map<String, bool> visibilityMap;
  PasswordChangeSuccess(this.message, {this.visibilityMap = const {}});
}

class PasswordChangeError extends DashboardState {
  final String error;
  @override
  final Map<String, bool> visibilityMap;
  PasswordChangeError(this.error, {this.visibilityMap = const {}});
}

class DashboardPasswordVisibilityToggled extends DashboardState {
  @override
  final Map<String, bool> visibilityMap;
  DashboardPasswordVisibilityToggled(this.visibilityMap);
}
