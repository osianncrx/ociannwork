import 'package:teamwise/config.dart';

class NotificationBottomSheet extends StatefulWidget {
  const NotificationBottomSheet({super.key});

  @override
  State<NotificationBottomSheet> createState() =>
      _NotificationBottomSheetState();
}

class _NotificationBottomSheetState extends State<NotificationBottomSheet> {
  int selectedValue = 0;

  final List<Map<String, String>> options = [
    {
      "title": "All Messages (Default)",
      "subtitle": "You'll be notified of all new messages.",
    },
    {
      "title": "Mentions & Important Updates",
      "subtitle": "Notified on @all, @online, @Esther H",
    },
    {
      "title": "Direct Mentions Only",
      "subtitle": "Notifications only for direct mentions",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Manage Channel Notifications",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          // Options
          ...List.generate(options.length, (index) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: appColor(context).white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selectedValue == index
                      ? appColor(context).primary
                      : Colors.grey.shade300,
                  width: selectedValue == index ? 1.5 : 1,
                ),
              ),
              child: RadioListTile<int>(
                value: index,
                groupValue: selectedValue,
                onChanged: (value) {
                  setState(() {
                    selectedValue = value!;
                  });
                },
                activeColor: appColor(context).primary,
                title: Text(
                  options[index]["title"]!,
                  style: appCss.dmSansMedium14.textColor(
                    appColor(context).black,
                  ),
                ),
                subtitle: Text(
                  options[index]["subtitle"]!,
                  style: appCss.dmSansRegular14.textColor(
                    appColor(context).black,
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
