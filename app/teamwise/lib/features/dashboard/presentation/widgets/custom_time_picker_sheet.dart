import 'package:flutter/material.dart';

class SelectCustomTimeScreen extends StatefulWidget {
  const SelectCustomTimeScreen({super.key});

  @override
  State<SelectCustomTimeScreen> createState() => _SelectCustomTimeScreenState();
}

class _SelectCustomTimeScreenState extends State<SelectCustomTimeScreen> {
  DateTime selectedDate = DateTime.now();
  int selectedHour = 11;
  int selectedMinute = 8;
  String selectedPeriod = "AM";
  String repeatOption = "Do not repeat";

  final List<String> months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  final List<String> repeatOptions = [
    "Do not repeat",
    "Every Day",
    "Every Week",
    "Every Month",
    "Every Year",
  ];

  void _changeMonth(int offset) {
    setState(() {
      selectedDate = DateTime(
        selectedDate.year,
        selectedDate.month + offset,
        selectedDate.day,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    int year = selectedDate.year;
    int month = selectedDate.month;

    // 🔹 Calendar start
    DateTime firstDayOfMonth = DateTime(year, month, 1);
    int startWeekday = firstDayOfMonth.weekday % 7; // Sunday = 0
    int daysInMonth = DateTime(year, month + 1, 0).day;

    List<Widget> dayWidgets = [];
    for (int i = 0; i < startWeekday; i++) {
      dayWidgets.add(Container()); // empty cells
    }
    for (int d = 1; d <= daysInMonth; d++) {
      DateTime thisDay = DateTime(year, month, d);
      bool isSelected =
          selectedDate.year == thisDay.year &&
          selectedDate.month == thisDay.month &&
          selectedDate.day == thisDay.day;

      dayWidgets.add(
        GestureDetector(
          onTap: () {
            setState(() {
              selectedDate = thisDay;
            });
          },
          child: Container(
            margin: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isSelected ? Colors.blue : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: Text(
              "$d",
              style: TextStyle(color: isSelected ? Colors.white : Colors.black),
            ),
          ),
        ),
      );
    }
    // 🔹 Calendar end

    return Scaffold(
      appBar: AppBar(
        title: const Text("Select Date & Time"),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            // ---------- Date ----------
            const Text(
              "Select Date",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  onPressed: () => _changeMonth(-1),
                  icon: const Icon(Icons.arrow_back_ios, size: 18),
                ),
                DropdownButton<String>(
                  value: months[month - 1],
                  items: months.map((m) {
                    return DropdownMenuItem(value: m, child: Text(m));
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      month = months.indexOf(val!) + 1;
                      selectedDate = DateTime(year, month, selectedDate.day);
                    });
                  },
                ),
                DropdownButton<int>(
                  value: year,
                  items: List.generate(20, (i) => year - 10 + i).map((y) {
                    return DropdownMenuItem(value: y, child: Text("$y"));
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      selectedDate = DateTime(val!, month, selectedDate.day);
                    });
                  },
                ),
                IconButton(
                  onPressed: () => _changeMonth(1),
                  icon: const Icon(Icons.arrow_forward_ios, size: 18),
                ),
              ],
            ),
            const SizedBox(height: 8),

            GridView.count(
              crossAxisCount: 7,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                const Text("Su", textAlign: TextAlign.center),
                const Text("Mo", textAlign: TextAlign.center),
                const Text("Tu", textAlign: TextAlign.center),
                const Text("We", textAlign: TextAlign.center),
                const Text("Th", textAlign: TextAlign.center),
                const Text("Fr", textAlign: TextAlign.center),
                const Text("Sa", textAlign: TextAlign.center),
                ...dayWidgets,
              ],
            ),
            const SizedBox(height: 20),

            // ---------- Time ----------
            const Text(
              "Select Time",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                DropdownButton<int>(
                  value: selectedHour,
                  items: List.generate(12, (i) => i + 1).map((h) {
                    return DropdownMenuItem(
                      value: h,
                      child: Text(h.toString().padLeft(2, "0")),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => selectedHour = val!),
                ),
                const Text(" : "),
                DropdownButton<int>(
                  value: selectedMinute,
                  items: List.generate(60, (i) => i).map((m) {
                    return DropdownMenuItem(
                      value: m,
                      child: Text(m.toString().padLeft(2, "0")),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => selectedMinute = val!),
                ),
                const SizedBox(width: 10),
                DropdownButton<String>(
                  value: selectedPeriod,
                  items: ["AM", "PM"].map((p) {
                    return DropdownMenuItem(value: p, child: Text(p));
                  }).toList(),
                  onChanged: (val) => setState(() => selectedPeriod = val!),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ---------- Repeat ----------
            DropdownButtonFormField<String>(
              value: repeatOption,
              items: repeatOptions.map((String option) {
                return DropdownMenuItem<String>(
                  value: option,
                  child: Text(option),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  repeatOption = value!;
                });
              },
              decoration: InputDecoration(
                labelText: "Repeat",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ---------- Preview ----------
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey.shade300,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 50),
              ),
              child: Text(
                "Tomorrow, $selectedHour:${selectedMinute.toString().padLeft(2, "0")} $selectedPeriod",
              ),
            ),
            const SizedBox(height: 12),

            ElevatedButton(
              onPressed: () {
                Navigator.pop(context, {
                  "date": selectedDate,
                  "hour": selectedHour,
                  "minute": selectedMinute,
                  "period": selectedPeriod,
                  "repeat": repeatOption,
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                minimumSize: const Size(double.infinity, 50),
              ),
              child: const Text("Set Reminder"),
            ),
          ],
        ),
      ),
    );
  }
}
