import 'package:equatable/equatable.dart';
import 'package:teamwise/config.dart';

import '../../../data/models/reminder_model.dart';

class CreateReminderState extends Equatable {
  final bool showCustomPicker;
  final bool showUpcomingReminder;
  final bool showCompletedReminder;
  final String? selectedChat;
  final String? selectedChannelId;
  final String? selectedReminder;
  final int? selectedIndex;
  final DateTime selectedDate;
  final int selectedHour;
  final int selectedMinute;
  final String selectedPeriod;
  final String repeatOption;
  final List<ReminderData>? upcomingReminders;
  final List<ReminderData>? completedReminders;
  final ReminderStatus? reminderSetStatus;

  // final TextEditingController? riminderController;

  // 🔹 New API fields
  final bool isLoading;
  final List<dynamic>? reminders;
  final String? errorMessage;

  const CreateReminderState({
    this.showCustomPicker = false,
    this.showCompletedReminder = false,
    this.showUpcomingReminder = true,
    this.selectedChat,
    this.selectedChannelId,
    this.selectedReminder,
    // this.riminderController,
    this.selectedIndex,
    required this.selectedDate,
    this.selectedHour = 11,
    this.selectedMinute = 8,
    this.selectedPeriod = "AM",
    this.repeatOption = "Do not repeat",
    this.isLoading = false,
    this.reminders,
    this.errorMessage,  this.upcomingReminders,  this.completedReminders,this.reminderSetStatus
  });

  CreateReminderState copyWith({
    bool? showCustomPicker,
    bool? showUpcomingReminder,
    bool? showCompletedReminder,
    String? selectedChat,
    String? selectedChannelId,
    String? selectedReminder,
    int? selectedIndex,
    DateTime? selectedDate,
    int? selectedHour,
    int? selectedMinute,
    String? selectedPeriod,
    String? repeatOption,
    bool? isLoading,
    List<dynamic>? reminders,
    String? errorMessage,  ReminderStatus? reminderSetStatus,
  }) {
    return CreateReminderState(
      showCustomPicker: showCustomPicker ?? this.showCustomPicker,
      showUpcomingReminder: showUpcomingReminder ?? this.showUpcomingReminder,
      showCompletedReminder:
          showCompletedReminder ?? this.showCompletedReminder,
      selectedChat: selectedChat ?? this.selectedChat,
      selectedChannelId: selectedChannelId ?? this.selectedChannelId,
      selectedReminder: selectedReminder ?? this.selectedReminder,
      selectedIndex: selectedIndex ?? this.selectedIndex,
      selectedDate: selectedDate ?? this.selectedDate,
      selectedHour: selectedHour ?? this.selectedHour,
      selectedMinute: selectedMinute ?? this.selectedMinute,
      selectedPeriod: selectedPeriod ?? this.selectedPeriod,
      repeatOption: repeatOption ?? this.repeatOption,
      isLoading: isLoading ?? this.isLoading,
      reminders: reminders ?? this.reminders,
      errorMessage: errorMessage,
      reminderSetStatus: reminderSetStatus,
    );
  }

  @override
  List<Object?> get props => [
    showCustomPicker,
    showUpcomingReminder,
    showCompletedReminder,
    selectedChat,
    selectedReminder,
    selectedIndex,
    selectedDate,
    selectedHour,
    selectedMinute,
    selectedPeriod,
    repeatOption,
    isLoading,
    reminders,
    errorMessage,
  ];
}
