// dashboard_event.dart
abstract class DashboardEvent {}

class LoadChats extends DashboardEvent {
  final bool showLoader; // ✅ Add this flag

  LoadChats({this.showLoader = true});
}

class RefreshChats extends DashboardEvent {}

class SearchChats extends DashboardEvent {
  final String query;
  SearchChats(this.query);
}

class ToggleDashboardPasswordVisibility extends DashboardEvent {
  final String fieldKey; // or int index

  ToggleDashboardPasswordVisibility(this.fieldKey);
}

class SelectChat extends DashboardEvent {
  final int chatId;
  final String chatType;

  SelectChat(this.chatId, this.chatType);
}

class ClearSearch extends DashboardEvent {}

class ResetSelection extends DashboardEvent {}

class TogglePinChat extends DashboardEvent {
  final int chatId;
  TogglePinChat(this.chatId);
}

class ToggleMuteChat extends DashboardEvent {
  final int chatId;
  final String duration; // "1h", "1d", "1w", "forever"
  final bool mute; // true = mute, false = unmute

  ToggleMuteChat({
    required this.chatId,
    required this.duration,
    required this.mute,
  });
}

class MarkReadChat extends DashboardEvent {
  final int chatId;
  final String chatType;
  MarkReadChat(this.chatId, this.chatType);
}

class UpdateUnreadCount extends DashboardEvent {
  final int chatId;
  final bool reset;
  final bool increment;
  final int count;

  UpdateUnreadCount(
    this.chatId, {
    this.reset = false,
    this.increment = false,
    this.count = 0,
  });
}

class UpdateLastMessage extends DashboardEvent {
  final int chatId;
  final String message;
  final String messageType;
  final DateTime timestamp;

  UpdateLastMessage({
    required this.chatId,
    required this.message,
    required this.messageType,
    required this.timestamp,
  });
}

class IncrementUnreadCount extends DashboardEvent {
  final int chatId;
  IncrementUnreadCount(this.chatId);
}

class ExternalPinUpdateReceived extends DashboardEvent {
  final Map<String, dynamic> payload;
  ExternalPinUpdateReceived(this.payload);
}

class ExternalMuteUpdateReceived extends DashboardEvent {
  final int targetId;
  final bool muted;
  final String? mutedUntil;
  ExternalMuteUpdateReceived(this.targetId, this.muted, this.mutedUntil);
}

class NewChannelReceivedEvent extends DashboardEvent {
  final Map<String, dynamic> payload;
  NewChannelReceivedEvent(this.payload);
}

class FetchConversation extends DashboardEvent {}

class ChangePassword extends DashboardEvent {
  final String currentPassword;
  final String newPassword;
  final String confirmPassword;

  ChangePassword({
    required this.currentPassword,
    required this.newPassword,
    required this.confirmPassword,
  });
}
