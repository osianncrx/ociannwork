const { Op, fn, col, where: whereFn } = require("sequelize");
const {
  Channel,
  ChannelMember,
  ChannelSetting,
  TeamSetting,
  TeamMember,
  User,
  Team,
  Message,
  sequelize,
  TeamSubscription,
  Plan,
} = require("../models");
const { getRandomColor } = require("../utils/colorUtils");
const path = require("path");
const fs = require("fs");

const canCreateChannel = async (type, userId, teamId, userRole) => {
  const setting = await TeamSetting.findOne({ where: { team_id: teamId } });
  if (!setting) {
    return { allowed: false, message: "Team settings not found" };
  }

  const creationLimit = setting.channel_creation_limit_per_user || 20;
  const createdChannels = await Channel.count({
    where: { created_by: userId, team_id: teamId },
  });

  if (createdChannels >= creationLimit) {
    return {
      allowed: false,
      message: `Channel creation limit (${creationLimit}) reached for this user`,
    };
  }

  const permissionField =
    type === "public" ? setting.public_channel_creation_permission : setting.private_channel_creation_permission;

  const allowedIds =
    type === "public"
      ? setting.allowed_public_channel_creator_ids || []
      : setting.allowed_private_channel_creator_ids || [];

  if (permissionField === "all") return { allowed: true };
  if (permissionField === "admin" && userRole === "admin") return { allowed: true };
  if (permissionField === "specified_members" && allowedIds.includes(userId)) return { allowed: true };

  return {
    allowed: false,
    message: `You don't have permission to create a ${type} channel. Contact your team admin.`,
  };
};

const createSystemMessage = async (req, channelId, teamId, action, metadata = {}) => {
  try {
    let content = "";
    let systemMetadata = {
      system_action: action,
      ...metadata,
    };

    switch (action) {
      case "channel_created":
        const channel = await Channel.findByPk(channelId, {
          include: [{ model: User, as: "creator", attributes: ["name"] }],
        });
        const channelType = channel.type === "public" ? "public" : "private";
        content = `${channel.creator.name} created a ${channelType} channel. ${
          channelType === "private"
            ? "Only invited members can read and post messages here."
            : "Everyone in the team can read and post messages here."
        }`;
        break;

      case "member_added":
        const addedUser = await User.findByPk(metadata.added_user_id, { attributes: ["name"] });
        const adderUser = await User.findByPk(metadata.adder_user_id, { attributes: ["name"] });
        content = `${adderUser.name} added ${addedUser.name}`;
        break;

      case "member_removed":
        const removedUser = await User.findByPk(metadata.removed_user_id, { attributes: ["name"] });
        const removerUser = await User.findByPk(metadata.remover_user_id, { attributes: ["name"] });
        content = `${removerUser.name} removed ${removedUser.name}`;
        break;

      case "member_left":
        const leftUser = await User.findByPk(metadata.user_id, { attributes: ["name"] });
        content = `${leftUser.name} left the channel`;
        break;

      case "channel_updated":
        const updaterUser = await User.findByPk(metadata.updater_user_id, { attributes: ["name"] });
        content = `${updaterUser.name} updated the channel`;
        if (metadata.changes) {
          systemMetadata.changes = metadata.changes;
        }
        break;

      default:
        content = "System message";
    }

    const systemMessage = await Message.create({
      channel_id: channelId,
      team_id: teamId,
      sender_id: metadata.creator_user_id, // Null for system messages
      message_type: "system",
      content: content,
      metadata: systemMetadata,
    });

    // Emit the system message to all channel members
    const io = req.app.get("io"); // Adjust based on your socket setup
    io.to(`channel_${channelId}`).emit("receive-message", systemMessage);

    return systemMessage;
  } catch (error) {
    console.error("Error creating system message:", error);
    return null;
  }
};

exports.getChannelInfo = async (req, res) => {
  try {
    const channelId = req.params.id;

    const channel = await Channel.findByPk(channelId, {
      include: [
        {
          model: ChannelMember,
          as: "members",
          include: [{ model: User, attributes: ["id", "name", "email", "avatar", "profile_color"] }],
        },
        {
          model: ChannelSetting,
          as: "setting",
          attributes: ["channel_id", "allow_posting", "file_sharing", "allow_mentions"],
        },
      ],
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    res.status(200).json({ channel });
  } catch (err) {
    console.error("Get Channel Info Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getChannelMembers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      joined_from,
      joined_to,
      channel_id,
      sort_by = "created_at", // Default sort field
      sort_order = "DESC", // Default sort order
    } = req.query;

    // Validate channel_id is provided
    if (!channel_id) {
      return res.status(400).json({ message: "channel_id is required" });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Base where condition
    const where = {
      channel_id: parseInt(channel_id),
    };

    // Search by user name or email
    if (search) {
      where[Op.or] = [
        { "$User.name$": { [Op.like]: `%${search}%` } },
        { "$User.email$": { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by join date range
    if (joined_from || joined_to) {
      where.created_at = {};
      if (joined_from) where.created_at[Op.gte] = new Date(joined_from);
      if (joined_to) where.created_at[Op.lte] = new Date(joined_to);
    }

    // Define allowed sort fields for database query
    const allowedSortFields = ["created_at", "role", "name", "email", "is_online", "last_seen"];

    let order = [["created_at", "DESC"]]; // Default order

    // If sort_by is an allowed database field, use it in the main query
    if (allowedSortFields.includes(sort_by)) {
      // Handle different sort fields and their database mappings
      switch (sort_by) {
        case "name":
          order = [[User, "name", sort_order.toUpperCase()]];
          break;
        case "email":
          order = [[User, "email", sort_order.toUpperCase()]];
          break;
        case "is_online":
          order = [[User, "is_online", sort_order.toUpperCase()]];
          break;
        case "last_seen":
          order = [[User, "last_seen", sort_order.toUpperCase()]];
          break;
        default:
          // For created_at and role which are direct fields of ChannelMember
          order = [[sort_by, sort_order.toUpperCase()]];
          break;
      }

      // Add secondary sort by created_at for consistent ordering
      if (sort_by !== "created_at") {
        order.push(["created_at", "DESC"]);
      }
    }

    // Fetch channel members with user details
    const { rows: members, count: total } = await ChannelMember.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "avatar", "profile_color", "is_online", "last_seen", "is_away", "status"],
        },
        {
          model: Channel,
          attributes: ["id", "name"],
          as: "Channel",
        },
      ],
      order: order,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format the response
    const formattedMembers = members.map((member) => ({
      id: member.id,
      channel_id: member.channel_id,
      channel_name: member.Channel?.name,
      user: {
        id: member.User.id,
        name: member.User.name,
        email: member.User.email,
        avatar: member.User.avatar,
        profile_color: member.User.profile_color,
        is_online: member.User.is_online,
        last_seen: member.User.last_seen,
        is_away: member.User.is_away,
        status: member.User.status,
      },
      role: member.role,
      joined_at: member.created_at,
      updated_at: member.updated_at,
    }));

    return res.status(200).json({
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
      members: formattedMembers,
    });
  } catch (err) {
    console.error("Get Channel Members Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createChannel = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const io = req.app.get("io");
    const { name, description, type = "public", member_ids = [] } = req.body;
    const created_by = req.user.id;
    const team_id = req.team_id;
    const team_role = req.team_role;

    // Validate permission with message
    const { allowed, message } = await canCreateChannel(type, created_by, team_id, team_role);
    if (!allowed) {
      await transaction.rollback();
      return res.status(403).json({ message });
    }

    // Get active subscription
    const activeSubscription = await TeamSubscription.findOne({
      where: {
        team_id,
        status: "active",
        expiry_date: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: Plan,
          as: "plan",
        },
      ],
      transaction,
    });

    if (!activeSubscription) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Team does not have an active subscription",
      });
    }

    const plan = activeSubscription.plan;

    // Check total channels count against plan limit
    const totalChannels = await Channel.count({
      where: { team_id },
      transaction,
    });

    if (totalChannels >= plan.max_channels) {
      await transaction.rollback();
      return res.status(403).json({
        message: `Channel limit reached. Maximum ${plan.max_channels} channels allowed on your plan`,
        current: totalChannels,
        limit: plan.max_channels,
      });
    }

    // Check for private channel if type is private
    if (type === "private" && !plan.allows_private_channels) {
      await transaction.rollback();
      return res.status(403).json({
        message: "Private channels are not available on your plan",
        feature: "private_channels",
      });
    }

    const profileColor = getRandomColor();

    const channel = await Channel.create(
      {
        name,
        profile_color: profileColor,
        description,
        type,
        team_id,
        created_by,
      },
      { transaction },
    );

    // Add creator as admin
    await ChannelMember.create(
      {
        channel_id: channel.id,
        user_id: created_by,
        role: "admin",
      },
      { transaction },
    );

    await ChannelSetting.create(
      {
        channel_id: channel.id,
        allow_posting: "all",
        file_sharing: plan.allows_file_sharing ? "all" : "disabled",
        allow_mentions: "all",
        message_retention_days: 90,
      },
      { transaction },
    );

    // Add other members as regular members
    const allMembers = [...new Set(member_ids), created_by];
    const uniqueMembers = [...new Set(member_ids)].filter((id) => id !== created_by);

    for (const id of uniqueMembers) {
      // Check if user is active team member
      const isActiveTeamMember = await TeamMember.findOne({
        where: {
          team_id,
          user_id: id,
          status: "active",
        },
        transaction,
      });

      if (isActiveTeamMember) {
        await ChannelMember.findOrCreate({
          where: { channel_id: channel.id, user_id: id },
          defaults: { role: "member" },
          transaction,
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    // Create system message for channel creation
    await createSystemMessage(req, channel.id, team_id, "channel_created", {
      creator_user_id: created_by,
      channel_type: type,
    });

    // Emit socket events
    allMembers.forEach((member) => io.to(`user_${member}`).emit("new-channel", channel));

    res.status(201).json({
      message: "Channel created successfully",
      channel,
      subscription: {
        plan: plan.name,
        max_channels: plan.max_channels,
        allows_private_channels: plan.allows_private_channels,
        allows_video_calls: plan.allows_video_calls,
        allows_file_sharing: plan.allows_file_sharing,
      },
    });
  } catch (err) {
    // Rollback transaction if it exists
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Create Channel Error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "A channel with this name already exists in this team",
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.getChannelsByTeam = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type = "", sort_by = "created_at", sort_order = "DESC" } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = { team_id: req.team_id };

    if (type) {
      whereClause.type = type;
    }

    if (search) {
      whereClause[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { description: { [Op.like]: `%${search}%` } }];
    }

    // Define allowed sort fields
    const allowedSortFields = ["created_at", "name", "type", "updated_at"];

    let orderClause = [["created_at", "DESC"]]; // Default order

    // If sort_by is an allowed field, use it
    if (allowedSortFields.includes(sort_by)) {
      orderClause = [[sort_by, sort_order.toUpperCase()]];

      // Add secondary sort for consistent ordering
      if (sort_by !== "created_at") {
        orderClause.push(["created_at", "DESC"]);
      }
    }

    const { count, rows: channels } = await Channel.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ChannelMember,
          as: "members",
          include: [
            {
              model: User,
              attributes: ["id", "name", "email", "avatar", "profile_color"],
            },
          ],
        },
        {
          model: ChannelSetting,
          as: "setting",
          attributes: ["channel_id", "allow_posting", "file_sharing", "allow_mentions"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    // Get counts for tabs
    const totalCount = await Channel.count({ where: { team_id: req.team_id } });
    const publicCount = await Channel.count({
      where: { team_id: req.team_id, type: "public" },
    });
    const privateCount = await Channel.count({
      where: { team_id: req.team_id, type: "private" },
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      channels,
      total: count,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      counts: {
        total: totalCount,
        public: publicCount,
        private: privateCount,
      },
    });
  } catch (err) {
    console.error("Get Channels Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const { name, description, type, remove_avatar, id } = req.body;
    const requestingUserId = req.user.id;
    const team_id = req.team_id;

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const channelMember = await ChannelMember.findOne({
      where: { channel_id: id, user_id: requestingUserId },
    });

    if (req.user.role !== "super_admin" && (!channelMember || channelMember.role !== "admin")) {
      return res.status(403).json({
        message: "Only channel admins or super admins can update the channel",
      });
    }

    let avatar = channel.avatar; // Keep existing avatar by default

    // Handle avatar removal
    if (remove_avatar === "true") {
      if (channel.avatar) {
        const oldAvatarPath = path.join(__dirname, "..", channel.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (error) {
            console.error("Error deleting old channel avatar:", error);
          }
        }
      }
      avatar = null;
    }
    // Handle new avatar upload
    else if (req.file) {
      if (channel.avatar) {
        const oldAvatarPath = path.join(__dirname, "..", channel.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (error) {
            console.error("Error deleting old channel avatar:", error);
          }
        }
      }
      avatar = `/uploads/channel-avatars/${req.file.filename}`;
    }

    const changes = [];
    if (name !== undefined && name !== channel.name) {
      changes.push(`changed the channel name from "${channel.name}" to "${name}"`);
    }
    if (description !== undefined && description !== channel.description) {
      changes.push(`updated the channel description`);
    }
    if (type !== undefined && type !== channel.type) {
      changes.push(`changed the channel type from "${channel.type}" to "${type}"`);
    }
    if (avatar !== channel.avatar) {
      if (remove_avatar === "true") {
        changes.push(`removed the channel icon`);
      } else if (req.file) {
        changes.push(`updated the channel icon`);
      }
    }

    await channel.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      avatar: avatar,
    });

    if (changes.length > 0) {
      await createSystemMessage(req, id, team_id, "channel_updated", {
        updater_user_id: requestingUserId,
        changes: changes,
        creator_user_id: requestingUserId,
        channel_type: type || channel.type,
      });
    }

    res.status(200).json({ message: "Channel updated successfully", channel });
  } catch (err) {
    console.error("Update Channel Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const { ids } = req.body;
    const requestingUserId = req.user.id;
    const teamRole = req.team_role;
    const userRole = req.user.role;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "An array of channel IDs is required" });
    }

    const transaction = await Channel.sequelize.transaction();

    try {
      const channels = await Channel.findAll({
        where: { id: ids },
        transaction,
      });

      const foundChannelIds = channels.map((channel) => channel.id);
      const missingIds = ids.filter((id) => !foundChannelIds.includes(id));
      if (missingIds.length > 0) {
        await transaction.rollback();
        return res.status(404).json({ message: `Channels not found: ${missingIds.join(", ")}` });
      }

      if (userRole !== "super_admin" && teamRole !== "admin") {
        const channelMembers = await ChannelMember.findAll({
          where: {
            channel_id: ids,
            user_id: requestingUserId,
            role: "admin",
          },
          transaction,
        });

        const adminChannelIds = channelMembers.map((member) => member.channel_id);
        const nonAdminChannelIds = ids.filter((id) => !adminChannelIds.includes(id));

        if (nonAdminChannelIds.length > 0) {
          await transaction.rollback();
          return res.status(403).json({
            message: `Only channel admins can delete these channels: ${nonAdminChannelIds.join(", ")}`,
          });
        }
      }

      const members = await ChannelMember.findAll({
        where: { channel_id: ids },
        attributes: ["user_id", "channel_id"],
        transaction,
      });

      const membersByChannel = members.reduce((acc, member) => {
        const channelId = member.channel_id;
        if (!acc[channelId]) {
          acc[channelId] = [];
        }
        acc[channelId].push(member.user_id);
        return acc;
      }, {});

      await ChannelMember.destroy({
        where: { channel_id: ids },
        transaction,
      });

      await Channel.destroy({
        where: { id: ids },
        transaction,
      });

      await transaction.commit();

      const io = req.app.get("io");
      channels.forEach((channel) => {
        const payload = {
          id: channel.id,
          name: channel.name,
        };
        const channelMemberIds = membersByChannel[channel.id] || [];
        channelMemberIds.forEach((userId) => {
          io.to(`user_${userId}`).emit("channel-deleted", payload);
        });
      });

      res.status(200).json({ message: "Channels deleted successfully" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Delete Channels Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addMembersToChannel = async (req, res) => {
  try {
    const { channel_id, members } = req.body;
    const { id: requestingUserId } = req.user;
    const team_id = req.team_id;

    // Input validation
    if (!channel_id) {
      return res.status(400).json({ message: "Channel ID is required" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members array is required and cannot be empty" });
    }

    // Validate each member object
    for (const member of members) {
      if (!member.user_id) {
        return res.status(400).json({ message: "Each member must have a user_id" });
      }
    }

    // Check if channel exists and belongs to team
    const channel = await Channel.findOne({
      where: {
        id: channel_id,
        team_id: team_id,
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found or doesn't belong to this team" });
    }

    // Check if requester is a member of the channel
    const requester = await ChannelMember.findOne({
      where: { channel_id, user_id: requestingUserId },
    });

    if (!requester) {
      return res.status(403).json({ message: "You are not a member of this channel" });
    }

    // Get requester info for notifications
    const requesterUser = await User.findByPk(requestingUserId, {
      attributes: ["id", "name", "avatar", "profile_color"],
    });

    const added = [];
    const skipped = [];
    const deactivated = [];

    // Extract user IDs from members array and remove duplicates
    const uniqueUserIds = [...new Set(members.map((member) => member.user_id))];

    // Check team membership status for all users - only get active team members
    const teamMembers = await TeamMember.findAll({
      where: {
        team_id,
        user_id: uniqueUserIds,
        status: "active", // Only get active team members
      },
    });

    // Create a set for faster lookup of active team members
    const activeTeamMemberIds = new Set(teamMembers.map((tm) => tm.user_id));

    // Get existing channel members to avoid duplicates
    const existingMembers = await ChannelMember.findAll({
      where: {
        channel_id,
        user_id: uniqueUserIds,
      },
    });

    const existingMemberIds = new Set(existingMembers.map((em) => em.user_id));

    // Process each member
    for (const member of members) {
      const { user_id, role = "member" } = member;

      // Check if user is already a channel member
      if (existingMemberIds.has(parseInt(user_id))) {
        skipped.push(user_id);
        continue;
      }

      // Check if user is an active team member
      if (!activeTeamMemberIds.has(parseInt(user_id))) {
        deactivated.push({ user_id, reason: "Not an active team member" });
        continue;
      }

      try {
        // Create new channel member
        await ChannelMember.create({
          channel_id,
          user_id,
          role: role || "member",
        });

        added.push({ user_id, role: role || "member" });

        try {
          // Make sure createSystemMessage function exists and is imported
          if (typeof createSystemMessage === "function") {
            await createSystemMessage(req, channel_id, team_id, "member_added", {
              adder_user_id: requestingUserId,
              added_user_id: user_id,
              creator_user_id: requestingUserId,
            });
          }
        } catch (systemMsgError) {
          console.error(`Error creating system message for user ${user_id}:`, systemMsgError);
          // Don't fail the entire operation if system message creation fails
        }
      } catch (error) {
        console.error(`Error adding user ${user_id} to channel:`, error);
        skipped.push(user_id);
      }
    }

    // Emit events, send notifications if members were added
    if (added.length > 0) {
      try {
        const io = req.app.get("io");

        if (io) {
          // Get updated channel members with user details
          const updatedMembers = await ChannelMember.findAll({
            where: { channel_id },
            include: [
              {
                model: User,
                as: "User",
                attributes: ["id", "avatar", "profile_color", "name", "email"],
              },
            ],
          });

          const fullChannelPayload = {
            id: parseInt(channel_id),
            name: channel.name,
            description: channel.description || null,
            type: channel.type,
            avatar: channel.avatar || null,
            created_at: channel.created_at,
            updated_at: channel.updated_at,
            members: updatedMembers,
          };

          io.to(`channel_${channel_id}`).emit("member-added-to-channel", {
            channelId: channel_id,
            userIds: added.map((m) => m.user_id),
            addedBy: requestingUserId,
            channel: fullChannelPayload,
          });

          for (const member of added) {
            io.to(`user_${member.user_id}`).emit("channel-added", fullChannelPayload);

            if (member.role === "admin") {
              io.to(`channel_${channel_id}`).emit("member-role-updated", {
                channelId: channel_id,
                userId: member.user_id,
                newRole: "admin",
              });
            }
          }
        }

        // Send push notifications to added members
        await sendChannelInviteNotifications({
          channel,
          addedMembers: added,
          addedBy: requesterUser,
          team_id,
        });
      } catch (error) {
        console.error("Error emitting socket events or sending notifications:", error);
        // Don't fail the entire request if socket emission fails
      }
    }

    res.status(200).json({
      message: "Members processed successfully",
      added,
      skipped,
      deactivated,
      summary: {
        totalRequested: members.length,
        added: added.length,
        skipped: skipped.length,
        deactivated: deactivated.length,
      },
    });
  } catch (err) {
    console.error("Add Members Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function sendChannelInviteNotifications({ channel, addedMembers, addedBy, team_id }) {
  try {
    // Get player_ids for all added members
    const addedUserIds = addedMembers.map((member) => member.user_id);

    const recipients = await User.findAll({
      where: {
        id: addedUserIds,
        player_id: {
          [Op.ne]: null, // Only users with player_id
        },
      },
      attributes: ["id", "player_id", "name"],
    });

    if (recipients.length === 0) return;

    const playerIds = recipients.map((user) => user.player_id).filter(Boolean);

    // Prepare notification content
    const notificationTitle = "Channel Invitation";
    let notificationBody = "";

    if (addedMembers.length === 1) {
      notificationBody = `${addedBy.name} added you to #${channel.name}`;
    } else {
      notificationBody = `${addedBy.name} added you and ${addedMembers.length - 1} others to #${channel.name}`;
    }

    // Prepare notification data for deep linking
    const additionalData = {
      type: "channel_invite",
      channel_id: channel.id,
      channel_name: channel.name,
      channel_type: channel.type,
      added_by_id: addedBy.id,
      added_by_name: addedBy.name,
      team_id: team_id,
      timestamp: new Date().toISOString(),
      // Add role information if needed
      role: addedMembers.length === 1 ? addedMembers[0].role : "member",
    };

    // Send notification using your existing OneSignal utility
    const result = await onesignal.sendToUsers(playerIds, notificationTitle, notificationBody, additionalData);

    if (result.success) {
      console.log("✅ Channel invite notifications sent successfully to", playerIds.length, "users");
    } else {
      console.error("❌ Failed to send channel invite notifications:", result.error);
    }
  } catch (error) {
    console.error("❌ Error sending channel invite notifications:", error);
  }
}

exports.removeMemberFromChannel = async (req, res) => {
  try {
    let { channel_id, user_id, user_ids, id } = req.body;
    channel_id = channel_id || id;
    const requestingUserId = req.user.id;
    const team_id = req.team_id;

    if (!channel_id) {
      return res.status(400).json({ message: "Channel ID is required" });
    }

    user_ids = user_ids || (user_id ? [user_id] : []);
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: "At least one user ID is required" });
    }

    const isTeamAdmin = req.team_role === "admin";

    let isChannelAdmin = false;
    let requester = null;
    if (!isTeamAdmin) {
      requester = await ChannelMember.findOne({
        where: { channel_id, user_id: requestingUserId },
      });
      if (!requester) {
        return res.status(403).json({ message: "You are not a member of this channel" });
      }
      isChannelAdmin = requester.role === "admin";
      if (!isChannelAdmin) {
        return res.status(403).json({ message: "Only channel admins can remove members" });
      }
    }

    const transaction = await ChannelMember.sequelize.transaction();

    try {
      const removedUserIds = [];
      for (const currentUserId of user_ids) {
        const member = await ChannelMember.findOne({
          where: { channel_id, user_id: currentUserId },
          transaction,
        });
        if (!member) {
          console.warn(`Member not found for user_id: ${currentUserId}`);
          continue;
        }

        await createSystemMessage(req, channel_id, team_id, "member_removed", {
          remover_user_id: requestingUserId,
          removed_user_id: currentUserId,
          creator_user_id: requestingUserId,
        });

        await ChannelMember.destroy({
          where: { channel_id, user_id: currentUserId },
          transaction,
        });

        removedUserIds.push(currentUserId);
      }
      const adminsLeft = await ChannelMember.count({
        where: { channel_id, role: "admin" },
        transaction,
      });

      if (adminsLeft === 0) {
        const remainingMembers = await ChannelMember.findAll({
          where: { channel_id },
          include: [
            {
              model: User,
              attributes: ["id"],
              include: [
                {
                  model: TeamMember,
                  where: { team_id: req.team_id },
                  required: false,
                },
              ],
            },
          ],
          transaction,
        });

        if (remainingMembers.length > 0) {
          let newAdmin = remainingMembers.find((m) => m.User.TeamMembers?.some((tm) => tm.role === "admin"));
          if (!newAdmin) newAdmin = remainingMembers[0];

          if (newAdmin) {
            await newAdmin.update({ role: "admin" }, { transaction });
          }
        }
      }

      await transaction.commit();

      const io = req.app.get("io");

      removedUserIds.forEach((removedUserId) => {
        io.to(`user_${removedUserId}`).emit("member-removed-from-channel", {
          channelId: channel_id,
          userId: removedUserId,
        });

        io.to(`channel_${channel_id}`).emit("member-removed-from-channel", {
          channelId: channel_id,
          userId: removedUserId,
        });
      });

      const message =
        removedUserIds.length > 1
          ? `${removedUserIds.length} members removed from channel`
          : "Member removed from channel";
      res.status(200).json({ message });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Remove Member Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.leaveChannel = async (req, res) => {
  try {
    const { channel_id } = req.body;
    const { id: userId } = req.user;
    const team_id = req.team_id;

    const member = await ChannelMember.findOne({ where: { channel_id, user_id: userId } });
    if (!member) return res.status(404).json({ message: "You are not a member of this channel" });

    // Create system message before leaving
    await createSystemMessage(req, channel_id, team_id, "member_left", {
      user_id: userId,
      creator_user_id: userId,
    });

    // Remove the member
    await ChannelMember.destroy({ where: { channel_id, user_id: userId } });

    // Check if any admin remains if the leaving user was an admin
    let newAdminPromoted = null;
    if (member.role === "admin") {
      const adminsLeft = await ChannelMember.count({
        where: { channel_id, role: "admin" },
      });

      if (adminsLeft === 0) {
        // Promote another member to admin
        const remainingMember = await ChannelMember.findOne({
          where: { channel_id },
          order: [["created_at", "ASC"]],
          include: [{ model: User, as: "User" }],
        });

        if (remainingMember) {
          await remainingMember.update({ role: "admin" });
          newAdminPromoted = {
            userId: remainingMember.user_id,
            newRole: "admin",
          };
        }
      }
    }

    const io = req.app.get("io");

    // Emit to the channel (all remaining members) that someone left
    io.to(`channel_${channel_id}`).emit("member-left-channel", {
      channelId: channel_id,
      userId: userId,
    });

    if (newAdminPromoted) {
      io.to(`channel_${channel_id}`).emit("member-role-updated", {
        channelId: channel_id,
        userId: newAdminPromoted.userId,
        newRole: newAdminPromoted.newRole,
      });
    }

    io.to(`user_${userId}`).emit("channel-left", {
      channelId: channel_id,
      userId: userId,
    });

    res.status(200).json({ message: "You have left the channel" });
  } catch (err) {
    console.error("Leave Channel Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.changeMemberRole = async (req, res) => {
  try {
    const { channel_id, user_id, new_role } = req.body;
    const { id: requestingUserId } = req.user;

    if (!["admin", "member"].includes(new_role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const requester = await ChannelMember.findOne({
      where: { channel_id, user_id: requestingUserId },
    });

    let isAuthorized = false;

    if (requester && requester.role === "admin") {
      isAuthorized = true;
    } else {
      const channel = await Channel.findByPk(channel_id);

      if (channel) {
        const teamMember = await TeamMember.findOne({
          where: {
            team_id: channel.team_id,
            user_id: requestingUserId,
          },
        });

        if (teamMember && teamMember.role === "admin") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Only channel admins or team admins can change roles",
      });
    }

    const member = await ChannelMember.findOne({
      where: { channel_id, user_id },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found in channel" });
    }

    if (member.role === "admin" && new_role !== "admin") {
      const adminCount = await ChannelMember.count({
        where: { channel_id, role: "admin" },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last admin",
        });
      }
    }

    await member.update({ role: new_role });

    const io = req.app.get("io");
    io.to(`channel_${channel_id}`).emit("member-role-updated", {
      channelId: channel_id,
      userId: user_id,
      newRole: new_role,
    });

    res.status(200).json({
      message: "Role updated successfully",
      data: {
        user_id,
        channel_id,
        new_role,
      },
    });
  } catch (err) {
    console.error("Change Role Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin
exports.getAllChannels = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      created_by,
      created_from,
      created_to,
      min_size,
      max_size,
      team_id,
      sort_by = "created_at", // Default sort field
      sort_order = "DESC", // Default sort order
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Base where condition
    const where = {};

    // Search Channel name
    if (search) {
      where[Op.or] = [
        whereFn(fn("LOWER", col("Channel.name")), {
          [Op.like]: `%${search.toLowerCase()}%`,
        }),
      ];
    }

    // Filter by creator
    if (created_by) {
      where.created_by = created_by;
    }

    if (team_id) {
      where.team_id = team_id;
    }

    // Filter by date range
    if (created_from || created_to) {
      where.created_at = {};
      if (created_from) where.created_at[Op.gte] = new Date(created_from);
      if (created_to) where.created_at[Op.lte] = new Date(created_to);
    }

    // Define allowed sort fields for database query
    const allowedDbSortFields = ["created_at", "name"];
    let dbOrder = [["created_at", "DESC"]]; // Default order

    // If sort_by is an allowed database field, use it in the main query
    if (allowedDbSortFields.includes(sort_by)) {
      dbOrder = [[sort_by, sort_order.toUpperCase()]];
    }

    // Fetch channels with creator & settings
    const { rows: channels, count: total } = await Channel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email", "profile_color", "avatar"],
        },
        {
          model: Team,
          as: "team",
          attributes: ["id", "name"],
        },
      ],
      order: dbOrder,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Enrich with channel size and admin(s)
    const enriched = await Promise.all(
      channels.map(async (channel) => {
        const members = await ChannelMember.findAll({
          where: { channel_id: channel.id },
          include: [
            {
              model: User,
              attributes: ["id", "name", "email", "avatar", "profile_color"],
            },
          ],
        });

        const totalMembers = members.length;

        const admins = members
          .filter((m) => m.role === "admin" && m.User)
          .map((m) => ({
            id: m.User.id,
            name: m.User.name,
            email: m.User.email,
          }));

        return {
          id: channel.id,
          name: channel.name,
          avatar: channel.avatar,
          profile_color: channel.profile_color,
          description: channel.description,
          created_at: channel.created_at,
          created_by: channel.creator
            ? {
                id: channel.creator.id,
                name: channel.creator.name,
                email: channel.creator.email,
              }
            : null,
          total_members: totalMembers,
          team: channel.team
            ? {
                id: channel.team.id,
                name: channel.team.name,
              }
            : null,
          admins,
        };
      }),
    );

    // Apply channel size filtering
    let filtered = enriched;
    if (min_size || max_size) {
      filtered = enriched.filter((channel) => {
        if (min_size && channel.total_members < parseInt(min_size)) return false;
        if (max_size && channel.total_members > parseInt(max_size)) return false;
        return true;
      });
    }

    // Apply sorting for computed fields (total_members, etc.)
    const allowedComputedSortFields = ["total_members", "name", "created_at"];
    let finalChannels = filtered;

    if (allowedComputedSortFields.includes(sort_by)) {
      finalChannels = filtered.sort((a, b) => {
        let aValue = a[sort_by];
        let bValue = b[sort_by];

        // Handle string comparison for name field
        if (sort_by === "name") {
          aValue = aValue?.toLowerCase() || "";
          bValue = bValue?.toLowerCase() || "";
        }

        if (sort_order.toUpperCase() === "ASC") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return res.status(200).json({
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      channels: finalChannels,
    });
  } catch (err) {
    console.error("Error in getAllChannels:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
