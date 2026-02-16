// ignore_for_file: use_build_context_synchronously

import 'dart:developer';

import 'package:intl/intl.dart';
import 'package:teamwise/config.dart';
import 'package:teamwise/features/dashboard/presentation/widgets/cancel_reminder_dialog.dart';

class ReminderScreen extends StatelessWidget {
  const ReminderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final bloc = context.watch<CreateReminderBloc>();

    return Scaffold(
      // backgroundColor: const Color(0xFFF4F7FE),
      body: Container(height: double.infinity, width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              appColor(context).commonBgColor,
              appColor(context).white,
              appColor(context).white,
            ],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              final prefs = await SharedPreferences.getInstance();
              final token = prefs.getString('token') ?? '';
              context.read<CreateReminderBloc>().add(
                FetchRemindersEvent(token.toString()),
              );
            },
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 🔹 Header
                  Row(
                    children: [
                      SvgPicture.asset(
                        svgAssets.arrowLeft,
                        color: appColor(context).black,
                      ).inkWell(onTap: () => route.pop(context)),
                      HSpace(Sizes.s10),
                      Text(
                        "Reminders",
                        style: appCss.dmSansMedium20.textColor(
                          appColor(context).black,
                        ),
                      ),
                    ],
                  ).padding(horizontal: Sizes.s20, top: Sizes.s10),

                  // 🔹 Main Card with overlapping icon
                  Stack(
                    children: [
                      Align(
                        alignment: Alignment.topCenter,
                        child: Container(
                          margin: const EdgeInsets.only(top: 80),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 24,
                          ),
                          width: MediaQuery.of(context).size.width * 0.85,
                          decoration: BoxDecoration(
                            color: appColor(context).white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.white.withOpacity(0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(height: 30), // icon overlap space
                              Text(
                                "You’re all caught up!",
                                style: appCss.dmSansBold19.textColor(
                                  appColor(context).black,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                "You don’t have any upcoming reminders.",
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                onPressed: () async {
                                  final SharedPreferences prefs =
                                      await SharedPreferences.getInstance();
                                  final token = prefs.getString('token');
                                  context.read<CreateReminderBloc>().add(
                                    FetchRemindersEvent(token.toString()),
                                  );
                                  context.read<CreateReminderBloc>().add(
                                    FetchConversationEvent(token.toString()),
                                  );
                                  route.pushNamed(
                                    context,
                                    routeName.createReminderScreen,
                                  );
                                },
                                icon: Icon(Icons.add, color: Colors.white),
                                label: Text(
                                  "Create a Reminder",
                                  style: appCss.dmSansSemiBold16.textColor(
                                    Colors.white,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: appColor(context).primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Overlapping top center icon
                      Positioned(
                        top: 50,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: appColor(context).primary,
                              shape: BoxShape.circle,
                            ),
                            child: SvgPicture.asset(svgAssets.reminder),
                          ),
                        ),
                      ),
                    ],
                  ),

                  VSpace(Sizes.s20),

                  if (bloc.reminderdata?.any((e) => e.isSent == false) ?? false)
                    Text(
                      "Upcoming Reminders",
                      textAlign: TextAlign.center,
                      style: appCss.dmSansBold16.textColor(
                        appColor(context).darkText,
                      ),
                    ).padding(vertical: Sizes.s10,horizontal: Sizes.s20).inkWell(
                      onTap: () {
                        context.read<CreateReminderBloc>().add(
                          UpComingReminderEvent(),
                        );
                      },
                    ),
                  if (bloc.reminderdata?.any((e) => e.isSent == false) ?? false)
                  VSpace(Sizes.s10),
                  if (context
                      .watch<CreateReminderBloc>()
                      .state
                      .showUpcomingReminder)
                    if (context.watch<CreateReminderBloc>().isReminderLoader ==
                        false /* !bloc.isReminderLoader */ )
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        padding: EdgeInsets.zero,
                        itemBuilder: (context, index) {
                          final item = bloc.reminderdata?[index];
                          final remindAt = item?.remindAt;
log("bloc.reminderdata::${bloc.reminderdata![index].isSent}");
                          String dateText = '-';
                          if (remindAt != null) {
                            final dateTime = DateTime.parse(
                              remindAt.toString(),
                            ).toLocal();
                            final now = DateTime.now();
                            final isToday =
                                dateTime.day == now.day &&
                                dateTime.month == now.month &&
                                dateTime.year == now.year;
                            final timePart = DateFormat(
                              'hh:mma',
                            ).format(dateTime);
                            final datePart = isToday
                                ? 'Today'
                                : DateFormat('dd MMM').format(dateTime);
                            dateText = '$timePart | $datePart';
                          }

                          if (item?.isSent == true) return Container();

                          return Container(
                            margin: EdgeInsets.symmetric(horizontal: Sizes.s20),
                            decoration: BoxDecoration(
                              color: appColor(context).white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color:  isDark(context)?appColor(context).gray.withValues(alpha: 0.2):Colors.grey.shade300),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 3,
                                  height: 90,
                                  decoration: BoxDecoration(
                                    border: Border.all(color:  isDark(context)?appColor(context).gray.withValues(alpha: 0.2):appColor(context).gray),
                                    color: appColor(context).yellow,
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(8),
                                      bottomLeft: Radius.circular(8),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,

                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        /*   Text(
                                          item?.note ?? "",
                                          style: appCss.dmSansRegular14.textColor(
                                             appColor(context).black,
                                          ),
                                        ), */
                                        Row(
                                          children: [
                                            Text(
                                              item?.note ?? "",
                                              style: appCss.dmSansRegular14
                                                  .textColor(
                                                    appColor(context).black,
                                                  ),
                                            ),
                                            Spacer(),
                                            IconButton(
                                              icon: Icon(
                                                Icons.close,
                                                color: appColor(context).black,
                                                size: 18,
                                              ),
                                              onPressed: () async {
                                                showCancelReminderDialog(
                                                  context,
                                                  () async {
                                                    final SharedPreferences
                                                    prefs =
                                                        await SharedPreferences.getInstance();
                                                    final token = prefs
                                                        .getString('token');
                                                    context
                                                        .read<
                                                          CreateReminderBloc
                                                        >()
                                                        .add(
                                                          CancelReminderEvent(
                                                            token: token
                                                                .toString(),
                                                            reminderId:
                                                                item!.id,
                                                          ),
                                                        );

                                                    context
                                                        .read<
                                                          CreateReminderBloc
                                                        >()
                                                        .add(
                                                          FetchRemindersEvent(
                                                            token.toString(),
                                                          ),
                                                        );
                                                  },
                                                );
                                                /*  final SharedPreferences prefs =
                                                    await SharedPreferences.getInstance();
                                                final token = prefs.getString(
                                                  'token',
                                                );
                                                context
                                                    .read<CreateReminderBloc>()
                                                    .add(
                                                      FetchRemindersEvent(
                                                        token.toString(),
                                                      ),
                                                    ); */
                                              },
                                            ),
                                          ],
                                        ),
                                        VSpace(Sizes.s4),
                                        Text(
                                          item?.channel?.name ??
                                              item?.user?.name ??
                                              "",
                                          style: appCss.dmSansRegular12
                                              .textColor(
                                                appColor(context).gray,
                                              ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          dateText,
                                          style: appCss.dmSansRegular12
                                              .textColor(
                                                appColor(context).gray,
                                              ),
                                        ).padding(bottom: Sizes.s5),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ).paddingOnly(bottom: Sizes.s12);
                        },
                        /* separatorBuilder: (_, __) => const SizedBox(height: 12), */
                        itemCount: bloc.reminderdata?.length ?? 0,
                      ),
                  VSpace(Sizes.s20),
                  if (bloc.reminderdata?.any((e) => e.isSent == true) ?? false)

                  Container(
                    margin: EdgeInsets.symmetric(horizontal: Sizes.s20),
                    decoration: BoxDecoration(
                      color: appColor(context).primary,
                      borderRadius: BorderRadius.circular(Sizes.s8),
                    ),
                    width: double.infinity,
                    child: Text(
                      textAlign: TextAlign.center, "Completed Reminders",
                      style: appCss.dmSansSemiBold16.textColor(Colors.white),
                    ).padding(vertical: Sizes.s10),
                  ).inkWell(
                    onTap: () {
                      context.read<CreateReminderBloc>().add(
                        CompletedReminderEvent(),
                      );
                    },
                  ),
                  VSpace(Sizes.s20),

                  // 🔹 Reminders list
                  if (bloc.reminderdata?.any((e) => e.isSent == true) ?? false)

                    ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        padding: const EdgeInsets.only(bottom: 20),
                        itemBuilder: (context, index) {
                          final item = bloc.reminderdata?[index];
                          final remindAt = item?.remindAt;
                          log("bloc.reminderdata:${bloc.reminderdata}");
                          String dateText = '-';
                          if (remindAt != null) {
                            final dateTime = DateTime.parse(
                              remindAt.toString(),
                            ).toLocal();
                            final now = DateTime.now();
                            final isToday =
                                dateTime.day == now.day &&
                                dateTime.month == now.month &&
                                dateTime.year == now.year;
                            final timePart = DateFormat(
                              'hh:mma',
                            ).format(dateTime);
                            final datePart = isToday
                                ? 'Today'
                                : DateFormat('dd MMM').format(dateTime);
                            dateText = '$timePart | $datePart';
                          }

                          if (item?.isSent == false) return Container();

                          return Container(
                            margin: EdgeInsets.symmetric(horizontal: Sizes.s20),
                            decoration: BoxDecoration(
                              color:appColor(context).white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isDark(context)?appColor(context).gray.withValues(alpha: 0.2): Colors.grey.shade300),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 3,
                                  height: 90,
                                  decoration: BoxDecoration(
                                    color: appColor(context).green,
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(8),
                                      bottomLeft: Radius.circular(8),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item?.note ?? "",
                                          style: appCss.dmSansRegular14
                                              .textColor(
                                                appColor(context).black,
                                              ),
                                        ),
                                        VSpace(Sizes.s4),
                                        Text(
                                          item?.channel?.name ??
                                              item?.user?.name ??
                                              "",
                                          style: appCss.dmSansRegular12
                                              .textColor(
                                                appColor(context).gray,
                                              ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          dateText,
                                          style: appCss.dmSansRegular12
                                              .textColor(
                                                appColor(context).gray,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemCount: bloc.reminderdata?.length ?? 0,
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
