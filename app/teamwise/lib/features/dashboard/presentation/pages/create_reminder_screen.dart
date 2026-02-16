import 'dart:developer';

import 'package:teamwise/config.dart';

import '../../../auth/data/auth_services.dart' show AuthService;

class CreateReminderScreen extends StatefulWidget {
  const CreateReminderScreen({super.key});

  @override
  State<CreateReminderScreen> createState() => _CreateReminderScreenState();
}

class _CreateReminderScreenState extends State<CreateReminderScreen> {
  late CreateReminderBloc bloc;
  final reminderController = TextEditingController();
  dynamic selectedItem;

  @override
  void initState() {
    super.initState();
    bloc = CreateReminderBloc();
    _fetchData();
  }

  Future<void> _fetchData() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    final token = prefs.getString("token") ?? "";
    bloc.add(FetchConversationEvent(token));
  }

  @override
  Widget build(BuildContext context) {
    final repeatOptions = [
      "Do not repeat",
      "Every Day",
      "Every Week",
      "Every Month",
    ];

    return BlocProvider.value(
      value: bloc,
      child: BlocListener<CreateReminderBloc, CreateReminderState>(
          listener: (context, state) {
            if (state.reminderSetStatus == ReminderStatus.success) {
              route.pop(context);
              route.pop(context);
            }

            if (state.reminderSetStatus == ReminderStatus.failure) {
     AppToast.showError(state.errorMessage??'');
            }
          },
         child:  BlocBuilder<CreateReminderBloc, CreateReminderState>(
            builder: (context, state) {
              final bloc = context.read<CreateReminderBloc>();
              log("state.selectedChat::${state.selectedChat}");
              return Scaffold(
                body: Container(
                  width: double.infinity,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        appColor(context).commonBgColor,
                        appColor(context).white,
                      ],
                    ),
                  ),
                  child: SafeArea(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              SvgPicture.asset(
                                svgAssets.arrowLeft,
                                color: appColor(context).black,
                              ).inkWell(onTap: () => route.pop(context)),
                              const SizedBox(width: 8),
                              Text(
                                "Reminders",
                                style: appCss.dmSansMedium20.textColor(
                                  appColor(context).black,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 26),
                          Text(
                            "Reminder for (Channel or Dm)",
                            style: appCss.dmSansSemiBold14.textColor(
                              appColor(context).darkText,
                            ),
                          ),
                          const SizedBox(height: 8),

                      DropdownMenu<String>(
                        expandedInsets: EdgeInsets.zero,
                        initialSelection: (state.selectedChat != null &&
                            bloc.conversationsData != null &&
                            bloc.conversationsData!.any(
                                  (e) => "${e.type}-${e.id}" == state.selectedChat,
                            ))
                            ? state.selectedChat
                            : null,

                        hintText: "Select chats to reminder",
          enabled: true,

                        textStyle: appCss.dmSansRegular14.textColor(
                          appColor(context).black, // 👉 selected text color
                        ),
                        inputDecorationTheme: InputDecorationTheme(
                          hintStyle: TextStyle(color: appColor(context).lightText), // Set your desired hint color here
                          enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: appColor(context).gray.withValues(alpha: 0.2)),borderRadius: BorderRadius.circular(30)),
outlineBorder: BorderSide(color: appColor(context).gray.withValues(alpha: 0.2)),
                          labelStyle: TextStyle(
                            color: Colors.black, // 👈 hint text color here
                            fontSize: 14,
                          ),

                          filled: true,
                          fillColor:
                          Theme.of(context).brightness == Brightness.dark
                              ? Colors.white.withOpacity(0.1)
                              : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                        // 👉 dropdown menu background color
                        menuStyle: MenuStyle(
                          backgroundColor: WidgetStatePropertyAll(
                            Theme.of(context).brightness == Brightness.dark
                                ? Colors.grey[900]
                                : Colors.white,
                          ),
                          elevation: const WidgetStatePropertyAll(3),
                          shape: WidgetStatePropertyAll(
                            RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),

                        dropdownMenuEntries: (bloc.conversationsData == null ||
                            bloc.conversationsData!.isEmpty)
                            ? []
                            : bloc.conversationsData!.map(
                              (e) {
                            return DropdownMenuEntry<String>(
                              value: "${e.type}-${e.id}",
                              labelWidget: Text(
                                e.name ?? "",
                                style: appCss.dmSansRegular14.textColor(
                                  appColor(context).black, // 👉 list text color
                                ),
                              ), label:  e.name ?? "",
                            );
                          },
                        ).toList(),

                          onSelected: (val) {
                            if (val == null) return;

                            selectedItem = bloc.conversationsData!.firstWhere(
                                  (e) => "${e.type}-${e.id}" == val,
                            );

                            bloc.add(
                              SelectChatEvent(
                                selectedItem!.type == 'channel' ? selectedItem!.id.toString() : '',
                                selectedItem!.type == 'dm' ? selectedItem!.id.toString() : '',
                              ),
                            );
                          }



                      ),
                      const SizedBox(height: 24),
                          Text(
                            "Reminder about",
                            style: appCss.dmSansSemiBold14.textColor(
                              appColor(context).darkText,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Theme.of(context).brightness == Brightness.dark
                              ? GlassTextFieldCommon(
                                  controller: reminderController,
                                  hintText: "A task, meeting or something else...",

                                  keyboardType: TextInputType.name,
                                )
                              : TextFieldCommon(
                                  controller: reminderController,
                                  hintText: "A task, meeting or something else...",
                                  keyboardType: TextInputType.name,
                                ),
                          VSpace(Sizes.s20),
                          Text(
                            "Remind in",
                            style: appCss.dmSansSemiBold14.textColor(
                              appColor(context).darkText,
                            ),
                          ),
                          VSpace(Sizes.s8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _timeButton(context, "1\nminute", 0, state),
                              Spacer(),
                              _timeButton(context, "30\nminutes", 1, state),
                              Spacer(),
                              _timeButton(context, "1\nhour", 2, state),
                            ],
                          ),
                          VSpace(Sizes.s20),
                          TextButton(
                            onPressed: () {
                              bloc.add(ToggleCustomPickerEvent());
                              HapticFeedback.selectionClick();
                            },
                            child: Text(
                              "Select custom time and repeat",
                              style: appCss.dmSansSemiBold14
                                  .textColor(appColor(context).primary)
                                  .underline,
                            ),
                          ),
                          if (state.showCustomPicker)
                            _buildCustomPicker(context, state, repeatOptions),
                        ],
                      ),
                    ),
                  ),
                ),
                bottomNavigationBar: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ButtonCommon(
                    title: "Set Reminder",
                      onTap: () async {
                        if (selectedItem == null) {
                          AppToast.showError('Please select a chat first');

                          return;
                        }

                        context.read<CreateReminderBloc>().add(
                          SetReminderEvent(
                            note: reminderController.text,
                            channelId: selectedItem!.type == 'channel' ? selectedItem!.id : null,
                            recipientId: selectedItem!.type == 'dm' ? selectedItem!.id : null,
                            remindAt: state.selectedDate.toUtc(),
                            token: AuthService().token.toString(),
                          ),
                        );
                      }

                  ),
                ),
              );
            },
          )

      ),
    );
  }

  Widget _timeButton(
    BuildContext context,
    String text,
    int index,
    CreateReminderState state,
  ) {
    bool isSelected = state.selectedIndex == index;

    return GestureDetector(
      onTap: () {
        final now = DateTime.now();
        DateTime updatedDateTime;

        // Add time based on the button index
        switch (index) {
          case 0:
            log("message-p-p-p-p-p-p-p");
            updatedDateTime = now.add(const Duration(minutes: 1));
            break;
          case 1:
            updatedDateTime = now.add(const Duration(minutes: 30));
            break;
          case 2:
            updatedDateTime = now.add(const Duration(hours: 1));
            break;
          default:
            updatedDateTime = now;
        }

        // Pass updated DateTime to BLoC
        context.read<CreateReminderBloc>().add(
          SelectQuickTimeEvent(index, updatedDateTime),
        );
      },
      child: Container(
        padding: EdgeInsets.all(Sizes.s20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: isSelected
              ? appColor(context).commonBgColor
              : isDark(context)?appColor(context).gray.withValues(alpha: 0.2):appColor(context).white,
        ),
        child: Center(
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: appCss.dmSansSemiBold14.textColor(appColor(context).black),
          ),
        ),
      ),
    );
  }

  Widget _buildCustomPicker(
    BuildContext context,
    CreateReminderState state,
    List<String> repeatOptions,
  ) {
    final bloc = context.read<CreateReminderBloc>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Divider(color: appColor(context).gray.withValues(alpha: 0.2)),
        VSpace(Sizes.s10),
        Text(
          "Select Date",
          style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
        ),
        VSpace(Sizes.s8),
        Theme(
          data: Theme.of(context).copyWith(
            textTheme: const TextTheme(),

            colorScheme: ColorScheme.light(
              primary: appColor(context).primary.withValues(alpha: 0.5),
              onPrimary: appColor(context).primary,
              onSurface: appColor(context).darkText,
            ),
          ),

          child: CalendarDatePicker(
            initialDate: state.selectedDate,
            firstDate: DateTime.now(),
            lastDate: DateTime(2100),

            onDateChanged: (selectedDate) {
              final now = DateTime.now();

              final combinedDateTime = DateTime(
                selectedDate.year,
                selectedDate.month,
                selectedDate.day,
                now.hour,
                now.minute,
                now.second,
              );

              // Pass to BLoC
              bloc.add(SelectDateEvent(combinedDateTime));

              log("Selected date with current time: $combinedDateTime");
            },
          ),
        ).decorated(
          color: appColor(context).white,
          border: Border.all(color: appColor(context).gray.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(Sizes.s10),
        ),

        SizedBox(height: Sizes.s16),
        Text(
          "Select Time",
          style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
        ),
        VSpace(Sizes.s8),
        _timePicker(context, state),

        SizedBox(height: Sizes.s20),

        Text(
          "Repeat",
          style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
        ),
        VSpace(Sizes.s8),
        DropdownButtonFormField<String>(
          decoration: InputDecoration(
            fillColor: Colors.white,
            enabled: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Sizes.s10),
              borderSide: BorderSide(color: appColor(context).gray.withValues(alpha: 0.2)),
            ),
          ),
          value: state.repeatOption,
          items: repeatOptions
              .map((e) => DropdownMenuItem(value: e, child: Text(e)))
              .toList(),
          onChanged: (val) => bloc.add(SelectRepeatOptionEvent(val ?? '')),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: Sizes.s50,
          width: MediaQuery.of(context).size.width,
          child: IntrinsicHeight(
            child: Center(
              child: Text(
                language(
                  context,
                  "Tomorrow, ${state.selectedHour}:${state.selectedMinute.toString().padLeft(2, "0")} ${state.selectedPeriod}",
                ),
                overflow: TextOverflow.ellipsis,
                style: appCss.dmSansMedium14.textColor(
                  appColor(context).darkText,
                ),
              ).paddingAll(AppRadius.r10),
            ),
          ),
        ).decorated(
          color: appColor(context).fieldCardBg,
          borderRadius: BorderRadius.circular(AppRadius.r30),
          border: Border.all(color:  isDark(context)?appColor(context).gray.withValues(alpha: 0.2):appColor(context).dividerColor),
        ),
      ],
    );
  }

  Widget _timePicker(BuildContext context, CreateReminderState state) {
    final bloc = context.read<CreateReminderBloc>();

    return InkWell(
      onTap: () async {
        final TimeOfDay? picked = await showTimePicker(
          context: context,
          initialTime: TimeOfDay(
            hour: state.selectedHour == 12
                ? 0
                : state.selectedHour + (state.selectedPeriod == "PM" ? 12 : 0),
            minute: state.selectedMinute,
          ),
          initialEntryMode: TimePickerEntryMode.dial, // round dial design
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: const ColorScheme.light(
                  primary: Color(0xFF3A5BFF), // Blue accent color
                  onSurface: Colors.black, // Text color
                ),
                timePickerTheme: TimePickerThemeData(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  dialBackgroundColor: Colors.white,
                  helpTextStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
              child: child!,
            );
          },
        );

        if (picked != null) {
          // Convert 24hr -> 12hr + AM/PM
          final period = picked.period == DayPeriod.am ? "AM" : "PM";
          final hour = picked.hourOfPeriod == 0 ? 12 : picked.hourOfPeriod;

          bloc.add(SelectTimeEvent(hour, picked.minute, period));
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Theme.of(context).brightness == Brightness.dark
              ? Colors.white.withOpacity(0.1)
              : appColor(context).textFieldFillColor,
          border: Border.all(color: isDark(context)?appColor(context).gray.withValues(alpha: 0.2): Colors.grey.shade300),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "${state.selectedHour.toString().padLeft(2, '0')}:"
              "${state.selectedMinute.toString().padLeft(2, '0')} ${state.selectedPeriod}",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const Icon(Icons.access_time, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
