const { TeamSetting } = require('../models');
const { getActivePlanForTeam } = require('../utils/subscription');

exports.getTeamSettings = async (req, res) => {
  try {
    
    const teamSetting = await TeamSetting.findOne({
      where: { team_id: req.team_id },
    });

    return res.status(201).json({
      teamSetting
    });

  } catch (err) {
    console.error('Error in createTeam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateTeamSetting = async (req, res) => {
  const {
    require_approval_to_join,
    invite_only,
    approved_domains,
    block_all_other_domains,
    invitation_permission,
    email_notifications_enabled,
    direct_join_enabled,
    members_can_create_channels,
    message_retention_days,
    notifications_default,
    public_channel_creation_permission,
    allowed_public_channel_creator_ids,
    private_channel_creation_permission,
    allowed_private_channel_creator_ids,
    channel_creation_limit_per_user,
    file_sharing_access,
    file_sharing_type_scope,
    allowed_file_upload_types,
    allowed_file_upload_member_ids,
    team_file_upload_limit_mb,
    member_file_upload_limit_mb,
    timezone,
    visibility,
    video_calls_enabled,
    audio_calls_enabled,
    audio_messages_enabled,
    screen_sharing_in_calls_enabled,
    maximum_message_length,
    default_theme_mode,
    auto_joined_channel
  } = req.body;

  try {
    const teamSetting = await TeamSetting.findOne({
      where: { team_id: req.team_id },
    });

    if (!teamSetting) {
      return res.status(404).json({ message: "Team setting not found" });
    }

    const activeSubscription = await getActivePlanForTeam(req.team_id);
    const plan = activeSubscription?.plan;

    if (video_calls_enabled && plan && plan.allows_video_calls === false) {
      return res.status(400).json({
        message: "Your plan does not allow enabling video calls.",
      });
    }

    await teamSetting.update({
      require_approval_to_join,
      invite_only,
      approved_domains,
      block_all_other_domains,
      invitation_permission,
      email_notifications_enabled,
      direct_join_enabled,
      members_can_create_channels,
      message_retention_days,
      notifications_default,
      public_channel_creation_permission,
      allowed_public_channel_creator_ids,
      private_channel_creation_permission,
      allowed_private_channel_creator_ids,
      channel_creation_limit_per_user,
      file_sharing_access,
      file_sharing_type_scope,
      allowed_file_upload_types,
      allowed_file_upload_member_ids,
      team_file_upload_limit_mb,
      member_file_upload_limit_mb,
      timezone,
      visibility,
      video_calls_enabled,
      audio_calls_enabled,
      audio_messages_enabled,
      screen_sharing_in_calls_enabled,
      maximum_message_length,
      default_theme_mode,
      auto_joined_channel,
    });

    return res
      .status(200)
      .json({ message: "Team setting updated successfully" });
  } catch (err) {
    console.error("Error in updateTeamSetting:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};