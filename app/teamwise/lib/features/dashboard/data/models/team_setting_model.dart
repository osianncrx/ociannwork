class TeamSettingModel {
  TeamSetting? teamSetting;

  TeamSettingModel({this.teamSetting});

  TeamSettingModel.fromJson(Map<String, dynamic> json) {
    teamSetting = json['teamSetting'] != null
        ? new TeamSetting.fromJson(json['teamSetting'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.teamSetting != null) {
      data['teamSetting'] = this.teamSetting!.toJson();
    }
    return data;
  }
}

class TeamSetting {
  int? id;
  int? teamId;
  bool? requireApprovalToJoin;
  bool? inviteOnly;
  List<dynamic>
  /* String */ ?
  approvedDomains;
  bool? blockAllOtherDomains;
  String? invitationPermission;
  bool? emailNotificationsEnabled;
  bool? directJoinEnabled;
  bool? membersCanCreateChannels;
  int? messageRetentionDays;
  String? notificationsDefault;
  String? publicChannelCreationPermission;
  String? privateChannelCreationPermission;
  int? channelCreationLimitPerUser;
  String? fileSharingAccess;
  String? fileSharingTypeScope;
  int? teamFileUploadLimitMb;
  int? memberFileUploadLimitMb;
  String? timezone;
  String? visibility;
  bool? videoCallsEnabled;
  bool? audioCallsEnabled;
  bool? audioMessagesEnabled;
  bool? screenSharingInCallsEnabled;
  int? maximumMessageLength;
  String? defaultThemeMode;
  String? createdAt;
  String? updatedAt;

  TeamSetting({
    this.id,
    this.teamId,
    this.requireApprovalToJoin,
    this.inviteOnly,
    this.approvedDomains,
    this.blockAllOtherDomains,
    this.invitationPermission,
    this.emailNotificationsEnabled,
    this.directJoinEnabled,
    this.membersCanCreateChannels,
    this.messageRetentionDays,
    this.notificationsDefault,
    this.publicChannelCreationPermission,
    this.privateChannelCreationPermission,
    this.channelCreationLimitPerUser,
    this.fileSharingAccess,
    this.fileSharingTypeScope,
    this.teamFileUploadLimitMb,
    this.memberFileUploadLimitMb,
    this.timezone,
    this.visibility,
    this.videoCallsEnabled,
    this.audioCallsEnabled,
    this.audioMessagesEnabled,
    this.screenSharingInCallsEnabled,
    this.maximumMessageLength,
    this.defaultThemeMode,
    this.createdAt,
    this.updatedAt,
  });

  TeamSetting.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    teamId = json['team_id'];
    requireApprovalToJoin = json['require_approval_to_join'];
    inviteOnly = json['invite_only'];
    approvedDomains = json['approved_domains'];
    blockAllOtherDomains = json['block_all_other_domains'];
    invitationPermission = json['invitation_permission'];
    emailNotificationsEnabled = json['email_notifications_enabled'];
    directJoinEnabled = json['direct_join_enabled'];
    membersCanCreateChannels = json['members_can_create_channels'];
    messageRetentionDays = json['message_retention_days'];
    notificationsDefault = json['notifications_default'];
    publicChannelCreationPermission =
        json['public_channel_creation_permission'];
    privateChannelCreationPermission =
        json['private_channel_creation_permission'];
    channelCreationLimitPerUser = json['channel_creation_limit_per_user'];
    fileSharingAccess = json['file_sharing_access'];
    fileSharingTypeScope = json['file_sharing_type_scope'];
    teamFileUploadLimitMb = json['team_file_upload_limit_mb'];
    memberFileUploadLimitMb = json['member_file_upload_limit_mb'];
    timezone = json['timezone'];
    visibility = json['visibility'];
    videoCallsEnabled = json['video_calls_enabled'];
    audioCallsEnabled = json['audio_calls_enabled'];
    audioMessagesEnabled = json['audio_messages_enabled'];
    screenSharingInCallsEnabled = json['screen_sharing_in_calls_enabled'];
    maximumMessageLength = json['maximum_message_length'];
    defaultThemeMode = json['default_theme_mode'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['id'] = this.id;
    data['team_id'] = this.teamId;
    data['require_approval_to_join'] = this.requireApprovalToJoin;
    data['invite_only'] = this.inviteOnly;
    data['approved_domains'] = this.approvedDomains;
    data['block_all_other_domains'] = this.blockAllOtherDomains;
    data['invitation_permission'] = this.invitationPermission;
    data['email_notifications_enabled'] = this.emailNotificationsEnabled;
    data['direct_join_enabled'] = this.directJoinEnabled;
    data['members_can_create_channels'] = this.membersCanCreateChannels;
    data['message_retention_days'] = this.messageRetentionDays;
    data['notifications_default'] = this.notificationsDefault;
    data['public_channel_creation_permission'] =
        this.publicChannelCreationPermission;
    data['private_channel_creation_permission'] =
        this.privateChannelCreationPermission;
    data['channel_creation_limit_per_user'] = this.channelCreationLimitPerUser;
    data['file_sharing_access'] = this.fileSharingAccess;
    data['file_sharing_type_scope'] = this.fileSharingTypeScope;
    data['team_file_upload_limit_mb'] = this.teamFileUploadLimitMb;
    data['member_file_upload_limit_mb'] = this.memberFileUploadLimitMb;
    data['timezone'] = this.timezone;
    data['visibility'] = this.visibility;
    data['video_calls_enabled'] = this.videoCallsEnabled;
    data['audio_calls_enabled'] = this.audioCallsEnabled;
    data['audio_messages_enabled'] = this.audioMessagesEnabled;
    data['screen_sharing_in_calls_enabled'] = this.screenSharingInCallsEnabled;
    data['maximum_message_length'] = this.maximumMessageLength;
    data['default_theme_mode'] = this.defaultThemeMode;
    data['created_at'] = this.createdAt;
    data['updated_at'] = this.updatedAt;
    return data;
  }
}
