import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:teamwise/config.dart';
import 'package:teamwise/core/network/app_constants.dart';
import 'package:teamwise/features/auth/data/auth_services.dart';
import 'package:teamwise/features/dashboard/data/models/conversations_data_model.dart';
import 'package:teamwise/features/dashboard/data/models/reminder_model.dart';
import 'create_reminder_event.dart';
import 'create_reminder_state.dart';

enum ReminderStatus { initial, loading, success, failure }

class CreateReminderBloc
    extends Bloc<CreateReminderEvent, CreateReminderState> {
  // RemindersModel? reminderdata;
  List<ReminderData>? reminderdata;
  List<ConversationsData>? conversationsData;
  bool isReminderLoader = false;
  CreateReminderBloc()
    : super(CreateReminderState(selectedDate: DateTime.now())) {
    on<SelectChatEvent>((event, emit) {
      // Store the unique value in state for dropdown
      final selectedValue = event.channelId.isNotEmpty
          ? "channel-${event.channelId}"
          : event.recipientId.isNotEmpty
          ? "dm-${event.recipientId}"
          : null;
      log("selectedValue::$selectedValue");
      emit(state.copyWith(selectedChat: selectedValue));
    });
    on<SelectRepeatOptionEvent>((event, emit) {
      // Update your state here
      emit(state.copyWith());
    });

    on<UpComingReminderEvent>((event, emit) {
      emit(state.copyWith(showUpcomingReminder: !state.showUpcomingReminder));
    });
    on<CompletedReminderEvent>((event, emit) {
      emit(state.copyWith(showCompletedReminder: !state.showCompletedReminder));
    });

    on<SelectReminderEvent>((event, emit) {
      emit(state.copyWith(selectedReminder: event.reminder));
    });

    /*   on<SelectQuickTimeEvent>((event, emit) {
      log("selectedValue::1212${event.selectedDateTime}");
      /* emit(state.copyWith(selectedIndex: event.index,)); */
    }); */
    on<SelectQuickTimeEvent>((event, emit) {
      log("selectedValue::1212 -= ${event.selectedDateTime}");

      emit(
        state.copyWith(
          selectedIndex: event.index,
          selectedDate:
              event.selectedDateTime, // update state with new DateTime
        ),
      );
    });
    on<ToggleCustomPickerEvent>((event, emit) {
      emit(state.copyWith(showCustomPicker: !state.showCustomPicker));
    });

    /* on<SelectDateEvent>((event, emit) {
      log("selectedValue::1212${event.date}");
      emit(state.copyWith(selectedDate: event.date));
    });

    on<SelectTimeEvent>((event, emit) {
      log("selectedValue::1212 ${event.hour} ${event.minute} ${event.period}");
      emit(
        state.copyWith(
          selectedHour: event.hour,
          selectedMinute: event.minute,
          selectedPeriod: event.period,
        ),
      );
    }); */

    on<SelectDateEvent>((event, emit) {
      // Merge with existing time in state
      final currentTime = TimeOfDay(
        hour: state.selectedHour % 12 + (state.selectedPeriod == "PM" ? 12 : 0),
        minute: state.selectedMinute,
      );

      final mergedDateTime = DateTime(
        event.date.year,
        event.date.month,
        event.date.day,
        currentTime.hour,
        currentTime.minute,
      );

      emit(state.copyWith(selectedDate: mergedDateTime));

      // 🔹 Log full DateTime
      log("Selected DateTime (after date pick): $mergedDateTime");

      // 🔹 Log only time (24-hour)
      final timeString =
          "${mergedDateTime.hour.toString().padLeft(2, '0')}:${mergedDateTime.minute.toString().padLeft(2, '0')}:${mergedDateTime.second.toString().padLeft(2, '0')}";
      log("Selected Time (24h): $timeString");

      // 🔹 Log 12-hour format
      final hour12 = mergedDateTime.hour % 12 == 0
          ? 12
          : mergedDateTime.hour % 12;
      final period = mergedDateTime.hour >= 12 ? "PM" : "AM";
      final formattedTime =
          "$hour12:${mergedDateTime.minute.toString().padLeft(2, '0')} $period";
      log("Selected Time (12h): $formattedTime");
    });

    on<SelectTimeEvent>((event, emit) {
      // Merge with existing date in state
      final hour24 = event.period == "PM"
          ? (event.hour % 12) + 12
          : (event.hour % 12);

      final mergedDateTime = DateTime(
        state.selectedDate.year,
        state.selectedDate.month,
        state.selectedDate.day,
        hour24,
        event.minute,
      );

      emit(
        state.copyWith(
          selectedDate: mergedDateTime,
          selectedHour: event.hour,
          selectedMinute: event.minute,
          selectedPeriod: event.period,
        ),
      );

      // 🔹 Log full DateTime
      log("Selected DateTime (after time pick): $mergedDateTime");

      // 🔹 Log only time (24-hour)
      final timeString =
          "${mergedDateTime.hour.toString().padLeft(2, '0')}:${mergedDateTime.minute.toString().padLeft(2, '0')}:${mergedDateTime.second.toString().padLeft(2, '0')}";
      log("Selected Time (24h): $timeString");

      // 🔹 Log 12-hour format
      final hour12 = mergedDateTime.hour % 12 == 0
          ? 12
          : mergedDateTime.hour % 12;
      final period = mergedDateTime.hour >= 12 ? "PM" : "AM";
      final formattedTime =
          "$hour12:${mergedDateTime.minute.toString().padLeft(2, '0')} $period";
      log("Selected Time (12h): $formattedTime");
    });

    on<SetReminderEvent>((event, emit) async {
      emit(state.copyWith(isLoading: true, errorMessage: null));
      SharedPreferences preferences = await SharedPreferences.getInstance();
      var teamId = AuthService().teamId;

      var data = {
        'note': event.note,
        if (event.recipientId == null) "channel_id": event.channelId,
        if (event.recipientId != null) 'recipient_id': event.recipientId,
        'remind_at': event.remindAt.toIso8601String(),
      };

      log("message-=-=-=-=-=-=-=-= $data");
      try {
        final dio = Dio(BaseOptions(validateStatus: (_) => true));

        final response = await dio.post(
          '${AppConstants.baseUrl}/reminder/set',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${event.token.trim()}',
              'X-Team-ID': teamId,
            },
          ),
          data: {
            'note': event.note,
            if (event.recipientId == null) "channel_id": event.channelId,
            if (event.recipientId != null) 'recipient_id': event.recipientId,
            'remind_at': event.remindAt.toIso8601String(),
          },
        );

        log(
          "DATA FOR BODY  ${event.note}${event.recipientId},${event.remindAt.toIso8601String()}",
        );
        if (response.statusCode == 200 || response.statusCode == 201) {
          emit(
            state.copyWith(
              isLoading: false,
              reminderSetStatus: ReminderStatus.success, // 🔥 SUCCESS
            ),
          );
          log("RESPONSER ESAE ${response.data}");
          Fluttertoast.showToast(msg: response.data['message']);
        } else {
          log("RESPONSER ESAE ${response.data}");
          final message = response.data['message'] ?? 'Something went wrong';
          emit(
            state.copyWith(
              isLoading: false,
              reminderSetStatus: ReminderStatus.failure,
              errorMessage: message,
            ),
          );
        }
      } catch (e) {
        emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
      }
    });

    // 🔹 Cancel Reminders Event
    on<CancelReminderEvent>((event, emit) async {
      emit(state.copyWith(isLoading: true, errorMessage: null));
      SharedPreferences preferences = await SharedPreferences.getInstance();
      var teamId = AuthService().teamId;

      var data = {'reminder_id': event.reminderId};

      log("message-=-=-=-=-=-=-=-= $data");
      try {
        final dio = Dio(BaseOptions(validateStatus: (_) => true));

        final response = await dio.post(
          '${AppConstants.baseUrl}/reminder/cancel',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${event.token.trim()}',
              'X-Team-ID': teamId,
            },
          ),
          data: {'reminder_id': event.reminderId},
        );

        log("DATA FOR BODY  ${event.reminderId}");
        if (response.statusCode == 200 || response.statusCode == 201) {
          emit(
            state.copyWith(
              isLoading: false,
              /* successMessage: "Reminder set successfully", */
            ),
          );
          on<FetchRemindersEvent>(_fetchReminders);
          log("RESPONSER ESAE ${response.data}");
          Fluttertoast.showToast(msg: response.data['message']);
        } else {
          log("RESPONSER ESAE ${response.data}");
          final message = response.data['message'] ?? 'Something went wrong';
          emit(state.copyWith(isLoading: false, errorMessage: message));
        }
      } catch (e) {
        emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
      }
    });

    // 🔹 Handle FetchRemindersEvent
    on<FetchRemindersEvent>(_fetchReminders);
    on<FetchConversationEvent>(_fetchConversation);
    // on<SetReminderEvent>(_setReminderEvent);
  }

  Future<void> _fetchReminders(
    FetchRemindersEvent event,
    Emitter<CreateReminderState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));

    SharedPreferences preferences = await SharedPreferences.getInstance();
    var teamId = AuthService().teamId;
    log("message-=-=-=-=-=-=$teamId");
    try {
      isReminderLoader = true;
      final dio = Dio(
        BaseOptions(validateStatus: (_) => true),
      ); // ✅ allow 400 inspection
      log("message=-=--=-==--=-=TOKEN ${event.token}");
      final response = await dio.get(
        '${AppConstants.baseUrl}/reminder',
        options: Options(
          headers: {
            'Authorization': 'Bearer ${event.token.trim()}',
            'X-Team-ID': teamId,
          },
        ),
      );

      log(
        '🔹 Reminder API Status: ${response.statusCode} https://teamwise.pixelstrap.com/api/reminder',
      );
      log('🔹 Reminder API Response: ${response.data}');

      if (response.statusCode == 200) {
        isReminderLoader = false;
        final data = response.data['data'] ?? [];

        if (response.data['data'] is List) {
          reminderdata = (response.data['data'] as List)
              .map((item) => ReminderData.fromJson(item))
              .toList();
        }

        log("message-=-=-=-=-=DATA OF REMINDER $reminderdata");

        emit(state.copyWith(isLoading: false, reminders: data));
      } else {
        isReminderLoader = false;
        // log detailed reason for debugging
        final message = response.data is Map
            ? response.data['message'] ?? 'Bad Request'
            : response.statusMessage ?? 'Unknown error';

        emit(
          state.copyWith(
            isLoading: false,
            errorMessage: '(${response.statusCode}) $message',
          ),
        );
      }
    } catch (e, s) {
      isReminderLoader = false;
      log('❌ Reminder API Error: $e\n$s');
      emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
    }
  }

  Future<void> _fetchConversation(
    FetchConversationEvent event,
    Emitter<CreateReminderState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));

    SharedPreferences preferences = await SharedPreferences.getInstance();
    var teamId = AuthService().teamId;

    try {
      isReminderLoader = true;

      final dio = Dio(BaseOptions(validateStatus: (_) => true));
      log("message=-=--=-==--=-=TOKEN ${event.token}");

      final response = await dio.get(
        '${AppConstants.baseUrl}/message/conversations',
        options: Options(
          headers: {
            'Authorization': 'Bearer ${event.token.trim()}',
            'X-Team-ID': teamId,
          },
        ),
      );

      log('🔹 Conversation API Status: ${response.statusCode}');
      log('🔹 Conversation API Response: ${response.data}');

      if (response.statusCode == 200) {
        isReminderLoader = false;

        // ✅ Check if the data is a list
        if (response.data is List) {
          conversationsData = (response.data as List)
              .map((item) => ConversationsData.fromJson(item))
              .toList();

          log("✅ Parsed conversationsData: ${conversationsData}");
        } else if (response.data is Map &&
            response.data['data'] != null &&
            response.data['data'] is List) {
          // ✅ Handle nested structure like { data: [...] }
          conversationsData = (response.data['data'] as List)
              .map((item) => ConversationsData.fromJson(item))
              .toList();

          log("✅ Parsed nested conversationsData: ${conversationsData}");
        } else {
          log("⚠️ Unexpected data format: ${response.data.runtimeType}");
        }

        emit(state.copyWith(isLoading: false, reminders: conversationsData));
      } else {
        isReminderLoader = false;
        final message = response.data is Map
            ? response.data['message'] ?? 'Bad Request'
            : response.statusMessage ?? 'Unknown error';

        emit(
          state.copyWith(
            isLoading: false,
            errorMessage: '(${response.statusCode}) $message',
          ),
        );
      }
    } catch (e, s) {
      isReminderLoader = false;
      log('❌ Conversation API Error: $e\n$s');
      emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
    }
  }

  Future<void> _setReminderEvent(
    SetReminderEvent event,
    Emitter<CreateReminderState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));

    SharedPreferences preferences = await SharedPreferences.getInstance();
    var teamId = AuthService().teamId;

    try {
      SharedPreferences preferences = await SharedPreferences.getInstance();
      var teamId = AuthService().teamId;

      final dio = Dio(BaseOptions(validateStatus: (_) => true));

      final payload = {
        "remind_at": event.remindAt.toUtc().toIso8601String(),
        "note": event.note,
        "recipient_id": event.recipientId,
      };

      log("🔹 Reminder Payload: $payload");

      final response = await dio.post(
        '${AppConstants.baseUrl}/reminder/set',
        data: payload,
        options: Options(
          headers: {
            'Authorization': 'Bearer ${event.token.trim()}',
            'X-Team-ID': teamId,
          },
        ),
      );

      log('🔹 Set Reminder Status: ${response.statusCode}');
      log('🔹 Set Reminder Response: ${response.data}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        emit(state.copyWith(isLoading: false));
        log("✅ Reminder set successfully");
      } else {
        final message = response.data is Map
            ? response.data['message'] ?? 'Bad Request'
            : response.statusMessage ?? 'Unknown error';

        emit(
          state.copyWith(
            isLoading: false,
            errorMessage: '(${response.statusCode}) $message',
          ),
        );
      }
    } catch (e, s) {
      isReminderLoader = false;
      log('❌ Conversation API Error: $e\n$s');
      emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
    }
  }
}
