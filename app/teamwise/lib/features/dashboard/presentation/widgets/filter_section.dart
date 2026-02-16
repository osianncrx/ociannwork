// ignore_for_file: unused_field

import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:teamwise/core/network/api_manger.dart';
import 'package:teamwise/features/chat/data/datasources/chat_Api.dart';
import 'package:teamwise/features/dashboard/data/datasources/dashboard_Api.dart';

import '../../../../config.dart';

class FilterSection extends StatefulWidget {
  const FilterSection({Key? key}) : super(key: key);

  @override
  State<FilterSection> createState() => _FilterSectionState();
}

class _FilterSectionState extends State<FilterSection> {
  String? fromValue = 'Anyone';
  String? postedInValue = 'All Conversations';
  DateTime? startDate;
  DateTime? endDate;
  String? selectedChatKey;
  String? selectedMembersKey;

  Future<void> _pickDate(BuildContext context, bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          startDate = picked;
        } else {
          endDate = picked;
        }
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'DD/MM/YYYY';
    return DateFormat('dd/MM/yyyy').format(date);
  }

  @override
  void initState() {
    super.initState();
    _loadChats();
    _loadMembers();
  }

  List<MessageModel> chats = [];
  bool isLoading = false;
  Future<void> _loadChats() async {
    try {
      setState(() => isLoading = true);
      final data = await DashboardApi(
        serviceLocator<ApiManager>(),
        serviceLocator<AuthBloc>(),
      ).fetchChats();
      setState(() => chats = data);
      log(" Loaded ${data.length} chats");
    } catch (e) {
      log(" Error fetching chats: $e");
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Filter By",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: selectedChatKey,
            hint: Text(
              "Select Conversation",
              style: appCss.dmSansRegular14.textColor(appColor(context).black),
            ),
            items: chats.map((chat) {
              final value = chat.channelId ?? chat.recipientId;
              final type = chat.chatType ?? '';
              return DropdownMenuItem<String>(
                value: '$type-$value',
                child: Text(chat.name ?? 'Unknown Chat'),
              );
            }).toList(),
            onChanged: (val) {
              setState(() => selectedChatKey = val);
              final selectedChat = chats.firstWhere((chat) {
                final value = chat.channelId ?? chat.recipientId;
                final type = chat.chatType ?? '';
                return '$type-$value' == val;
              });
            },
            decoration: InputDecoration(
              filled: true,
              fillColor: appColor(context).white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.r30),
              ),
            ),
          ),

          const SizedBox(height: 12),

          DropdownButtonFormField<String>(
            value: selectedMembersKey,
            hint: Text(
              "Select Conversation",
              style: appCss.dmSansRegular14.textColor(appColor(context).black),
            ),
            items: _filteredMembers.map((member) {
              final value = member.channelId ?? member.recipientId;
              final type = member.chatType ?? '';
              return DropdownMenuItem<String>(
                value: '$type-$value',
                child: Text(member.name ?? 'Unknown Chat'),
              );
            }).toList(),
            onChanged: (val) async {
              setState(() => selectedMembersKey = val);

              final selectedMember = _filteredMembers.firstWhere((member) {
                final value = member.channelId ?? member.recipientId;
                final type = member.chatType ?? '';
                return '$type-$value' == val;
              });

              // await ChatApi(
              //   serviceLocator<AuthBloc>(),
              //   serviceLocator<ApiManager>(),
              // ).searchMessages(query: v, scopType: 'global');

              setState(() {});
            },
            decoration: InputDecoration(
              filled: true,
              fillColor: appColor(context).white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.r30),
              ),
            ),
          ),

          const SizedBox(height: 25),
          const Text(
            "Date",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 10),
          _buildDateField(
            label: "Start",
            value: _formatDate(startDate),
            onTap: () => _pickDate(context, true),
          ),
          const SizedBox(height: 12),
          _buildDateField(
            label: "End",
            value: _formatDate(endDate),
            onTap: () => _pickDate(context, false),
          ),
        ],
      ),
    );
  }

  Widget _buildDateField({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "$label: $value",
              style: const TextStyle(color: Colors.black87, fontSize: 15),
            ),
            const Icon(
              Icons.calendar_today_outlined,
              color: Colors.grey,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  bool _isLoadingMembers = true;
  List<MessageModel> _members = [];
  List<MessageModel> _filteredMembers = [];
  Future<void> _loadMembers() async {
    try {
      setState(() {
        _isLoadingMembers = true;
      });

      final members = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).teamMembers();

      setState(() {
        _members = members;
        _filteredMembers = List.from(members);
        _isLoadingMembers = false;
      });
    } catch (e) {
      log('Error loading members: $e');
      setState(() {
        _isLoadingMembers = false;
      });
    }
  }
}
