import 'dart:developer';
import '../../../../config.dart';
import '../../../../core/network/api_manger.dart';
import '../../../auth/data/auth_services.dart';
import '../../../chat/data/datasources/chat_Api.dart';
import '../../../chat/socket_service.dart';
import '../../data/datasources/dashboard_Api.dart';

class CreateChannelScreen extends StatefulWidget {
  const CreateChannelScreen({super.key});

  @override
  State<CreateChannelScreen> createState() => _CreateChannelFormState();
}

class _CreateChannelFormState extends State<CreateChannelScreen> {
  final channelNameController = TextEditingController();
  final channelDesController = TextEditingController();

  FocusNode channelNameFocus = FocusNode();
  FocusNode channelDesFocus = FocusNode();
  int? selectedIndex = 1;
  TeamType selectedType = TeamType.public;

  List<MessageModel> availableMembers = [];
  List<String> selectedMemberIds = [];
  bool isLoadingMembers = false;
  Map<String, dynamic>? _currentSubscription;
  bool _isLoadingSubscription = true;

  @override
  void initState() {
    super.initState();
    _loadMembers();
    _fetchSubscription();
  }

  Future<void> _fetchSubscription() async {
    try {
      final chatApi = ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      );
      final subscription = await chatApi.fetchCurrentSubscription();
      setState(() {
        _currentSubscription = subscription;
        _isLoadingSubscription = false;
        // Auto-select Public if private channels are not allowed
        if (!_allowsPrivateChannels) {
          selectedType = TeamType.public;
        }
      });
      log('📊 Subscription fetched: $_currentSubscription');
    } catch (e) {
      log('❌ Error fetching subscription: $e');
      setState(() {
        _isLoadingSubscription = false;
      });
    }
  }

  bool get _allowsPrivateChannels {
    if (_currentSubscription == null) return true;
    return _currentSubscription?['data']?['subscription']?['plan']?['allows_private_channels'] ??
        true;
  }

  Future<void> _loadMembers() async {
    setState(() => isLoadingMembers = true);
    try {
      final chatApi = ChatApi(
        serviceLocator<AuthBloc>(),
        serviceLocator<ApiManager>(),
      );
      final auth = AuthService(); // for current user id

      final members = await chatApi.teamMembers();
      setState(() {
        availableMembers = members
            .where((m) => m.id.toString() != auth.userId.toString())
            .toList();

        selectedMemberIds.remove(auth.userId.toString());
        isLoadingMembers = false;
      });
    } catch (e) {
      setState(() => isLoadingMembers = false);
      log('Error loading members: $e');
    }
  }

  Color _getProfileColorHeader(BuildContext context, profileColor) {
    if (profileColor == null || profileColor!.isEmpty) {
      return appColor(context).primary; // Fallback to primary color
    }

    try {
      // Remove '#' if present and add '0xff' prefix for Flutter Color
      String colorString = profileColor!.replaceAll('#', '');

      // Handle 3-digit hex colors (e.g., #FFF -> #FFFFFF)
      if (colorString.length == 3) {
        colorString = colorString.split('').map((c) => c + c).join();
      }

      return Color(int.parse('0xff$colorString'));
    } catch (e) {
      // If parsing fails, return primary color
      return appColor(context).primary;
    }
  }

  Widget _buildDefaultAvatar(String name, profileColor) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: _getProfileColorHeader(context, profileColor),
        borderRadius: BorderRadius.circular(Sizes.s10),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'U',
          style: appCss.dmSansSemiBold14.textColor(appColor(context).darkText),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is ChannelCreationFailed) {}
        if (state is AuthSuccess) {
          log("state.token::${state.token}");
        }
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: Container(
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
            child: SingleChildScrollView(
              // physics: const NeverScrollableScrollPhysics(),
              /*  padding: EdgeInsets.symmetric(
                horizontal: Sizes.s20,
                vertical: Sizes.s24,
              ), */
              child: Column(
                children: [
                  // SizedBox(height: Sizes.s80),
                  Stack(
                    alignment: Alignment.topCenter,
                    children: [
                      Container(
                        width: Sizes.s257,
                        height: Sizes.s335,
                        decoration: BoxDecoration(
                          image: DecorationImage(
                            image: AssetImage(imageAssets.createChannelBg),
                            alignment: Alignment.topCenter,
                          ),
                        ),
                      ),
                      Column(
                        children: [
                          CommonCardContainer(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  appFonts.giveYourFirst,
                                  style: appCss.dmSansExtraBold18.textColor(
                                    appColor(context).darkText,
                                  ),
                                ),
                                Text(
                                  appFonts.youMayInitiate,
                                  style: appCss.dmSansRegular14.textColor(
                                    appColor(context).lightText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s3,
                                  bottom: Sizes.s20,
                                ),

                                // Channel name
                                Text(
                                  appFonts.channelName,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(bottom: Sizes.s8),
                                TextFieldCommon(
                                  validator: (name) => Validation()
                                      .nameValidation(context, name),
                                  controller: channelNameController,
                                  hintText: language(
                                    context,
                                    appFonts.channelName,
                                  ),
                                  keyboardType: TextInputType.name,
                                  focusNode: channelNameFocus,
                                ),

                                // Description
                                Text(
                                  appFonts.description,
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s20,
                                  bottom: Sizes.s8,
                                ),
                                TextFieldCommon(
                                  validator: (name) => Validation()
                                      .nameValidation(context, name),
                                  controller: channelDesController,
                                  hintText: language(
                                    context,
                                    appFonts.description,
                                  ),
                                  focusNode: channelDesFocus,
                                ),

                                // Channel Type Dropdown
                                Text(
                                  language(context, appFonts.channelType),
                                  style: appCss.dmSansSemiBold14.textColor(
                                    appColor(context).darkText,
                                  ),
                                ).paddingDirectional(
                                  top: Sizes.s20,
                                  bottom: Sizes.s8,
                                ),

                                Container(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: Sizes.s16,
                                    vertical: Sizes.s4,
                                  ),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(
                                      Sizes.s8,
                                    ),
                                    border: Border.all(
                                      color: (isDark(context)
                                          ? appColor(
                                              context,
                                            ).gray.withValues(alpha: 0.2)
                                          : appColor(context).textFiledBorder),
                                      //appColor(context).textFiledBorder,
                                    ),
                                  ),
                                  child: DropdownButton<TeamType>(
                                    isExpanded: true,
                                    value: selectedType,
                                    underline: SizedBox(),
                                    icon: Icon(
                                      Icons.keyboard_arrow_down,
                                      color: appColor(context).darkText,
                                    ),
                                    items: TeamType.values
                                        .where((type) {
                                          // Filter out private if not allowed
                                          if (type == TeamType.private) {
                                            return _allowsPrivateChannels;
                                          }
                                          return true;
                                        })
                                        .map((type) {
                                          return DropdownMenuItem<TeamType>(
                                            value: type,
                                            child: Text(
                                              type == TeamType.public
                                                  ? language(
                                                      context,
                                                      appFonts.public,
                                                    )
                                                  : language(
                                                      context,
                                                      appFonts.privet,
                                                    ),
                                              style: appCss.dmSansMedium14
                                                  .textColor(
                                                    appColor(context).darkText,
                                                  ),
                                            ),
                                          );
                                        })
                                        .toList(),
                                    onChanged: (TeamType? newType) {
                                      setState(() {
                                        if (newType != null)
                                          selectedType = newType;
                                      });
                                    },
                                  ),
                                ),

                                // Invite Members Expansion
                                VSpace(Sizes.s20),
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: (isDark(context)
                                          ? appColor(
                                              context,
                                            ).gray.withValues(alpha: 0.2)
                                          : appColor(context).textFiledBorder),
                                      //appColor(context).textFiledBorder,
                                    ),
                                    borderRadius: BorderRadius.circular(
                                      Sizes.s8,
                                    ),
                                  ),
                                  child: ExpansionTile(
                                    tilePadding: EdgeInsets.symmetric(
                                      horizontal: Sizes.s16,
                                      vertical: Sizes.s8,
                                    ),
                                    childrenPadding: EdgeInsets.zero,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(
                                        Sizes.s8,
                                      ),
                                    ),
                                    collapsedShape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(
                                        Sizes.s8,
                                      ),
                                    ),
                                    title: Row(
                                      children: [
                                        Container(
                                          padding: EdgeInsets.all(Sizes.s8),
                                          decoration: BoxDecoration(
                                            color: appColor(
                                              context,
                                            ).primary.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(
                                              Sizes.s6,
                                            ),
                                          ),
                                          child: Icon(
                                            Icons.person_add_outlined,
                                            size: Sizes.s20,
                                            color: appColor(context).primary,
                                          ),
                                        ),
                                        HSpace(Sizes.s12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Invite Members',
                                                style: appCss.dmSansSemiBold14
                                                    .textColor(
                                                      appColor(
                                                        context,
                                                      ).darkText,
                                                    ),
                                              ),
                                              if (selectedMemberIds.isNotEmpty)
                                                Text(
                                                  '${selectedMemberIds.length} member${selectedMemberIds.length > 1 ? 's' : ''} selected',
                                                  style: appCss.dmSansRegular12
                                                      .textColor(
                                                        appColor(
                                                          context,
                                                        ).primary,
                                                      ),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    trailing: Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: appColor(context).darkText,
                                    ),
                                    children: [
                                      if (isLoadingMembers)
                                        _buildLoadingMembers()
                                      else if (availableMembers.isEmpty)
                                        _buildEmptyMembers()
                                      else
                                        _buildMemberList(),
                                    ],
                                    onExpansionChanged: (expanded) {
                                      if (expanded &&
                                          availableMembers.isEmpty &&
                                          !isLoadingMembers) {
                                        _loadMembers();
                                      }
                                    },
                                  ),
                                ),

                                VSpace(Sizes.s33),
                                BlocBuilder<AuthBloc, AuthState>(
                                  buildWhen: (prev, curr) =>
                                      (prev is AuthLoading) !=
                                      (curr is AuthLoading),
                                  builder: (context, state) {
                                    final isLoading = state is AuthLoading;
                                    return ButtonCommon(
                                      title: language(context, appFonts.done),
                                      isLoading: isLoading,
                                      // inside ButtonCommon onTap
                                      onTap: isLoading
                                          ? null
                                          : () async {
                                              final name = channelNameController
                                                  .text
                                                  .trim();
                                              final description =
                                                  channelDesController.text
                                                      .trim();

                                              if (name.isEmpty) {
                                                AppToast.showError(
                                                  "Please enter a channel name",
                                                );
                                                return;
                                              }

                                              final data = {
                                                "name": name,
                                                "description": description,
                                                "type":
                                                    selectedType ==
                                                        TeamType.public
                                                    ? "public"
                                                    : "private",
                                                "member_ids": selectedMemberIds,
                                              };

                                              log(
                                                "Creating channel with data: $data",
                                              );

                                              try {
                                                final chatApi = ChatApi(
                                                  serviceLocator<AuthBloc>(),
                                                  serviceLocator<ApiManager>(),
                                                );

                                                // Await API response for created channel
                                                final created = await chatApi
                                                    .createChannel(
                                                      data,
                                                      context,
                                                    );
                                                // created should be map/object with new channel id, name, members etc.
                                                // adapt if your API returns differently.

                                                // Build socket payload for broadcast (choose fields server expects)
                                                final payload = {
                                                  'channel_id': created
                                                      .data['id']
                                                      ?.toString(),
                                                  'name':
                                                      created.data['name'] ??
                                                      name,
                                                  'description':
                                                      created
                                                          .data['description'] ??
                                                      description,
                                                  'type':
                                                      created.data['type'] ??
                                                      data['type'],
                                                  'creator_id':
                                                      AuthService().userId,
                                                  'member_ids':
                                                      created
                                                          .data['member_ids'] ??
                                                      selectedMemberIds,
                                                  'created_at':
                                                      created
                                                          .data['created_at'] ??
                                                      DateTime.now()
                                                          .toIso8601String(),
                                                };

                                                // Emit socket so other clients can update immediately
                                                try {
                                                  serviceLocator<
                                                        SocketService
                                                      >()
                                                      .emit(
                                                        SocketEvents
                                                            .channelCreated,
                                                        payload,
                                                      );
                                                  log(
                                                    '📡 Emitted ${SocketEvents.channelCreated}: $payload',
                                                  );
                                                } catch (e) {
                                                  log(
                                                    '❌ Socket emit failed for channelCreated: $e',
                                                  );
                                                }

                                                // Optionally emit new-channel as well (your backend may listen to either)
                                                try {
                                                  serviceLocator<
                                                        SocketService
                                                      >()
                                                      .emit(
                                                        SocketEvents.newChannel,
                                                        payload,
                                                      );
                                                } catch (_) {}

                                                // Close screen or show success
                                                Navigator.of(context).pop(true);
                                              } catch (e, s) {
                                                log(
                                                  '❌ Channel creation failed: $e',
                                                );
                                                log('$s');
                                                AppToast.showError(
                                                  'Failed to create channel',
                                                );
                                              }
                                            },

                                      /*                                      onTap: isLoading
                                          ? null
                                          : () async {
                                              final name = channelNameController
                                                  .text
                                                  .trim();
                                              final description =
                                                  channelDesController.text
                                                      .trim();

                                              if (name.isEmpty) {
                                                AppToast.showError(
                                                  "Please enter a channel name",
                                                );
                                                return;
                                              }

                                              final data = {
                                                "name": name,
                                                "description": description,
                                                "type": "public",
                                                "member_ids": selectedMemberIds,
                                              };

                                              log(
                                                "Channel data with ${selectedMemberIds.length} selected members: $data",
                                              );

                                              ChatApi(
                                                serviceLocator<AuthBloc>(),
                                                serviceLocator<ApiManager>(),
                                              ).createChannel(data, context);
                                            },*/
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ).padding(top: Sizes.s100),
                    ],
                  ),
                  SizedBox(height: Sizes.s40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingMembers() => Container(
    padding: EdgeInsets.all(Sizes.s20),
    child: Column(
      children: [
        CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(appColor(context).primary),
          strokeWidth: 2,
        ),
        VSpace(Sizes.s12),
        Text(
          'Loading members...',
          style: appCss.dmSansRegular14.textColor(appColor(context).lightText),
        ),
      ],
    ),
  );

  Widget _buildEmptyMembers() => Container(
    padding: EdgeInsets.all(Sizes.s20),
    child: Column(
      children: [
        Icon(
          Icons.people_outline,
          size: Sizes.s40,
          color: appColor(context).lightText,
        ),
        VSpace(Sizes.s12),
        Text(
          'No members found',
          style: appCss.dmSansMedium14.textColor(appColor(context).lightText),
        ),
      ],
    ),
  );

  Widget _buildMemberList() => Column(
    children: [
      Container(
        padding: EdgeInsets.symmetric(
          horizontal: Sizes.s16,
          vertical: Sizes.s8,
        ),
        child: Row(
          children: [
            Checkbox(
              value: selectedMemberIds.length == availableMembers.length,
              onChanged: (bool? value) {
                setState(() {
                  if (value == true) {
                    selectedMemberIds = availableMembers
                        .map((m) => m.id.toString())
                        .toList();
                  } else {
                    selectedMemberIds.clear();
                  }
                });
              },
              side: BorderSide(color: appColor(context).dividerColor),
              checkColor: appColor(context).white,
              activeColor: appColor(context).primary,
            ),
            HSpace(Sizes.s5),
            Text(
              'Select All',
              style: appCss.dmSansSemiBold14.textColor(
                appColor(context).darkText,
              ),
            ),
          ],
        ),
      ),
      Divider(
        height: 0,
        color: appColor(context).textFiledBorder.withValues(alpha: 0.5),
      ),
      ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.3,
        ),
        child: ListView.separated(
          padding: EdgeInsets.zero,
          shrinkWrap: true,
          physics: const BouncingScrollPhysics(),
          itemCount: availableMembers.length,
          separatorBuilder: (_, __) => Divider(
            height: 1,
            color: appColor(context).textFiledBorder.withValues(alpha: 0.3),
            indent: Sizes.s16,
            endIndent: Sizes.s16,
          ),
          itemBuilder: (context, index) {
            final member = availableMembers[index];
            final memberId = member.id.toString();
            final isSelected = selectedMemberIds.contains(memberId);
            return _memberTile(member, memberId, isSelected);
          },
        ),
      ),
    ],
  );

  Widget _memberTile(MessageModel member, String memberId, bool isSelected) {
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            selectedMemberIds.remove(memberId);
          } else {
            selectedMemberIds.add(memberId);
          }
        });
      },
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: Sizes.s16,
          vertical: Sizes.s12,
        ),
        child: Row(
          children: [
            Container(
              width: Sizes.s40,
              height: Sizes.s40,
              decoration: BoxDecoration(
                color: appColor(context).primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(Sizes.s20),
                border: Border.all(
                  color: isSelected
                      ? appColor(context).primary
                      : appColor(context).textFiledBorder,
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: member.avatarUrl != null && member.avatarUrl!.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(Sizes.s18),
                      child: Image.network(
                        member.avatarUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildDefaultAvatar(
                          member.name,
                          member.profileColor,
                        ),
                      ),
                    )
                  : _buildDefaultAvatar(member.name, member.profileColor),
            ),
            HSpace(Sizes.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name ?? 'Unknown User',
                    style: appCss.dmSansMedium14.textColor(
                      isSelected
                          ? appColor(context).primary
                          : appColor(context).darkText,
                    ),
                  ),
                  if (member.email != null && member.email!.isNotEmpty)
                    Text(
                      member.email!,
                      style: appCss.dmSansRegular12.textColor(
                        appColor(context).lightText,
                      ),
                    ),
                ],
              ),
            ),
            Container(
              width: Sizes.s24,
              height: Sizes.s24,
              decoration: BoxDecoration(
                color: isSelected
                    ? appColor(context).primary
                    : Colors.transparent,
                border: Border.all(
                  color: isSelected
                      ? appColor(context).primary
                      : appColor(context).textFiledBorder,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(Sizes.s12),
              ),
              child: isSelected
                  ? Icon(
                      Icons.check,
                      size: Sizes.s14,
                      color: appColor(context).white,
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
