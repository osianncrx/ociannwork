import 'package:equatable/equatable.dart';

abstract class CreateReminderEvent extends Equatable {
  const CreateReminderEvent();
  @override
  List<Object?> get props => [];
}

class SelectChatEvent extends CreateReminderEvent {
  final String recipientId;
  final String channelId;
  const SelectChatEvent(this.channelId, this.recipientId);
  @override
  List<Object?> get props => [channelId, recipientId];
}

class SelectReminderEvent extends CreateReminderEvent {
  final String reminder;
  const SelectReminderEvent(this.reminder);
  @override
  List<Object?> get props => [reminder];
}

/* class SelectQuickTimeEvent extends CreateReminderEvent {
  final int index;
  const SelectQuickTimeEvent(this.index);
  @override
  List<Object?> get props => [index];
} */

class SelectQuickTimeEvent extends CreateReminderEvent {
  final int index;
  final DateTime selectedDateTime; // add this

  const SelectQuickTimeEvent(this.index, this.selectedDateTime);

  @override
  List<Object?> get props => [index, selectedDateTime];
}

class ToggleCustomPickerEvent extends CreateReminderEvent {}

class SelectDateEvent extends CreateReminderEvent {
  final DateTime date;
  const SelectDateEvent(this.date);
  @override
  List<Object?> get props => [date];
}

class SelectTimeEvent extends CreateReminderEvent {
  final int hour;
  final int minute;
  final String period;
  const SelectTimeEvent(this.hour, this.minute, this.period);
  @override
  List<Object?> get props => [hour, minute, period];
}

class SelectRepeatOptionEvent extends CreateReminderEvent {
  final String repeat;
  const SelectRepeatOptionEvent(this.repeat);
  @override
  List<Object?> get props => [repeat];
}

/// 🔹 NEW EVENT: Fetch Reminders from API
class FetchRemindersEvent extends CreateReminderEvent {
  final String token;
  const FetchRemindersEvent(this.token);

  @override
  List<Object?> get props => [token];
}

/// 🔹 NEW EVENT: Fetch Reminders from API
class FetchConversationEvent extends CreateReminderEvent {
  final String token;
  const FetchConversationEvent(this.token);

  @override
  List<Object?> get props => [token];
}

/// 🔹 NEW EVENT: Set Reminders from API
class SetReminderEvent extends CreateReminderEvent {
  final String note;
  final int? recipientId;
  final int? channelId;
  final DateTime remindAt;
  final String token;

  const SetReminderEvent({
    required this.note,
    this.recipientId,
    this.channelId,
    required this.remindAt,
    required this.token,
  });

  @override
  List<Object?> get props => [note, recipientId, remindAt, token];
}

/// 🔹 NEW EVENT: Set Reminders from API
class CancelReminderEvent extends CreateReminderEvent {
  final int? reminderId;

  final String token;

  const CancelReminderEvent({this.reminderId, required this.token});

  @override
  List<Object?> get props => [reminderId, token];
}

/// UpComing Reminder Event
class UpComingReminderEvent extends CreateReminderEvent {
  const UpComingReminderEvent();

  @override
  List<Object?> get props => [];
}

/// Completed Reminder Event
class CompletedReminderEvent extends CreateReminderEvent {
  const CompletedReminderEvent();

  @override
  List<Object?> get props => [];
}
