import 'dart:convert';
import 'dart:developer';
import 'package:teamwise/core/network/app_constants.dart';

import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../data/datasources/chat_Api.dart';
import '../../data/models/channel_info_model.dart';
import '../../data/models/contact_profile_model.dart';
import '../../socket_service.dart';

class ContactProfile extends StatefulWidget {
  const ContactProfile({super.key});

  @override
  State<ContactProfile> createState() => _ContactProfileState();
}

class _ContactProfileState extends State<ContactProfile> {
  late final Map<String, dynamic> args;
  late final String chatType;
  late final dynamic recipientId;
  late final dynamic channelId;

  bool _isInitialized = false;
  bool _isLeavingChannel = false;
  ContactProfileModel? userData;
  ChannelInfo? channelData;
  String? _currentUserId;

  // For add members
  List<MessageModel> _allUsers = [];
  List<MessageModel> _selectedUsers = [];
  bool _isLoadingUsers = false;
  bool _isAddingMembers = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      chatType = args['chatType'];
      recipientId = args['recipientId'];
      channelId = args['channelId'];
      _getCurrentUserId();
      fetchProfileData();
      _isInitialized = true;
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchAllUsers();
  }

  void _getCurrentUserId() {
    final authState = serviceLocator<AuthBloc>().state;
    if (authState is AuthSuccess) {
      _currentUserId = authState.userId.toString();
    }
  }

  bool _isCurrentUserAdmin() {
    if (channelData == null || _currentUserId == null) return false;

    final currentMember = channelData!.channel.members.firstWhere(
      (member) => member.userId.toString() == _currentUserId,
      orElse: () => channelData!.channel.members.first,
    );

    return currentMember.role.toLowerCase() == 'admin';
  }

  Future<void> fetchProfileData() async {
    try {
      if (chatType == 'channel') {
        final data = await ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).channelInfo(channelId: channelId);

        setState(() => channelData = data);
        log("✅ ChannelData: $channelData");
      } else {
        final data = await ChatApi(
          serviceLocator<AuthBloc>(),
          serviceLocator<ApiManager>(),
        ).fetchContactProfile(chatType: chatType, recipientId: recipientId);

        setState(() => userData = data);
        log("✅ UserData: ${userData?.toJson()}");
      }
    } catch (e, st) {
      log("🔥 Error fetching profile data: $e\n$st");
    }
  }

  Future<void> _fetchAllUsers() async {
    setState(() => _isLoadingUsers = true);

    try {
      final response = await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).teamMembers();

      log("✅ Team Members Count: ${response.length}");

      // Filter out existing members
      final existingMemberIds = channelData!.channel.members
          .map((m) => m.userId.toString())
          .toList();

      final filteredUsers = response.where((user) {
        return !existingMemberIds.contains(user.recipientId.toString());
      }).toList();

      log("✅ Filtered Users Count: ${filteredUsers.length}");

      setState(() {
        _allUsers = filteredUsers;
        _isLoadingUsers = false;
      });
    } catch (e, s) {
      log("🔥 Error fetching users: $e-=-=$s");
      setState(() => _isLoadingUsers = false);

      /* if (mounted) {
        AppToast.showError('Failed to load users');
      } */
    }
  }

  Future<void> _addMembers() async {
    if (_selectedUsers.isEmpty) return;

    setState(() => _isAddingMembers = true);

    try {
      final members = _selectedUsers
          .map((user) => {"user_id": user.id, "role": "member"}) // ✅ Use int id instead of string recipientId
          .toList();

      log("🚀 Adding members: $members to channel: $channelId");

      await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).addMembersToChannel(
        channelId: int.tryParse(channelId.toString()) ?? channelId, // ✅ Ensure int channelId
        members: members,
      );

      if (mounted) {
        // Emit socket event for adding members
        try {
          // Align with web app payload: userIds (list of ints) and channel object
          final intId = int.tryParse(channelId.toString()) ?? 0;
          serviceLocator<SocketService>().emit(
            SocketEvents.memberAddedToChannel,
            {
              'channelId': intId,
              'userIds': _selectedUsers.map((u) => u.id).toList(),
              'channel': {
                'id': intId,
                'name': channelData?.channel.name ?? '',
                'description': channelData?.channel.description ?? '',
                'type': channelData?.channel.type ?? 'public',
              },
            },
          );
          log('📡 Emitted ${SocketEvents.memberAddedToChannel} (Aligned Payload)');
        } catch (e) {
          log('❌ Socket emit failed for memberAddedToChannel: $e');
        }

        AppToast.showMessage('Members added successfully');

        Navigator.pop(context);
        setState(() => _selectedUsers.clear());
        await fetchProfileData();
      }
    } catch (e, s) {
      log("🔥 Error adding members: $e///$s");
      if (mounted) {
        AppToast.showError('Failed to add members');
      }
    } finally {
      if (mounted) {
        setState(() => _isAddingMembers = false);
      }
    }
  }

  Future<void> _removeMember(ChannelMember member) async {
    try {
      await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).removeMemberFromChannel(channelId: channelId, userId: member.userId);
      _fetchAllUsers();

      if (mounted) {
        // Emit socket event for removing member
        try {
          serviceLocator<SocketService>().emit(
            SocketEvents.memberRemovedFromChannel,
            {
              'channelId': int.tryParse(channelId.toString()) ?? 0,
              'userId': int.tryParse(member.userId.toString()) ?? 0,
            },
          );
          log('📡 Emitted ${SocketEvents.memberRemovedFromChannel} (Int IDs)');
        } catch (e) {
          log('❌ Socket emit failed for memberRemovedFromChannel: $e');
        }

        AppToast.showMessage('${member.user.name} removed from channel');

        Navigator.pop(context);
        await fetchProfileData();
      }
    } catch (e) {
      log("🔥 Error removing member: $e");
      if (mounted) {
        AppToast.showError('Failed to remove member');
      }
    }
  }

  void _showRemoveMemberDialog(ChannelMember member) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Remove Member',
          style: appCss.dmSansSemiBold18.textColor(appColor(context).darkText),
        ),
        content: Text(
          'Are you sure you want to remove ${member.user.name} from this channel?',
          style: appCss.dmSansRegular14.textColor(appColor(context).darkText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: appCss.dmSansSemiBold14.textColor(
                appColor(context).lightText,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _removeMember(member);
            },
            child: Text(
              'Remove',
              style: appCss.dmSansSemiBold14.textColor(Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  // Add this method for toggling admin role
  Future<void> _toggleAdminRole(ChannelMember member) async {
    final currentRole = member.role.toLowerCase();
    final newRole = currentRole == 'admin' ? 'member' : 'admin';

    try {
      await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).updateMemberRole(
        channelId: channelId,
        userId: member.userId,
        newRole: newRole,
      );

      if (mounted) {
        // Emit socket event for role update
        try {
          serviceLocator<SocketService>().emit(
            SocketEvents.memberRoleUpdated,
            {
              'channelId': int.tryParse(channelId.toString()) ?? 0,
              'userId': int.tryParse(member.userId.toString()) ?? 0,
              'newRole': newRole,
            },
          );
          log('📡 Emitted ${SocketEvents.memberRoleUpdated} (Int IDs)');
        } catch (e) {
          log('❌ Socket emit failed for memberRoleUpdated: $e');
        }

        AppToast.showMessage(
          newRole == 'admin'
              ? '${member.user.name} is now an admin'
              : '${member.user.name} is no longer an admin',
        );

        Navigator.pop(context);
        await fetchProfileData();
      }
    } catch (e) {
      log("🔥 Error updating role: $e");
      if (mounted) {
        AppToast.showError('Failed to update role');
      }
    }
  }

  // Add confirmation dialog for role change
  void _showRoleChangeDialog(ChannelMember member) {
    final currentRole = member.role.toLowerCase();
    final isAdmin = currentRole == 'admin';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          isAdmin ? 'Remove Admin' : 'Make Admin',
          style: appCss.dmSansSemiBold18.textColor(appColor(context).darkText),
        ),
        content: Text(
          isAdmin
              ? 'Are you sure you want to remove admin privileges from ${member.user.name}?'
              : 'Are you sure you want to make ${member.user.name} an admin?',
          style: appCss.dmSansRegular14.textColor(appColor(context).darkText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: appCss.dmSansSemiBold14.textColor(
                appColor(context).lightText,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _toggleAdminRole(member);
            },
            child: Text(
              isAdmin ? 'Remove Admin' : 'Make Admin',
              style: appCss.dmSansSemiBold14.textColor(
                isAdmin ? Colors.orange : appColor(context).primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddMembersBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.8,
          decoration: BoxDecoration(
            color: appColor(context).white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: appColor(context).dividerColor),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        "Add Members (${channelData!.channel.name})",
                        style: appCss.dmSansSemiBold16.textColor(
                          appColor(context).darkText,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () {
                        setState(() => _selectedUsers.clear());
                        Navigator.pop(context);
                      },
                    ),
                  ],
                ),
              ),

              // Search/Select members text
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
                alignment: Alignment.centerLeft,
                child: Text(
                  "Select members...",
                  style: appCss.dmSansRegular14.textColor(
                    appColor(context).lightText,
                  ),
                ),
              ),

              // Selected members chips
              // if (_selectedUsers.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _selectedUsers.map((user) {
                    return Chip(
                      // avatar: CircleAvatar(
                      //   backgroundColor: appColor(context).primary,
                      //   child: Text(
                      //     user.recipientName.isNotEmpty
                      //         ? user.recipientName[0].toUpperCase()
                      //         : '?',
                      //     style: appCss.dmSansMedium12.textColor(
                      //       appColor(context).white,
                      //     ),
                      //   ),
                      // ),
                      label: Text(user.name),
                      deleteIcon: const Icon(Icons.close, size: 18),
                      onDeleted: () {
                        setModalState(() {
                          _selectedUsers.removeWhere(
                            (u) => u.recipientId == user.recipientId,
                          );
                        });
                      },
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 10),

              // Users List
              Expanded(
                child: _isLoadingUsers
                    ? const Center(child: CircularProgressIndicator())
                    : _allUsers.isEmpty
                    ? Center(
                        child: Text(
                          'No users available to add',
                          style: appCss.dmSansRegular14.textColor(
                            appColor(context).lightText,
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: _allUsers.length,
                        itemBuilder: (context, index) {
                          final user = _allUsers[index];
                          final isSelected = _selectedUsers.any(
                            (u) => u.recipientId == user.recipientId,
                          );
                          log("_allUsers:::$user");
                          return InkWell(
                            onTap: () {
                              setModalState(() {
                                if (isSelected) {
                                  _selectedUsers.removeWhere(
                                    (u) => u.recipientId == user.recipientId,
                                  );
                                } else {
                                  _selectedUsers.add(user);
                                }
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: appColor(context).primary,
                                    backgroundImage:
                                        user.avatarUrl != null &&
                                            user.avatarUrl!.isNotEmpty &&
                                            user.avatarUrl != "null"
                                        ? NetworkImage(
                                            "${AppConstants.appUrl}${user.avatarUrl}",
                                          )
                                        : null,
                                    child:
                                        (user.avatarUrl == null ||
                                            user.avatarUrl!.isEmpty ||
                                            user.avatarUrl == "null")
                                        ? Text(
                                            user.name.isNotEmpty
                                                ? user.name[0].toUpperCase()
                                                : '?',
                                            style: appCss.dmSansSemiBold14
                                                .textColor(
                                                  appColor(context).white,
                                                ),
                                          )
                                        : null,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          user.name,
                                          style: appCss.dmSansSemiBold14
                                              .textColor(
                                                appColor(context).darkText,
                                              ),
                                        ),
                                        if (user.email != null &&
                                            user.email!.isNotEmpty)
                                          Text(
                                            user.email!,
                                            style: appCss.dmSansRegular12
                                                .textColor(
                                                  appColor(context).lightText,
                                                ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    isSelected
                                        ? Icons.check_circle
                                        : Icons.circle_outlined,
                                    color: isSelected
                                        ? appColor(context).primary
                                        : appColor(context).lightText,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),

              // Add Members Button
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: appColor(context).white,
                  border: Border(
                    top: BorderSide(color: appColor(context).dividerColor),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _selectedUsers.isEmpty || _isAddingMembers
                        ? null
                        : () async {
                            await _addMembers();
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: appColor(context).primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      disabledBackgroundColor: appColor(context).lightText,
                    ),
                    child: _isAddingMembers
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                appColor(context).white,
                              ),
                            ),
                          )
                        : Text(
                            'Add Members (${_selectedUsers.length})',
                            style: appCss.dmSansSemiBold16.textColor(
                              appColor(context).white,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showMembersModal() {
    if (channelData == null || channelData!.channel.members.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: appColor(context).white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Header with Add Button
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: appColor(context).dividerColor),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        "Members",
                        style: appCss.dmSansSemiBold18.textColor(
                          appColor(context).darkText,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: appColor(
                            context,
                          ).primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          channelData!.channel.members.length.toString(),
                          style: appCss.dmSansSemiBold14.textColor(
                            appColor(context).primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_isCurrentUserAdmin())
                    IconButton(
                      icon: Icon(
                        Icons.person_add,
                        color: appColor(context).primary,
                      ),
                      onPressed: () {
                        Navigator.pop(context);
                        _showAddMembersBottomSheet();
                      },
                      tooltip: 'Add Members',
                    ),
                ],
              ),
            ),

            // Members List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
                itemCount: channelData!.channel.members.length,
                itemBuilder: (context, index) {
                  final member = channelData!.channel.members[index];
                  return _buildMemberTile(member);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMemberTile(ChannelMember member) {
    final isAdmin = member.role.toLowerCase() == 'admin';
    final user = member.user;
    final isCurrentUser = member.userId.toString() == _currentUserId;
    final canModify = _isCurrentUserAdmin() && !isCurrentUser;
    log("user object ${user.profileColor}");
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: _getProfileColor(user.profileColor),
            backgroundImage:
                user.avatar != null &&
                    user.avatar!.isNotEmpty &&
                    user.avatar != "null"
                ? NetworkImage("${AppConstants.appUrl}${user.avatar}")
                : null,
            child:
                (user.avatar == null ||
                    user.avatar!.isEmpty ||
                    user.avatar == "null")
                ? Text(
                    user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                    style: appCss.dmSansSemiBold14.textColor(
                      appColor(context).white,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        user.name,
                        style: appCss.dmSansSemiBold14.textColor(
                          appColor(context).darkText,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isAdmin) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: appColor(
                            context,
                          ).primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          "Admin",
                          style: appCss.dmSansMedium12.textColor(
                            appColor(context).primary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (user.email.isNotEmpty)
                  Text(
                    user.email,
                    style: appCss.dmSansRegular12.textColor(
                      appColor(context).lightText,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),

          // Action buttons for admins
          if (canModify) ...[
            // Toggle Admin button
            IconButton(
              icon: Icon(
                isAdmin
                    ? Icons.admin_panel_settings
                    : Icons.admin_panel_settings_outlined,
                color: isAdmin ? Colors.orange : appColor(context).primary,
                size: 20,
              ),
              onPressed: () => _showRoleChangeDialog(member),
              tooltip: isAdmin ? 'Remove admin' : 'Make admin',
            ),
            // Remove member button
            IconButton(
              icon: Icon(Icons.person_remove, color: Colors.red, size: 20),
              onPressed: () => _showRemoveMemberDialog(member),
              tooltip: 'Remove member',
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = userData;
    final isChannel = chatType == 'channel';
    final displayData = isChannel ? channelData : userData;
    return Scaffold(
      body: Container(
        height: double.infinity,
        width: double.infinity,
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Stack(
              alignment: AlignmentGeometry.topCenter,
              children: [
                Container(
                  height: Sizes.s100,
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage(imageAssets.createChannelBg),
                      alignment: Alignment.topCenter,
                    ),
                  ),
                ).paddingDirectional(horizontal: Sizes.s20, top: Sizes.s30),
                Container(
                  child: displayData == null
                      ? SizedBox(
                          height: MediaQuery.of(context).size.height - 100,
                          width: MediaQuery.of(context).size.width,
                          child: Center(
                            child: const CircularProgressIndicator(),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Stack(
                                children: [
                                  Container(
                                    height: 88,
                                    width: 88,
                                    decoration: BoxDecoration(
                                      color: _getProfileColor(
                                        userData?.profileColor,
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                      image:
                                          (!isChannel &&
                                              (userData?.avatar?.isNotEmpty ??
                                                  false) &&
                                              userData?.avatar != "null")
                                          ? DecorationImage(
                                              image: NetworkImage(
                                                "${AppConstants.appUrl}${userData?.avatar}",
                                              ),
                                              fit: BoxFit.cover,
                                            )
                                          : null,
                                    ),
                                    child:
                                        (isChannel ||
                                            (userData?.avatar?.isEmpty ??
                                                true) ||
                                            userData?.avatar == "null")
                                        ? Center(
                                            child: Text(
                                              isChannel
                                                  ? "#"
                                                  : (userData
                                                            ?.name
                                                            ?.isNotEmpty ??
                                                        false)
                                                  ? userData!.name![0]
                                                        .toUpperCase()
                                                  : '?',
                                              style: appCss.dmSansSemiBold30
                                                  .textColor(
                                                    appColor(context).white,
                                                  ),
                                            ),
                                          )
                                        : null,
                                  ),
                                  if (chatType != 'channel')
                                    Positioned(
                                      bottom: 0,
                                      right: 0,
                                      child:
                                          ValueListenableBuilder<Set<String>>(
                                            valueListenable:
                                                SocketService().onlineUsers,
                                            builder: (context, onlineUsers, _) {
                                              final isOnline = onlineUsers
                                                  .contains(
                                                    recipientId.toString(),
                                                  );
                                              return Container(
                                                width: 15,
                                                height: 15,
                                                decoration: BoxDecoration(
                                                  color: isOnline
                                                      ? Colors.green
                                                      : Colors.orange,
                                                  shape: BoxShape.circle,
                                                  border: Border.all(
                                                    color: Colors.white,
                                                    width: 2,
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                    ),
                                ],
                              ).center(),
                              const SizedBox(height: 16),

                              Text(
                                data?.name ?? channelData?.channel.name ?? "",
                                style: appCss.dmSansSemiBold18.textColor(
                                  appColor(context).darkText,
                                ),
                              ).center(),

                              Divider(
                                height: 1,
                                color: appColor(
                                  context,
                                ).gray.withValues(alpha: 0.2),
                              ).paddingDirectional(vertical: 20),

                              if (isChannel) ...[
                                _infoRow(
                                  "Channel Name",
                                  channelData!.channel.name,
                                ),
                                _infoRow(
                                  "Description",
                                  channelData!.channel.description,
                                ),

                                // Members Button
                                InkWell(
                                  onTap: _showMembersModal,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              "Members:",
                                              style: appCss.dmSansSemiBold14
                                                  .textColor(
                                                    appColor(context).darkText,
                                                  ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 2,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: appColor(context).primary
                                                    .withValues(alpha: 0.1),
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                channelData!
                                                    .channel
                                                    .members
                                                    .length
                                                    .toString(),
                                                style: appCss.dmSansSemiBold14
                                                    .textColor(
                                                      appColor(context).primary,
                                                    ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        Icon(
                                          Icons.arrow_forward_ios,
                                          size: 16,
                                          color: appColor(context).lightText,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                                // Divider(
                                //   color: appColor(context).gray.withValues(alpha: 0.2),
                                //   height: 1,
                                // ).paddingDirectional(vertical: Sizes.s14),
                                VSpace(Sizes.s20),
                                // Leave & Delete Channel Actions
                                if (isChannel)
                                  Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: appColor(context).gray.withValues(alpha: 0.05),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: appColor(context).gray.withValues(alpha: 0.2),
                                        width: 1,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Leave Channel (Visible to everyone)
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Leave Channel',
                                                  style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  'You will no longer receive updates.',
                                                  style: appCss.dmSansRegular12.textColor(appColor(context).lightText),
                                                ),
                                              ],
                                            ),
                                            if (_isLeavingChannel)
                                              const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(strokeWidth: 2),
                                              )
                                            else
                                              IconButton(
                                                icon: Icon(Icons.exit_to_app, color: appColor(context).primary),
                                                onPressed: _showLeaveChannelDialog,
                                                tooltip: 'Leave Channel',
                                              ),
                                          ],
                                        ),

                                        // Delete Channel (Visible only to Admin)
                                        if (_isCurrentUserAdmin()) ...[
                                          const SizedBox(height: 12),
                                          Divider(color: appColor(context).dividerColor),
                                          const SizedBox(height: 12),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'Delete Channel',
                                                    style: appCss.dmSansSemiBold14.textColor(Colors.red),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    'Permanently remove for everyone.',
                                                    style: appCss.dmSansRegular12.textColor(Colors.red.withValues(alpha: 0.7)),
                                                  ),
                                                ],
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.delete_forever, color: Colors.red),
                                                onPressed: _showDeleteChannelDialog,
                                                tooltip: 'Delete Channel',
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                              ] else ...[
                                _infoRow("Email", userData?.email),
                                // _infoRow(
                                //   "Unread Count",
                                //   userData?.unreadCount?.toString(),
                                // ),
                                if (userData?.customField != null &&
                                    (userData?.customField?.isNotEmpty ??
                                        false)) ...[
                                  for (var entry in parseCustomField(
                                    userData?.customField,
                                  ).entries)
                                    _infoRow(entry.key, entry.value.toString()),
                                ],
                              ],
                            ],
                          ),
                        ),
                ).paddingDirectional(top: Sizes.s100),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _leaveChannel() async {
    setState(() => _isLeavingChannel = true);

    try {
      await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).leaveChannel(channelId: channelId);

      if (mounted) {
        // Emit socket event for leaving channel
        try {
          serviceLocator<SocketService>().emit(
            SocketEvents.memberLeftChannel,
            {
              'channelId': channelId.toString(),
              'userId': _currentUserId,
            },
          );
          log('📡 Emitted ${SocketEvents.memberLeftChannel}');
        } catch (e) {
          log('❌ Socket emit failed for memberLeftChannel: $e');
        }

        // Show success message
        AppToast.showMessage('You have left the channel');
        // Navigate back
        Navigator.of(context).pop(true);
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      log("🔥 Error leaving channel: $e");
      if (mounted) {
        AppToast.showError('Failed to leave channel');
      }
    } finally {
      if (mounted) {
        setState(() => _isLeavingChannel = false);
      }
    }
  }

  void _showLeaveChannelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Leave channel',
          style: appCss.dmSansSemiBold18.textColor(appColor(context).darkText),
        ),
        content: Text(
          'You will no longer have access to this channel',
          style: appCss.dmSansRegular14.textColor(appColor(context).darkText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: appCss.dmSansSemiBold14.textColor(
                appColor(context).lightText,
              ),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop(true);
              await _leaveChannel();
            },
            child: Text(
              'Leave channel',
              style: appCss.dmSansSemiBold14.textColor(Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteChannel() async {
    setState(() => _isLeavingChannel = true);

    try {
      await ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      ).deleteChannel(channelId: channelId);

      if (mounted) {
        AppToast.showMessage('Channel deleted successfully');
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/dashboard',
          (route) => false,
          arguments: {'selectedIndex': 0},
        );
      }
    } catch (e) {
      log("🔥 Error deleting channel: $e");
      if (mounted) {
        AppToast.showError('Failed to delete channel');
      }
    } finally {
      if (mounted) {
        setState(() => _isLeavingChannel = false);
      }
    }
  }

  void _showDeleteChannelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Delete Channel',
          style: appCss.dmSansSemiBold18.textColor(appColor(context).darkText),
        ),
        content: Text(
          'Are you sure you want to delete this channel? This action cannot be undone and will remove it for all members.',
          style: appCss.dmSansRegular14.textColor(appColor(context).darkText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: appCss.dmSansSemiBold14.textColor(
                appColor(context).lightText,
              ),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop(true);
              await _deleteChannel();
            },
            child: Text(
              'Delete',
              style: appCss.dmSansSemiBold14.textColor(Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> parseCustomField(String? customField) {
    if (customField == null || customField.trim().isEmpty) return {};

    try {
      final decoded = jsonDecode(customField);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {
      final cleaned = customField
          .replaceAll('{', '')
          .replaceAll('}', '')
          .split(',')
          .map((e) => e.split(':'))
          .where((pair) => pair.length == 2)
          .map((pair) => MapEntry(pair[0].trim(), pair[1].trim()))
          .toList();

      return Map.fromEntries(cleaned);
    }

    return {};
  }

  Widget _infoRow(String title, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          child: Text(
            "$title:",
            style: appCss.dmSansMedium15.textColor(appColor(context).darkText),
          ),
        ),
        Text(
          value,
          style: appCss.dmSansMedium14.textColor(appColor(context).gray),
        ).paddingDirectional(top: Sizes.s8),
        Divider(
          color: appColor(context).gray.withValues(alpha: 0.2),
          height: 0,
        ).paddingDirectional(vertical: Sizes.s14),
      ],
    );
  }

  Color _getProfileColor(dynamic color) {
    try {
      if (color == null) return appColor(context).primary;
      if (color is Color) return color;

      final colorCode = color.toString();
      if (colorCode.isEmpty) return appColor(context).primary;

      return Color(int.parse(colorCode.replaceFirst('#', '0xff')));
    } catch (_) {
      return appColor(context).primary;
    }
  }
}
