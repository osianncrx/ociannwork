const { Op, Sequelize } = require("sequelize");
const {
  Message,
  ChannelSetting,
  ChannelMember,
  MessageStatus,
  MessageReaction,
  User,
  Channel,
  PinnedConversation,
  MutedChat,
  MessagePin,
  MessageFavorite,
  TeamMember,
} = require("../models");
const { getActivePlanForTeam, checkStorageLimit } = require("../utils/subscription");
const onesignal = require("../utils/onesignal");

async function canPostMessage(userId, channelId) {
  const channelSetting = await ChannelSetting.findOne({ where: { channel_id: channelId } });
  if (!channelSetting) return false;

  if (channelSetting.allow_posting === "all") return true;

  if (channelSetting.allow_posting === "admin") {
    const membership = await ChannelMember.findOne({
      where: { channel_id: channelId, user_id: userId, role: "admin" },
    });
    return !!membership;
  }

  return false;
}

exports.createMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const files = req.files || [];
    const singleFile = req.file;

    let {
      recipient_id,
      channel_id,
      content,
      message_type = "text",
      metadata = null,
      file_type = null,
      parent_id,
      mentions,
      file_url = null,
      is_encrypted = false,
    } = req.body;

    if (!senderId || (!recipient_id && !channel_id)) {
      return res.status(400).json({ error: "Missing recipient or channel." });
    }

    const hasFiles = files.length > 0 || singleFile;
    const hasContent = content && content.trim() && content !== '""' && content !== "{}";
    const isLocationMessage = message_type === "location";

    // Check if file sharing is enabled in plan when files are being uploaded
    if (hasFiles) {
      const activeSubscription = await getActivePlanForTeam(req.team_id);
      const plan = activeSubscription?.plan;
      
      if (plan && plan.allows_file_sharing === false) {
        return res.status(403).json({
          message: "File sharing is not available in your current plan. Please upgrade to enable this feature.",
        });
      }

      // Check storage limit before uploading files
      const fileSizes = files.length > 0 
        ? files.map(f => f.size) 
        : singleFile 
          ? [singleFile.size] 
          : [];
      
      if (fileSizes.length > 0) {
        const storageCheck = await checkStorageLimit(req.team_id, fileSizes);
        
        if (!storageCheck.allowed) {
          return res.status(403).json({
            message: storageCheck.message || "Storage limit exceeded. Please upgrade your plan or delete some files.",
            error: "STORAGE_LIMIT_EXCEEDED",
            current_usage_mb: storageCheck.currentUsageMB,
            max_storage_mb: storageCheck.maxStorageMB,
            new_usage_mb: storageCheck.newUsageMB,
          });
        }
      }
    }

    if (!hasContent && !hasFiles && !file_url && !isLocationMessage) {
      return res.status(400).json({ error: "Message content, file, file_url, or location is required." });
    }

    if (channel_id) {
      const allowed = await canPostMessage(senderId, channel_id);
      if (!allowed) {
        return res.status(403).json({ message: "You do not have permission to post in this channel." });
      }
    }

    let validatedMentions = [];
    if (mentions && mentions.length > 0) {
      const validUsers = await User.findAll({
        where: { id: mentions },
        attributes: ["id"],
      });
      validatedMentions = validUsers.map((user) => user.id);
    }

    let messages = [];

    // Handle multiple files
    if (files && files.length > 0) {
      for (const file of files) {
        const fileType = getFileTypeFromMime(file.mimetype);
        let messageContent = null;
        if (hasContent) {
          messageContent = content || getDefaultContentForFileType(fileType);
        } else {
          messageContent = null;
        }

        // Parse existing metadata if it's a string
        let parsedMetadata = {};
        if (metadata) {
          parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
        }

        const message = await Message.create({
          sender_id: senderId,
          recipient_id: recipient_id || null,
          channel_id: channel_id || null,
          team_id: req.team_id,
          content: messageContent,
          message_type: fileType,
          metadata: {
            original_filename: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            is_multiple: files.length > 1,
            file_index: messages.length,
            ...parsedMetadata,
          },
          file_url: `/uploads/messages/team_${req.team_id}/${file.filename}`,
          file_type: file.mimetype,
          parent_id,
          mentions: validatedMentions,
          is_encrypted: is_encrypted === true || is_encrypted === "true",
        });
        messages.push(message);
      }
    }
    // Handle single file
    else if (singleFile) {
      const fileType = getFileTypeFromMime(singleFile.mimetype);
      let messageContent = null;
      if (hasContent) {
        messageContent = content || getDefaultContentForFileType(fileType);
      } else {
        messageContent = null;
      }
      const message = await Message.create({
        sender_id: senderId,
        recipient_id: recipient_id || null,
        channel_id: channel_id || null,
        team_id: req.team_id,
        content: messageContent,
        message_type: fileType,
        metadata: {
          original_filename: singleFile.originalname,
          file_size: singleFile.size,
          mime_type: singleFile.mimetype,
          ...metadata,
        },
        file_url: `/uploads/messages/team_${req.team_id}/${singleFile.filename}`,
        file_type: singleFile.mimetype,
        parent_id,
        mentions: validatedMentions,
        is_encrypted: is_encrypted === true || is_encrypted === "true",
      });
      messages.push(message);
    }
    // Handle stickers
    else if (message_type === "sticker") {
      const message = await Message.create({
        sender_id: senderId,
        recipient_id: recipient_id || null,
        channel_id: channel_id || null,
        team_id: req.team_id,
        content: content || "Sticker",
        message_type: "sticker",
        file_url: `/images/sticker/${req.body.file_url}`,
        file_type: message_type,
        metadata,
        parent_id,
        mentions: validatedMentions,
        is_encrypted: is_encrypted === true || is_encrypted === "true",
      });
      messages.push(message);
    }
    // Handle location messages
    else if (message_type === "location") {
      // Parse metadata if it's a string (from FormData)
      let locationMetadata = metadata;
      if (typeof metadata === "string") {
        try {
          locationMetadata = JSON.parse(metadata);
        } catch (e) {
          console.error("Failed to parse location metadata:", e);
          locationMetadata = {};
        }
      }

      const message = await Message.create({
        sender_id: senderId,
        recipient_id: recipient_id || null,
        channel_id: channel_id || null,
        team_id: req.team_id,
        content: locationMetadata?.address || "Location",
        message_type: "location",
        metadata: locationMetadata,
        file_url: null,
        file_type: null,
        parent_id,
        mentions: validatedMentions,
        is_encrypted: is_encrypted === true || is_encrypted === "true",
      });
      messages.push(message);
    }
    // Handle text
    else {
      // Parse metadata if it's a string (from FormData)
      let parsedMetadata = metadata;
      if (typeof metadata === "string") {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          // If parsing fails, keep original metadata
          parsedMetadata = metadata;
        }
      }

      const message = await Message.create({
        sender_id: senderId,
        recipient_id: recipient_id || null,
        channel_id: channel_id || null,
        team_id: req.team_id,
        content: content || null,
        message_type,
        metadata: parsedMetadata,
        file_url: file_url || null,
        file_type: file_type || null,
        parent_id,
        mentions: validatedMentions,
        is_encrypted: is_encrypted === true || is_encrypted === "true",
      });
      messages.push(message);
    }

    // Get sender info for notifications
    const sender = await User.findByPk(senderId, {
      attributes: ["id", "name", "avatar", "profile_color"],
    });

    // Create message statuses for all messages and collect recipients for notifications
    const notificationRecipients = new Set();

    for (const message of messages) {
      const recipients = [];

      if (message.mentions && message.mentions.length > 0) {
        // This message has mentions, so it has unread mentions
        await message.update({ has_unread_mentions: true });
      }
      if (recipient_id) {
        recipients.push(recipient_id);
        notificationRecipients.add(recipient_id);
      } else if (channel_id) {
        // Permission already checked above, now just get members
        const members = await ChannelMember.findAll({
          where: {
            channel_id: channel_id,
            user_id: { [Op.ne]: senderId },
          },
          attributes: ["user_id"],
          raw: true,
        });
        members.forEach((m) => {
          recipients.push(m.user_id);
          notificationRecipients.add(m.user_id);
        });
      }

      // Bulk create message statuses
      const statusData = recipients.map((uid) => ({
        message_id: message.id,
        user_id: uid,
        status: "sent",
      }));

      await MessageStatus.bulkCreate(statusData);
    }

    const fullMessages = await Promise.all(
      messages.map((message) =>
        Message.findByPk(message.id, {
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "name", "avatar", "profile_color"],
            },
            {
              model: User,
              as: "recipient",
              attributes: ["id", "name", "avatar", "profile_color"],
              required: false,
            },
            {
              model: Message,
              as: "parent",
              attributes: [
                "id",
                "sender_id",
                "recipient_id",
                "channel_id",
                "team_id",
                "content",
                "message_type",
                "file_url",
                "file_type",
                "metadata",
                "mentions",
                "created_at",
                "updated_at",
                "deleted_at",
              ],
              required: false,
              include: [
                {
                  model: User,
                  as: "sender",
                  attributes: ["id", "name", "avatar", "profile_color"],
                  required: false,
                },
                {
                  model: User,
                  as: "recipient",
                  attributes: ["id", "name", "avatar", "profile_color"],
                  required: false,
                },
                {
                  model: MessageStatus,
                  as: "statuses",
                  attributes: ["user_id", "status", "updated_at"],
                  required: false,
                },
                {
                  model: MessageReaction,
                  as: "reaction",
                  attributes: ["user_id", "emoji"],
                  required: false,
                },
                {
                  model: MessageFavorite,
                  as: "favorites",
                  where: { user_id: senderId },
                  required: false,
                  attributes: ["id"],
                },
                {
                  model: MessagePin,
                  as: "pins",
                  required: false,
                  attributes: ["pinned_by"],
                },
              ],
            },
          ],
        })
      )
    );

    // Emit via Socket.IO
    const io = req.app.get("io");

    for (const fullMessage of fullMessages) {
      if (recipient_id) {
        const isPersonalMessage = senderId == recipient_id;
        if (isPersonalMessage) {
          io.to(`user_${senderId}`).emit("receive-message", fullMessage);
        } else {
          io.to(`user_${senderId}`).emit("receive-message", fullMessage);
          io.to(`user_${recipient_id}`).emit("receive-message", fullMessage);
        }

        io.to(`user_${senderId}`).emit("message-status-updated", {
          messageId: fullMessage.id,
          status: "sent",
        });
      } else if (channel_id) {
        io.to(`channel_${channel_id}`).emit("receive-message", fullMessage);
      }
    }

    // Send push notifications to recipients (excluding sender)
    if (notificationRecipients.size > 0) {
      await sendPushNotifications({
        sender,
        message: fullMessages[0], // Use the first message for notification content
        recipientIds: Array.from(notificationRecipients),
        channel_id,
        recipient_id,
      });
    }

    return res.status(200).json({
      success: true,
      messages: fullMessages,
      count: fullMessages.length,
    });
  } catch (err) {
    console.error("❌ Error in createMessage:", err);
    return res.status(500).json({ error: "Server error sending message" });
  }
};

function quillToPlainText(delta) {
  try {
    const obj = typeof delta === "string" ? JSON.parse(delta) : delta;
    return obj.ops.map(op => op.insert || "").join("");
  } catch (e) {
    return "";
  }
}

// Helper function to send push notifications
async function sendPushNotifications({ sender, message, recipientIds, channel_id, recipient_id }) {
  try {
    // Get player_ids for all recipients (excluding sender if they're in the list)
    // Also check if the chat is muted for each user
    const recipients = await User.findAll({
      where: {
        id: recipientIds,
        player_id: {
          [Op.ne]: null, // Only users with player_id
        },
      },
      attributes: ["id", "player_id", "name"],
      include: [{
        model: MutedChat,
        as: "mutedChats",
        where: {
          target_id: channel_id || recipient_id,
          target_type: channel_id ? "channel" : "dm",
          muted_until: {
            [Op.gt]: new Date() // Only consider active mutes
          }
        },
        required: false, // Left join to include users even if they don't have muted chats
        attributes: ["id"] // We just need to know if a mute record exists
      }]
    });

    if (recipients.length === 0) return;

    // Filter out users who have muted this chat
    const unmutedRecipients = recipients.filter(user =>
      !user.mutedChats || user.mutedChats.length === 0
    );

    if (unmutedRecipients.length === 0) {
      console.log('All recipients have muted this chat, skipping push notifications');
      return;
    }

    const playerIds = unmutedRecipients.map(user => user.player_id).filter(Boolean);
      //  const playerIds = recipients.map((user) => user.player_id).filter(Boolean);

    // Prepare notification content
    let notificationTitle = sender.name;
    let notificationBody = "";

    // Determine message content based on message type
    if (message.message_type === "file") {
      notificationBody = "Sent a file";
    } else if (message.message_type === "image") {
      notificationBody = "Sent an image";
    } else if (message.message_type === "sticker") {
      notificationBody = "Sent a sticker";
    } else if (message.message_type === "location") {
      notificationBody = "Shared a location";
    } else {
      let text = quillToPlainText(message.content);

      notificationBody =
        text.length > 100 ? text.substring(0, 100) + "..." : text || "Sent a message";
    }

    // Add context for channel vs direct message
    let context = "";
    if (channel_id) {
      // You might want to get channel name here and add it
      context = " in channel";
    } else if (recipient_id) {
      context = "";
    }

    notificationBody += context;

    // Prepare notification data
    const additionalData = {
      messageId: message.id,
      senderId: sender.id,
      senderName: sender.name,
      channel_id: channel_id || null,
      recipient_id: recipient_id || null,
      message_type: message.message_type,
      type: "new_message",
      timestamp: new Date().toISOString(),
      // Add any other relevant data for your app
    };

    // Send notification using your existing OneSignal utility
    const result = await onesignal.sendToUsers(playerIds, notificationTitle, notificationBody, additionalData);

    if (result.success) {
      console.log('✅ Push notification sent successfully to', playerIds.length, 'unmuted users');
    } else {
      console.error("❌ Failed to send push notification:", result.error);
    }
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    // Don't throw error to avoid breaking the main message flow
  }
}

function getFileTypeFromMime(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function getDefaultContentForFileType(fileType) {
  const defaults = {
    image: "Shared an image",
    video: "Shared a video",
    audio: "Shared an audio file",
    document: "Shared a document",
    file: "Shared a file",
  };
  return defaults[fileType] || "Shared a file";
}

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { channel_id, recipient_id, me_chat, limit = 50, offset = 0, filter } = req.query;

    const paramCount = [channel_id, recipient_id, me_chat].filter(Boolean).length;
    if (paramCount !== 1 && !filter) {
      return res.status(400).json({
        message: "Provide exactly one of: channel_id, recipient_id, or me_chat=true.",
      });
    }

    let whereClause = { team_id: req.team_id };

    if (channel_id) {
      const membership = await ChannelMember.findOne({
        where: { user_id: userId, channel_id },
      });
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this channel." });
      }
      whereClause.channel_id = channel_id;
    } else if (recipient_id) {
      whereClause = {
        team_id: req.team_id,
        [Op.or]: [
          { sender_id: userId, recipient_id },
          { sender_id: recipient_id, recipient_id: userId },
        ],
      };
    } else if (me_chat === "true" || me_chat === true) {
      whereClause = {
        team_id: req.team_id,
        sender_id: userId,
        recipient_id: userId,
      };
    }

    // First, get message IDs based on filter
    let messageIds = [];
    if (filter === "fav" || filter === "favorite") {
      const favorites = await MessageFavorite.findAll({
        where: { user_id: userId },
        attributes: ["message_id"],
        include: [
          {
            model: Message,
            as: "message",
            where: whereClause,
          },
        ],
        raw: true,
      });
      messageIds = favorites.map((f) => f.message_id);
    } else if (filter === "pin" || filter === "pinned") {
      const pins = await MessagePin.findAll({
        attributes: ["message_id"],
        include: [
          {
            model: Message,
            as: "message",
            where: whereClause,
          },
        ],
        raw: true,
      });
      messageIds = pins.map((p) => parseInt(p.message_id));
    }

    // Build final where clause
    let finalWhere = whereClause;
    if (filter && (filter === "fav" || filter === "favorite" || filter === "pin" || filter === "pinned")) {
      finalWhere = {
        id: { [Op.in]: messageIds.length > 0 ? messageIds : [] },
        team_id: req.team_id, // Always include team_id
      };
    }

    const { count: totalCount, rows: messages } = await Message.findAndCountAll({
      where: finalWhere,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
        {
          model: MessageStatus,
          as: "statuses",
          attributes: ["user_id", "status", "updated_at"],
        },
        {
          model: MessageReaction,
          as: "reaction",
          attributes: ["user_id", "emoji"],
        },
        {
          model: MessageFavorite,
          as: "favorites",
          where: { user_id: userId },
          required: false,
          attributes: ["id"],
        },
        {
          model: MessagePin,
          as: "pins",
          required: false,
          attributes: ["pinned_by"],
        },
        {
          model: Message,
          as: "parent",
          attributes: [
            "id",
            "sender_id",
            "recipient_id",
            "channel_id",
            "team_id",
            "content",
            "message_type",
            "file_url",
            "file_type",
            "metadata",
            "mentions",
            "created_at",
            "updated_at",
            "deleted_at",
          ],
          required: false,
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "name", "email", "avatar", "profile_color"],
              required: false,
            },
            {
              model: User,
              as: "recipient",
              attributes: ["id", "name", "email", "avatar", "profile_color"],
              required: false,
            },
            {
              model: MessageStatus,
              as: "statuses",
              attributes: ["user_id", "status", "updated_at"],
              required: false,
            },
            {
              model: MessageReaction,
              as: "reaction",
              attributes: ["user_id", "emoji"],
              required: false,
            },
            {
              model: MessageFavorite,
              as: "favorites",
              where: { user_id: userId },
              required: false,
              attributes: ["id"],
            },
            {
              model: MessagePin,
              as: "pins",
              required: false,
              attributes: ["pinned_by"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    // Process messages (same as before)
    const processedMessages = messages.map((m) => {
      const plain = m.get({ plain: true });

      const reactions = plain.reaction.reduce((acc, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
        }
        acc[r.emoji].count++;
        acc[r.emoji].users.push(String(r.user_id));
        return acc;
      }, {});

      return {
        ...plain,
        reactions: Object.values(reactions),
        isPinned: plain.pins && plain.pins.length > 0,
        isFavorite: plain.favorites && plain.favorites.length > 0,
        parent_message: plain.parent,
        chat_type: me_chat ? "me" : channel_id ? "channel" : "dm",
      };
    });

    const hasMore = parseInt(offset) + parseInt(limit) < totalCount;
    const nextOffset = hasMore ? parseInt(offset) + parseInt(limit) : null;

    const response = {
      messages: processedMessages.reverse(),
      hasMore,
      totalCount,
      offset: parseInt(offset),
      nextOffset,
      isFirstPage: offset === 0 || offset === "0",
      filter: filter || "all",
      chat_type: me_chat ? "me" : channel_id ? "channel" : "dm",
      chat_id: me_chat ? userId : channel_id || recipient_id,
    };

    return res.json(response);
  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chat_id, chat_type } = req.body;
    const userId = req.user.id;

    let whereClause = { team_id: req.team_id };

    if (chat_type === "channel") {
      whereClause.channel_id = chat_id;
    } else if (chat_type === "dm") {
      whereClause = {
        [Op.or]: [
          { sender_id: userId, recipient_id: chat_id },
          { sender_id: chat_id, recipient_id: userId },
        ],
      };
    }

    // Update message statuses to 'seen'
    await MessageStatus.update(
      { status: "seen" },
      {
        where: { user_id: userId, status: { [Op.ne]: "seen" } },
        include: [
          {
            model: Message,
            as: "message",
            where: whereClause,
            required: true,
          },
        ],
      }
    );

    // Clear has_unread_mentions for all messages in this chat
    await Message.update(
      { has_unread_mentions: false },
      {
        where: {
          ...whereClause,
          has_unread_mentions: true,
        },
      }
    );

    return res.status(200).json({ message: "Messages marked as read successfully." });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      query,
      search_type = "all",
      scope = "global",
      channel_id,
      recipient_id,
      sender_id,
      message_type,
      date_from,
      date_to,
      limit = 20,
      offset = 0,
      include_threads = true,
      sort_by = "relevance",
    } = req.query;

    // Get active plan for the team to check message search limit
    const activeSubscription = await getActivePlanForTeam(req.team_id);
    const plan = activeSubscription?.plan;
    
    // Set default plan search limit
    let planSearchLimit = 2000; // Default to 2000 for basic plans
    if (plan && plan.max_message_search_limit !== null && plan.max_message_search_limit !== undefined) {
      planSearchLimit = plan.max_message_search_limit;
    }
    
    // Adjust the limit to respect plan restrictions if not explicitly set
    const requestedLimit = limit === 20 ? Math.min(20, planSearchLimit) : parseInt(limit);
    
    // Validate required parameters
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters long",
      });
    }

    // Validate date formats
    if (date_from && isNaN(new Date(date_from).getTime())) {
      return res.status(400).json({
        message: "Invalid date_from format. Use ISO 8601 format (YYYY-MM-DD)",
      });
    }

    if (date_to && isNaN(new Date(date_to).getTime())) {
      return res.status(400).json({
        message: "Invalid date_to format. Use ISO 8601 format (YYYY-MM-DD)",
      });
    }

    // Validate scope-specific parameters
    if (scope === "channel" && !channel_id) {
      return res.status(400).json({
        message: "channel_id is required when scope is 'channel'",
      });
    }

    if (scope === "dm" && !recipient_id) {
      return res.status(400).json({
        message: "recipient_id is required when scope is 'dm'",
      });
    }

    const searchTerm = query.trim();
    let whereClause = { team_id: req.team_id };
    let accessibleChannelIds = [];

    // Get channels user has access to
    const userChannels = await ChannelMember.findAll({
      where: { user_id: userId },
      attributes: ["channel_id"],
    });
    accessibleChannelIds = userChannels.map((ch) => ch.channel_id);

    // Build where clause based on scope
    switch (scope) {
      case "channel":
        if (!accessibleChannelIds.includes(parseInt(channel_id))) {
          return res.status(403).json({
            message: "You don't have access to this channel",
          });
        }
        whereClause.channel_id = channel_id;
        break;

      case "dm":
        whereClause[Op.or] = [
          { sender_id: userId, recipient_id: recipient_id },
          { sender_id: recipient_id, recipient_id: userId },
        ];
        break;

      case "global":
      default:
        whereClause[Op.or] = [
          { channel_id: { [Op.in]: accessibleChannelIds } },
          { sender_id: userId },
          { recipient_id: userId },
        ];
        break;
    }

    // Handle different search types
    let messageWhereConditions = [];
    let userWhereConditions = null;

    if (search_type === "content" || search_type === "all") {
      messageWhereConditions.push({
        content: {
          [Op.like]: `%${searchTerm}%`,
        },
      });
    }

    if (search_type === "sender" || search_type === "all") {
      userWhereConditions = {
        [Op.or]: [{ name: { [Op.like]: `%${searchTerm}%` } }, { email: { [Op.like]: `%${searchTerm}%` } }],
      };
    }

    // Apply message search conditions
    if (messageWhereConditions.length > 0) {
      whereClause[Op.and] = [...(whereClause[Op.and] || []), { [Op.or]: messageWhereConditions }];
    }

    // Additional filters
    if (sender_id) {
      whereClause[Op.and] = [...(whereClause[Op.and] || []), { sender_id: sender_id }];
    }

    if (message_type) {
      whereClause[Op.and] = [...(whereClause[Op.and] || []), { message_type: message_type }];
    }

    // Date range filter
    if (date_from || date_to) {
      const dateFilter = {};
      if (date_from) dateFilter[Op.gte] = new Date(date_from);
      if (date_to) dateFilter[Op.lte] = new Date(date_to);

      whereClause[Op.and] = [...(whereClause[Op.and] || []), { created_at: dateFilter }];
    }

    // Thread filter
    if (!include_threads) {
      whereClause[Op.and] = [...(whereClause[Op.and] || []), { parent_id: null }];
    }



    // Build includes for main query
    const includes = [
      {
        model: User,
        as: "sender",
        attributes: ["id", "name", "email", "avatar", "profile_color"],
        ...(search_type === "sender" && { where: userWhereConditions }),
      },
      {
        model: User,
        as: "recipient",
        attributes: ["id", "name", "email", "avatar","profile_color"],
        required: false,
      },
      {
        model: Channel,
        as: "channel",
        attributes: ["id", "name", "type", "description"],
        required: false,
      },
    ];

    // For sender search, we need to handle it differently in main query
    // Ensure the requested limit doesn't exceed the plan's limit
    const effectiveLimit = Math.min(requestedLimit, planSearchLimit);
    
    let searchQueryOptions = {
      where: whereClause,
      include: includes,
      order: sort_by === "date_asc" ? [["created_at", "ASC"]] : [["created_at", "DESC"]],
      limit: effectiveLimit + 1, // Fetch one extra to check if there are more
      offset: parseInt(offset),
      subQuery: false,
    };

    // Execute search query
    const messages = await Message.findAll(searchQueryOptions);

    // Check if there are more results
    let hasMore = false;
    let processedMessages = messages;

    if (messages.length > effectiveLimit) {
      hasMore = true;
      processedMessages = messages.slice(0, effectiveLimit); // Remove the extra item
    }

    // Process messages
    processedMessages = processedMessages.map((message) => {
      const plain = message.get({ plain: true });

      return {
        ...plain,
        isFavorite: plain.favorites && plain.favorites.length > 0,
        searchContext: {
          matchType: getSearchMatchType(plain, searchTerm, search_type),
          snippet: getSearchSnippet(plain.content, searchTerm),
        },
      };
    });

    // Sort by relevance if requested
    if (sort_by === "relevance") {
      processedMessages.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, searchTerm, search_type);
        const scoreB = calculateRelevanceScore(b, searchTerm, search_type);
        return scoreB - scoreA;
      });
    }

    // Get total count for pagination info (optional, but good to have)
    let totalCount;
    try {
      const countOptions = {
        where: whereClause,
        include: [],
      };

      // If searching by sender, we need to include the user association for count
      if (search_type === "sender") {
        countOptions.include.push({
          model: User,
          as: "sender",
          where: userWhereConditions,
          required: true,
        });
      }

      totalCount = await Message.count(countOptions);
    } catch (error) {
      // If count fails, we can still proceed with hasMore logic
      console.warn("Count query failed, using hasMore logic only:", error);
      totalCount = null;
    }

    const response = {
      messages: processedMessages,
      pagination: {
        total: totalCount,
        limit: effectiveLimit,
        offset: parseInt(offset),
        hasMore: hasMore,
        planLimit: planSearchLimit, // Show the plan's maximum limit
      },
      searchInfo: {
        query: searchTerm,
        searchType: search_type,
        scope: scope,
        resultsFound: totalCount || processedMessages.length,
        planMaxSearchLimit: planSearchLimit,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error("Error in searchMessages:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMessageById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Assume ID is passed as /messages/:id

    if (!id) {
      return res.status(400).json({ message: "Message ID is required." });
    }

    const message = await Message.findByPk(id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
        {
          model: MessageStatus,
          as: "statuses",
          attributes: ["user_id", "status", "updated_at"],
        },
        {
          model: MessageReaction,
          as: "reaction",
          attributes: ["user_id", "emoji"],
        },
        {
          model: MessageFavorite,
          as: "favorites",
          where: { user_id: userId },
          required: false,
          attributes: ["id"],
        },
        {
          model: MessagePin,
          as: "pins",
          required: false,
          attributes: ["pinned_by"],
        },
        {
          model: Message,
          as: "parent",
          attributes: [
            "id",
            "sender_id",
            "recipient_id",
            "channel_id",
            "team_id",
            "content",
            "message_type",
            "file_url",
            "file_type",
            "metadata",
            "mentions",
            "created_at",
            "updated_at",
            "deleted_at",
          ],
          required: false,
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "name", "email", "avatar", "profile_color"],
              required: false,
            },
            {
              model: User,
              as: "recipient",
              attributes: ["id", "name", "email", "avatar", "profile_color"],
              required: false,
            },
            {
              model: MessageStatus,
              as: "statuses",
              attributes: ["user_id", "status", "updated_at"],
              required: false,
            },
            {
              model: MessageReaction,
              as: "reaction",
              attributes: ["user_id", "emoji"],
              required: false,
            },
            {
              model: MessageFavorite,
              as: "favorites",
              where: { user_id: userId },
              required: false,
              attributes: ["id"],
            },
            {
              model: MessagePin,
              as: "pins",
              required: false,
              attributes: ["pinned_by"],
            },
          ],
        },
      ],
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Permission check: Ensure user can access this message
    if (message.channel_id) {
      const membership = await ChannelMember.findOne({
        where: { user_id: userId, channel_id: message.channel_id },
      });
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this channel." });
      }
    } else if (message.recipient_id) {
      if (![message.sender_id, message.recipient_id].includes(userId)) {
        return res.status(403).json({ message: "You are not authorized to view this message." });
      }
    }

    // Process reactions (similar to getMessages)
    const plain = message.get({ plain: true });
    const reactions = plain.reaction.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(String(r.user_id));
      return acc;
    }, {});

    const processedMessage = {
      ...plain,
      reactions: Object.values(reactions),
      isPinned: plain.pins && plain.pins.length > 0,
      isFavorite: plain.favorites && plain.favorites.length > 0,
      parent_message: plain.parent,
    };

    return res.json({ message: processedMessage });
  } catch (error) {
    console.error("Error in getMessageById:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

function getSearchMatchType(message, searchTerm, searchType) {
  const term = searchTerm.toLowerCase();
  const matches = [];

  if (searchType === "content" || searchType === "all") {
    if (message.content && message.content.toLowerCase().includes(term)) {
      matches.push("content");
    }
  }

  if (searchType === "sender" || searchType === "all") {
    if (
      message.sender &&
      (message.sender.name.toLowerCase().includes(term) || message.sender.email.toLowerCase().includes(term))
    ) {
      matches.push("sender");
    }
  }

  if (searchType === "channel" || searchType === "all") {
    if (message.channel && message.channel.name.toLowerCase().includes(term)) {
      matches.push("channel");
    }
  }

  return matches;
}

function getSearchSnippet(content, searchTerm, maxLength = 150) {
  if (!content) return "";

  const term = searchTerm.toLowerCase();
  const lowerContent = content.toLowerCase();
  const termIndex = lowerContent.indexOf(term);

  if (termIndex === -1) return content.substring(0, maxLength) + "...";

  // Calculate snippet boundaries
  const snippetStart = Math.max(0, termIndex - 50);
  const snippetEnd = Math.min(content.length, termIndex + searchTerm.length + 50);

  let snippet = content.substring(snippetStart, snippetEnd);

  // Add ellipsis if we're not at the start/end
  if (snippetStart > 0) snippet = "..." + snippet;
  if (snippetEnd < content.length) snippet = snippet + "...";

  // Highlight the search term (you can use HTML tags if your frontend supports it)
  const regex = new RegExp(`(${searchTerm})`, "gi");
  snippet = snippet.replace(regex, "**$1**"); // Using markdown-style highlighting

  return snippet;
}

function calculateRelevanceScore(message, searchTerm, searchType) {
  let score = 0;
  const term = searchTerm.toLowerCase();

  // Content match scoring
  if (message.content) {
    const content = message.content.toLowerCase();
    const termCount = (content.match(new RegExp(term, "g")) || []).length;

    // Base score for content matches
    score += termCount * 10;

    // Boost for exact word matches
    const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, "gi");
    const exactWordMatches = (content.match(wordBoundaryRegex) || []).length;
    score += exactWordMatches * 5;

    // Boost for matches near the beginning of the message
    const firstMatchIndex = content.indexOf(term);
    if (firstMatchIndex !== -1) {
      const positionBoost = Math.max(0, 50 - firstMatchIndex);
      score += positionBoost;
    }
  }

  // Sender name match scoring
  if (message.sender) {
    const senderName = message.sender.name.toLowerCase();
    if (senderName.includes(term)) {
      score += 20; // High score for sender name matches
    }
  }

  // Recency boost (newer messages get higher scores)
  const messageAge = Date.now() - new Date(message.created_at).getTime();
  const daysSinceMessage = messageAge / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 30 - daysSinceMessage);
  score += recencyBoost;

  // Boost for favorited messages
  if (message.isFavorite) {
    score += 5;
  }

  return score;
}

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // 0) Fetch pinned conversations
    const pinnedRecords = await PinnedConversation.findAll({
      where: { user_id: userId },
      attributes: ["type", "target_id"],
      raw: true,
    });

    const mutedChats = await MutedChat.findAll({
      where: {
        user_id: userId,
        muted_until: {
          [Op.gt]: new Date(), // Only get chats that are still muted
        },
      },
      attributes: ["target_id", "target_type", "muted_until"],
      raw: true,
    });

    // Create a map for quick lookup
    const mutedChatsMap = new Map();
    mutedChats.forEach((chat) => {
      const chatKey = chat.target_id;
      const now = new Date();
      const mutedUntil = new Date(chat.muted_until);

      // Calculate duration based on remaining time
      let duration = "1h"; // default
      const diffMs = mutedUntil.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24 * 7) {
        duration = "forever";
      } else if (diffHours >= 24) {
        duration = "1w";
      } else if (diffHours >= 8) {
        duration = "8h";
      } else {
        duration = "1h";
      }

      mutedChatsMap.set(chatKey, {
        muted_until: chat.muted_until,
        duration: duration,
      });
    });

    const pinnedMap = new Map();
    for (const pin of pinnedRecords) {
      // Convert "me" type to "dm" for pinned conversations lookup
      const keyType = pin.type === "me" ? "dm" : pin.type;
      pinnedMap.set(`${keyType}_${pin.target_id}`, true);
    }

    // Debug: Log pinned conversations (remove this after testing)
    console.log("Pinned conversations:", Array.from(pinnedMap.keys()));

    // 1) Channels user belongs to
    const channelMemberships = await ChannelMember.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Channel,
          where: { team_id: req.team_id },
          attributes: ["id", "name", "avatar", "profile_color", "description", "created_by", "created_at"],
          required: true,
        },
      ],
    });

    const channelIds = channelMemberships.map((cm) => cm.Channel.id);

    // 2) Get last message per channel
    const lastMessagesByChannel = await Message.findAll({
      where: {
        channel_id: channelIds,
        team_id: req.team_id,
      },
      include: [
        {
          model: MessageStatus,
          as: "statuses",
          where: { user_id: userId },
          required: false,
        },
      ],
      attributes: ["id", "content", "created_at", "sender_id", "channel_id", "mentions", "message_type"],
      order: [["created_at", "DESC"]],
    });

    const lastMessageMap = new Map();
    for (const msg of lastMessagesByChannel) {
      if (!lastMessageMap.has(msg.channel_id)) {
        lastMessageMap.set(msg.channel_id, msg);
      }
    }

    // 3) Get unread counts per channel
    const channelUnreadCounts = await Promise.all(
      channelIds.map(async (channelId) => {
        const count = await Message.count({
          where: {
            channel_id: channelId,
            team_id: req.team_id,
            [Op.not]: { sender_id: userId },
          },
          include: [
            {
              model: MessageStatus,
              as: "statuses",
              where: { user_id: userId, status: { [Op.ne]: "seen" } },
              required: true,
            },
          ],
        });
        return { channelId, unreadCount: count };
      })
    );

    const channelUnreadMap = new Map();
    channelUnreadCounts.forEach(({ channelId, unreadCount }) => {
      channelUnreadMap.set(channelId, unreadCount);
    });

    // 4) Get mention badge state per channel
    const channelMentionStates = await Promise.all(
      channelIds.map(async (channelId) => {
        const hasUnreadMentions = await Message.count({
          where: {
            channel_id: channelId,
            team_id: req.team_id,
            [Op.not]: { sender_id: userId },
            has_unread_mentions: true,
          },
          include: [
            {
              model: MessageStatus,
              as: "statuses",
              where: { user_id: userId, status: { [Op.ne]: "seen" } },
              required: true,
            },
          ],
        });
        return { channelId, hasUnreadMentions: hasUnreadMentions > 0 };
      })
    );

    const channelMentionMap = new Map();
    channelMentionStates.forEach(({ channelId, hasUnreadMentions }) => {
      channelMentionMap.set(channelId, hasUnreadMentions);
    });

    const channelList = channelMemberships.map((cm) => {
      const channel = cm.Channel.toJSON();
      const lastMsg = lastMessageMap.get(channel.id);
      const key = `channel_${channel.id}`;
      const muteInfo = mutedChatsMap.get(channel.id);

      return {
        type: "channel",
        id: channel.id,
        name: channel.name,
        avatar: channel.avatar,
        profile_color: channel.profile_color,
        description: channel.description,
        created_by: channel.created_by,
        latest_message_at: lastMsg ? lastMsg.created_at : channel.created_at,
        last_message: lastMsg || null,
        pinned: pinnedMap.has(key),
        unread_count: channelUnreadMap.get(channel.id) || 0,
        has_unread_mentions: channelMentionMap.get(channel.id) || false,
        is_muted: !!muteInfo,
        muted_until: muteInfo?.muted_until || null,
        mute_duration: muteInfo?.duration || null,
      };
    });

    // Get current user's team member status
    const currentUserTeamMember = await TeamMember.findOne({
      where: {
        user_id: userId,
        team_id: req.team_id,
      },
      attributes: ["status", "display_name", "do_not_disturb", "do_not_disturb_until"],
    });

    const lastSelfMessage = await Message.findOne({
      where: {
        sender_id: userId,
        recipient_id: userId,
        team_id: req.team_id,
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "avatar", "profile_color", "email", "is_online", "last_seen"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "name", "avatar", "profile_color", "email", "is_online", "last_seen"],
        },
        {
          model: MessageStatus,
          as: "statuses",
          where: { user_id: userId },
          required: false,
        },
      ],
      attributes: ["id", "content", "created_at", "sender_id", "recipient_id", "mentions", "message_type"],
      order: [["created_at", "DESC"]],
      limit: 1,
    });

    // Get current user info for "Me" chat
    const currentUser = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "avatar", "created_at", "profile_color"],
    });

    // Get unread count for self-messages (messages sent to self that haven't been seen)
    const selfUnreadCount = await Message.count({
      where: {
        sender_id: userId,
        recipient_id: userId,
        team_id: req.team_id,
      },
      include: [
        {
          model: MessageStatus,
          as: "statuses",
          where: { user_id: userId, status: { [Op.ne]: "seen" } },
          required: true,
        },
      ],
    });

    // Get mention badge state for "Me" chat
    const selfHasUnreadMentions = await Message.count({
      where: {
        sender_id: userId,
        recipient_id: userId,
        team_id: req.team_id,
        [Op.and]: [Sequelize.literal(`JSON_CONTAINS(mentions, '${userId}')`)],
      },
      include: [
        {
          model: MessageStatus,
          as: "statuses",
          where: { user_id: userId, status: { [Op.ne]: "seen" } },
          required: true,
        },
      ],
    });

    // Create "Me" chat object - now with type "dm" instead of "me"
    const meChatKey = `dm_${userId}`;
    const meChat = {
      type: "dm", // Changed from "me" to "dm"
      id: userId,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      profile_color: currentUser.profile_color,
      team_member_status: currentUserTeamMember?.status || null,
      display_name: currentUserTeamMember?.display_name || null,
      do_not_disturb: currentUserTeamMember?.do_not_disturb || false,
      do_not_disturb_until: currentUserTeamMember?.do_not_disturb_until || null,
      latest_message_at: lastSelfMessage ? lastSelfMessage.created_at : currentUser.created_at,
      last_message: lastSelfMessage || null,
      pinned: pinnedMap.has(meChatKey),
      unread_count: selfUnreadCount || 0,
      has_unread_mentions: selfHasUnreadMentions > 0 || false,
      is_muted: !!mutedChatsMap.get(userId),
      muted_until: mutedChatsMap.get(userId)?.muted_until || null,
      mute_duration: mutedChatsMap.get(userId)?.duration || null,
    };

    // Continue with existing DM logic...
    const dmUserIdsRaw = await Message.findAll({
      where: {
        team_id: req.team_id,
        [Op.or]: [{ sender_id: userId }, { recipient_id: userId }],
        // Exclude self-messages from DM list
        [Op.not]: {
          [Op.and]: [{ sender_id: userId }, { recipient_id: userId }],
        },
      },
      attributes: [
        [Sequelize.literal(`CASE WHEN sender_id = ${userId} THEN recipient_id ELSE sender_id END`), "dm_user_id"],
      ],
      group: ["dm_user_id"],
      raw: true,
    });

    let dmUserIds = dmUserIdsRaw.map((x) => x.dm_user_id);

    // 6) Get last message per DM user
    const dmLastMessages = await Promise.all(
      dmUserIds.map(async (otherId) => {
        return await Message.findOne({
          where: {
            team_id: req.team_id,
            [Op.or]: [
              { sender_id: userId, recipient_id: otherId },
              { sender_id: otherId, recipient_id: userId },
            ],
          },
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "name", "avatar", "email", "is_online", "last_seen", "profile_color"],
            },
            {
              model: User,
              as: "recipient",
              attributes: ["id", "name", "avatar", "email", "is_online", "last_seen", "profile_color"],
            },
            {
              model: MessageStatus,
              as: "statuses",
              where: { user_id: userId },
              required: false,
            },
          ],
          order: [["created_at", "DESC"]],
          limit: 1,
        });
      })
    );

    // 7) Unread counts for DMs
    const dmUnreadCounts = await Promise.all(
      dmUserIds.map(async (otherId) => {
        const count = await Message.count({
          where: {
            sender_id: otherId,
            recipient_id: userId,
            team_id: req.team_id,
          },
          include: [
            {
              model: MessageStatus,
              as: "statuses",
              where: { user_id: userId, status: { [Op.ne]: "seen" } },
              required: true,
            },
          ],
        });
        return { otherId, unreadCount: count };
      })
    );
    const dmUnreadMap = new Map();
    dmUnreadCounts.forEach(({ otherId, unreadCount }) => {
      dmUnreadMap.set(otherId, unreadCount);
    });

    // 8) Get mention badge state for DMs
    const dmMentionStates = await Promise.all(
      dmUserIds.map(async (otherId) => {
        const hasUnreadMentions = await Message.count({
          where: {
            sender_id: otherId,
            recipient_id: userId,
            team_id: req.team_id,
            [Op.and]: [Sequelize.literal(`JSON_CONTAINS(mentions, '${userId}')`)],
          },
          include: [
            {
              model: MessageStatus,
              as: "statuses",
              where: { user_id: userId, status: { [Op.ne]: "seen" } },
              required: true,
            },
          ],
        });
        return { otherId, hasUnreadMentions: hasUnreadMentions > 0 };
      })
    );

    const dmMentionMap = new Map();
    dmMentionStates.forEach(({ otherId, hasUnreadMentions }) => {
      dmMentionMap.set(otherId, hasUnreadMentions);
    });

    // 9) Get DM user info
    const dmUsers = await User.findAll({
      where: { id: dmUserIds },
      attributes: ["id", "name", "email", "avatar", "profile_color", "status"],
    });

    // Get team member status for all DM users
    const teamMemberStatuses = await TeamMember.findAll({
      where: {
        user_id: dmUserIds,
        team_id: req.team_id,
      },
      attributes: [
        "user_id",
        "status",
        "display_name",
        "do_not_disturb",
        "do_not_disturb_until",
        "role",
        "custom_field",
      ],
    });

    // Create a map for quick lookup
    const teamMemberMap = new Map();
    teamMemberStatuses.forEach((tm) => {
      teamMemberMap.set(tm.user_id, tm);
    });

    // 10) Build DM list with team member status
    const dmList = dmUsers.map((user) => {
      const msg = dmLastMessages.find((m) => m && (m.sender_id === user.id || m.recipient_id === user.id));
      const key = `dm_${user.id}`;
      const muteInfo = mutedChatsMap.get(user.id);
      const teamMember = teamMemberMap.get(user.id); // Get team member data from map

      return {
        type: "dm",
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        profile_color: user.profile_color,
        custom_field: teamMember?.custom_field || null,
        team_member_status: teamMember?.status || null,
        display_name: teamMember?.display_name || null,
        do_not_disturb: teamMember?.do_not_disturb || false,
        do_not_disturb_until: teamMember?.do_not_disturb_until || null,
        team_role: teamMember?.role || null,
        latest_message_at: msg ? msg.created_at : null,
        last_message: msg || null,
        pinned: pinnedMap.has(key),
        unread_count: dmUnreadMap.get(user.id) || 0,
        has_unread_mentions: dmMentionMap.get(user.id) || false,
        is_muted: !!muteInfo,
        muted_until: muteInfo?.muted_until || null,
        mute_duration: muteInfo?.duration || null,
      };
    });

    // 11) Combine all conversations including "Me" chat
    const combined = [meChat, ...channelList, ...dmList];

    // Sort conversations: pinned first, then by latest message time
    combined.sort((a, b) => {
      // First priority: pinned status
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Second priority: if both pinned or both not pinned, sort by latest message time
      const timeA = new Date(a.latest_message_at).getTime() || 0;
      const timeB = new Date(b.latest_message_at).getTime() || 0;
      return timeB - timeA;
    });

    // 12) Paginate and send response
    const paginated = combined.slice(offset, offset + limit);

    return res.json(paginated);
  } catch (error) {
    console.error("Error in getConversations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getConversationInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_id, type } = req.params; // type can be 'channel', 'dm', or 'me'

    // Validate parameters
    if (!target_id || !type) {
      return res.status(400).json({ message: "target_id and type are required" });
    }

    // Check if conversation is muted
    const mutedChat = await MutedChat.findOne({
      where: {
        user_id: userId,
        target_id: target_id,
        target_type: type === "me" ? "me" : type, // Handle 'me' type
        muted_until: {
          [Op.gt]: new Date(),
        },
      },
      attributes: ["target_id", "target_type", "muted_until"],
      raw: true,
    });

    let muteInfo = null;
    if (mutedChat) {
      const now = new Date();
      const mutedUntil = new Date(mutedChat.muted_until);
      let duration = "1h";
      const diffMs = mutedUntil.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24 * 7) {
        duration = "forever";
      } else if (diffHours >= 24) {
        duration = "1w";
      } else if (diffHours >= 8) {
        duration = "8h";
      } else {
        duration = "1h";
      }

      muteInfo = {
        muted_until: mutedChat.muted_until,
        duration: duration,
      };
    }

    // Check if conversation is pinned
    const pinKeyType = type === "me" ? "dm" : type; // Convert "me" to "dm" for pin lookup
    const isPinned = await PinnedConversation.findOne({
      where: {
        user_id: userId,
        type: pinKeyType,
        target_id: type === "me" ? userId : target_id, // For "me" chat, use user's own ID
      },
    });

    let conversationInfo = null;

    if (type === "channel") {
      // Get channel information
      const channel = await Channel.findOne({
        where: {
          id: target_id,
          team_id: req.team_id,
        },
        attributes: ["id", "name", "avatar", "description", "profile_color", "created_by", "created_at"],
      });

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Check if user is member of this channel
      const channelMembership = await ChannelMember.findOne({
        where: {
          user_id: userId,
          channel_id: target_id,
        },
      });

      if (!channelMembership) {
        return res.status(403).json({ message: "You are not a member of this channel" });
      }

      // Get last message in channel
      const lastMessage = await Message.findOne({
        where: {
          channel_id: target_id,
          team_id: req.team_id,
        },
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId },
            required: false,
          },
        ],
        attributes: ["id", "content", "created_at", "sender_id", "channel_id", "mentions", "message_type"],
        order: [["created_at", "DESC"]],
      });

      // Get unread count for channel
      const unreadCount = await Message.count({
        where: {
          channel_id: target_id,
          team_id: req.team_id,
          [Op.not]: { sender_id: userId },
        },
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId, status: { [Op.ne]: "seen" } },
            required: true,
          },
        ],
      });

      // Get mention badge state
      const hasUnreadMentions = await Message.count({
        where: {
          channel_id: target_id,
          team_id: req.team_id,
          [Op.not]: { sender_id: userId },
          has_unread_mentions: true,
        },
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId, status: { [Op.ne]: "seen" } },
            required: true,
          },
        ],
      });

      conversationInfo = {
        type: "channel",
        id: channel.id,
        name: channel.name,
        avatar: channel.avatar,
        profile_color: channel.profile_color,
        description: channel.description,
        created_by: channel.created_by,
        latest_message_at: lastMessage ? lastMessage.created_at : channel.created_at,
        last_message: lastMessage || null,
        pinned: !!isPinned,
        unread_count: unreadCount || 0,
        has_unread_mentions: hasUnreadMentions > 0,
        is_muted: !!muteInfo,
        muted_until: muteInfo?.muted_until || null,
        mute_duration: muteInfo?.duration || null,
        member_count: await ChannelMember.count({ where: { channel_id: target_id } }),
      };
    } else if (type === "dm" || type === "me") {
      let targetUserId = type === "me" ? userId : target_id;

      // For DM, verify the target user exists and is in the same team
      const targetUser = await User.findByPk(targetUserId, {
        attributes: ["id", "name", "email", "avatar", "profile_color", "status"],
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if target user is in the same team
      const targetUserTeamMember = await TeamMember.findOne({
        where: {
          user_id: targetUserId,
          team_id: req.team_id,
        },
      });

      if (!targetUserTeamMember && type !== "me") {
        return res.status(404).json({ message: "User is not a member of this team" });
      }

      // Get last message in DM conversation
      const lastMessage = await Message.findOne({
        where: {
          team_id: req.team_id,
          [Op.or]: [
            { sender_id: userId, recipient_id: targetUserId },
            { sender_id: targetUserId, recipient_id: userId },
          ],
        },
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "avatar", "email", "is_online", "last_seen", "profile_color"],
          },
          {
            model: User,
            as: "recipient",
            attributes: ["id", "name", "avatar", "email", "is_online", "last_seen", "profile_color"],
          },
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId },
            required: false,
          },
        ],
        attributes: ["id", "content", "created_at", "sender_id", "recipient_id", "mentions", "message_type"],
        order: [["created_at", "DESC"]],
      });

      // Get unread count for DM
      const unreadCount = await Message.count({
        where: {
          sender_id: targetUserId,
          recipient_id: userId,
          team_id: req.team_id,
        },
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId, status: { [Op.ne]: "seen" } },
            required: true,
          },
        ],
      });

      // Get mention badge state for DM
      const hasUnreadMentions = await Message.count({
        where: {
          sender_id: targetUserId,
          recipient_id: userId,
          team_id: req.team_id,
          [Op.and]: [Sequelize.literal(`JSON_CONTAINS(mentions, '${userId}')`)],
        },
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: { user_id: userId, status: { [Op.ne]: "seen" } },
            required: true,
          },
        ],
      });

      // Get team member info for the user
      const userTeamMember = await TeamMember.findOne({
        where: {
          user_id: targetUserId,
          team_id: req.team_id,
        },
        attributes: ["status", "display_name", "do_not_disturb", "do_not_disturb_until", "role", "custom_field"],
      });

      conversationInfo = {
        type: type === "me" ? "dm" : "dm", // Always return as 'dm' type for consistency
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        status: targetUser.status,
        profile_color: targetUser.profile_color,
        custom_field: userTeamMember?.custom_field || null,
        team_member_status: userTeamMember?.status || null,
        display_name: userTeamMember?.display_name || null,
        do_not_disturb: userTeamMember?.do_not_disturb || false,
        do_not_disturb_until: userTeamMember?.do_not_disturb_until || null,
        team_role: userTeamMember?.role || null,
        latest_message_at: lastMessage ? lastMessage.created_at : targetUser.created_at,
        last_message: lastMessage || null,
        pinned: !!isPinned,
        unread_count: unreadCount || 0,
        has_unread_mentions: hasUnreadMentions > 0,
        is_muted: !!muteInfo,
        muted_until: muteInfo?.muted_until || null,
        mute_duration: muteInfo?.duration || null,
      };
    } else {
      return res.status(400).json({ message: "Invalid conversation type" });
    }

    return res.json(conversationInfo);
  } catch (error) {
    console.error("Error in getConversationInfo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMutedChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const mutedChats = await MutedChat.findAll({
      where: {
        user_id: userId,
        muted_until: {
          [Op.gt]: new Date(), // Only get chats that are still muted
        },
      },
      attributes: ["target_id", "target_type", "muted_until"],
      raw: true,
    });

    // Convert to the format expected by frontend
    const mutedChatsMap = {};
    mutedChats.forEach((chat) => {
      const chatKey = chat.target_id;
      const now = new Date();
      const mutedUntil = new Date(chat.muted_until);

      // Calculate duration based on remaining time
      let duration = "1h"; // default
      const diffMs = mutedUntil.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24 * 7) {
        duration = "forever";
      } else if (diffHours >= 24) {
        duration = "1w";
      } else if (diffHours >= 8) {
        duration = "8h";
      } else {
        duration = "1h";
      }

      mutedChatsMap[chatKey] = {
        muted_until: chat.muted_until,
        duration: duration,
      };
    });

    return res.status(200).json(mutedChatsMap);
  } catch (error) {
    console.error("Error in getMutedChats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.pinOrUnpinConversation = async (req, res) => {
  try {
    const { type, target_id, pin } = req.body;
    const userId = req.user.id;

    // 1. Validate `type` - now includes "me"
    if (!["channel", "dm", "me"].includes(type)) {
      return res.status(400).json({ message: "Invalid conversation type" });
    }

    // 2. Validate `pin` is boolean
    if (typeof pin !== "boolean") {
      return res.status(400).json({ message: "`pin` must be true or false" });
    }

    // 3. Validate `target_id` exists
    if (type === "channel") {
      const channel = await Channel.findByPk(target_id);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
    } else if (type === "dm") {
      const user = await User.findByPk(target_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    } else if (type === "me") {
      // For "me" type, target_id should be the same as userId
      if (parseInt(target_id) !== userId) {
        return res.status(400).json({ message: "Invalid target_id for 'me' conversation" });
      }
    }
    const io = req.app.get("io");
    if (!pin) {
      // 4. Unpin logic
      await PinnedConversation.destroy({
        where: { user_id: userId, type, target_id },
      });
      io.to(`user_${userId}`).emit("chat-pin-updated", {
        id: target_id,
        type: type,
        pinned: false,
      });
      return res.json({ message: "Conversation unpinned successfully" });
    } else {
      // 5. Pin logic (create only if not exists)
      await PinnedConversation.findOrCreate({
        where: { user_id: userId, type, target_id },
      });
      io.to(`user_${userId}`).emit("chat-pin-updated", {
        id: target_id,
        type: type,
        pinned: true,
      });
      return res.json({ message: "Conversation pinned successfully" });
    }
  } catch (error) {
    console.error("Error in pinOrUnpinConversation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message_id, content } = req.body;

    if (!message_id || !content) {
      return res.status(400).json({ message: "Message ID and new content are required." });
    }

    // Fetch the message
    const message = await Message.findByPk(message_id);

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Only sender can edit
    if (message.sender_id !== userId) {
      return res.status(403).json({ message: "You are not authorized to edit this message." });
    }

    // Update only content
    message.content = content;
    await message.save();

    // Fetch updated message with associations for real-time update
    const updatedMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "avatar",'profile_color'] },
        { model: User, as: "recipient", attributes: ["id", "name", "avatar",'profile_color'], required: false },
      ],
    });

    // Emit socket event for message update
    const io = req.app.get("io");
    if (message.channel_id) {
      io.to(`channel_${message.channel_id}`).emit("message-updated", updatedMessage);
    } else if (message.recipient_id) {
      io.to(`user_${message.sender_id}`).emit("message-updated", updatedMessage);
      io.to(`user_${message.recipient_id}`).emit("message-updated", updatedMessage);
    }

    return res.status(200).json({ message: "Message updated successfully.", data: updatedMessage });
  } catch (error) {
    console.error("Error in editMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({ where: { id: id } });

    if (!message || message.sender_id !== userId) {
      return res.status(403).json({ message: "Unauthorized or message not found." });
    }

    let newPrevMessage = null;
    if (message.channel_id) {
      newPrevMessage = await Message.findOne({
        where: {
          channel_id: message.channel_id,
          id: { [Op.ne]: message.id },
        },
        order: [["created_at", "DESC"]],
      });
    } else if (message.recipient_id) {
      newPrevMessage = await Message.findOne({
        where: {
          [Op.or]: [
            { sender_id: message.sender_id, recipient_id: message.recipient_id },
            { sender_id: message.recipient_id, recipient_id: message.sender_id },
          ],
          id: { [Op.ne]: message.id },
        },
        order: [["created_at", "DESC"]],
      });
    }

    const deletedMessageHadMentions = message.has_unread_mentions;

    // Destroy the message after fetching necessary data
    await message.destroy();

    const io = req.app.get("io");

    // Minimal deletedMessage object for reducer (includes sender_id for fallback if needed)
    const deletedMessageMinimal = {
      sender_id: message.sender_id,
      channel_id: message.channel_id,
      recipient_id: message.recipient_id,
    };

    // Helper function to calculate hasUnreadMentions for a specific user (after deletion)
    const calculateHasUnreadMentionsForUser = async (targetUserId) => {
      if (!deletedMessageHadMentions) return undefined;

      let countWhere = {
        team_id: message.team_id,
        [Op.not]: { sender_id: targetUserId },
        has_unread_mentions: true,
        id: { [Op.ne]: message.id },
      };

      let includeWhere = {
        user_id: targetUserId,
        status: { [Op.ne]: "seen" },
      };

      if (message.channel_id) {
        countWhere.channel_id = message.channel_id;
      } else if (message.recipient_id) {
        countWhere = {
          ...countWhere,
          [Op.or]: [
            { sender_id: message.sender_id, recipient_id: message.recipient_id },
            { sender_id: message.recipient_id, recipient_id: message.sender_id },
          ],
        };
      }

      const unreadMentionCount = await Message.count({
        where: countWhere,
        include: [
          {
            model: MessageStatus,
            as: "statuses",
            where: includeWhere,
            required: true,
          },
        ],
      });

      return unreadMentionCount > 0;
    };

    // Base payload (shared parts)
    const basePayload = {
      messageId: message.id, // Changed to messageId for reducer consistency
      newPrevMessage: newPrevMessage,
      deletedMessage: deletedMessageMinimal,
      mentions: message.mentions,
      created_at: message.created_at,
    };

    if (message.channel_id) {
      // For channels: Get all members (including sender/deleter)
      const members = await ChannelMember.findAll({
        where: { channel_id: message.channel_id },
        attributes: ["user_id"],
      });

      for (const member of members) {
        const targetUserId = member.user_id;

        // wasUnread: false if own message, else check status
        let wasUnread = false;
        if (message.sender_id !== targetUserId) {
          const status = await MessageStatus.findOne({
            where: { message_id: message.id, user_id: targetUserId },
          });
          wasUnread = status ? status.status !== "seen" : false;
        }

        // Personalized hasUnreadMentions
        const hasUnreadMentions = await calculateHasUnreadMentionsForUser(targetUserId);

        io.to(`user_${targetUserId}`).emit("message-deleted", {
          ...basePayload,
          channel_id: message.channel_id,
          sender_id: message.sender_id,
          hasUnreadMentions,
          wasUnread,
        });
      }
    } else if (message.recipient_id) {
      // For DMs: Personalized for sender and recipient

      // For sender (deleter): wasUnread always false
      const senderHasUnreadMentions = await calculateHasUnreadMentionsForUser(message.sender_id);
      io.to(`user_${message.sender_id}`).emit("message-deleted", {
        ...basePayload,
        recipient_id: message.recipient_id,
        sender_id: message.sender_id,
        hasUnreadMentions: senderHasUnreadMentions,
        wasUnread: false,
      });

      // For recipient
      const recipientStatus = await MessageStatus.findOne({
        where: { message_id: message.id, user_id: message.recipient_id },
      });
      const recipientWasUnread = recipientStatus ? recipientStatus.status !== "seen" : false;
      const recipientHasUnreadMentions = await calculateHasUnreadMentionsForUser(message.recipient_id);
      io.to(`user_${message.recipient_id}`).emit("message-deleted", {
        ...basePayload,
        recipient_id: message.recipient_id,
        sender_id: message.sender_id,
        hasUnreadMentions: recipientHasUnreadMentions,
        wasUnread: recipientWasUnread,
      });
    }

    return res.status(200).json({
      message: "Message deleted successfully.",
      data: {
        deletedMessage: deletedMessageMinimal,
        newPrevMessage: newPrevMessage,
      },
    });
  } catch (err) {
    console.error("Error in deleteMessage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { message_id, emoji } = req.body;
    const userId = req.user.id;

    if (typeof emoji !== "string") {
      return res.status(400).json({ message: "Emoji must be a string" });
    }

    const message = await Message.findByPk(message_id);

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Ensure only one reaction per user per message
    const existing = await MessageReaction.findOne({
      where: { message_id, user_id: userId },
    });
    if (existing) {
      if (existing.emoji !== emoji) {
        await existing.update({ emoji });
      }
      // If same, do nothing (toggle handled in frontend)
    } else {
      await MessageReaction.create({ message_id, user_id: userId, emoji });
    }
    const io = req.app.get("io");

    // Get updated reactions
    const rawReactions = await MessageReaction.findAll({
      where: { message_id },
    });
    const grouped = rawReactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user_id);
      return acc;
    }, {});
    const reactions = Object.values(grouped);

    if (message.channel_id) {
      io.to(`channel_${message.channel_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });
    } else if (message.sender_id && message.recipient_id) {
      io.to(`user_${message.sender_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });

      io.to(`user_${message.recipient_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });
    } else {
      console.warn(`Cannot determine room for message id ${message.id}`);
      return res.status(400).json({ message: "Invalid message for reaction room" });
    }

    return res.status(200).json({ message: "Reaction added." });
  } catch (err) {
    console.error("Error in addReaction:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const { message_id, emoji } = req.body;
    console.log(message_id);
    const userId = req.user.id;

    await MessageReaction.destroy({
      where: { message_id, user_id: userId, emoji },
    });
    const io = req.app.get("io");

    // Get updated reactions (same as addReaction)
    const rawReactions = await MessageReaction.findAll({
      where: { message_id },
    });
    const grouped = rawReactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user_id);
      return acc;
    }, {});
    const reactions = Object.values(grouped);

    const message = await Message.findByPk(message_id);
    if (message.channel_id) {
      io.to(`channel_${message.channel_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });
    } else if (message.sender_id && message.recipient_id) {
      io.to(`user_${message.sender_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });
      io.to(`user_${message.recipient_id}`).emit("message-reaction-updated", {
        message_id,
        reactions,
      });
    } else {
      console.warn(`Cannot determine room for message id ${message.id}`);
      return res.status(400).json({ message: "Invalid message for reaction room" });
    }

    return res.status(200).json({ message: "Reaction removed." });
  } catch (err) {
    console.error("Error in removeReaction:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.muteChat = async (req, res) => {
  try {
    const { target_id, target_type, duration, value = true } = req.body;
    const userId = req.user.id;

    let mutedUntil = null;
    const now = new Date();

    if (duration === "1h") {
      mutedUntil = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    } else if (duration === "8h") {
      mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    } else if (duration === "1w") {
      mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (duration === "forever") {
      mutedUntil = new Date("2100-01-01T00:00:00Z");
    } else {
      return res.status(400).json({ success: false, message: "Invalid mute duration." });
    }

    const io = req.app.get("io");

    if (value) {
      await MutedChat.upsert({
        user_id: userId,
        target_id,
        target_type,
        muted_until: mutedUntil,
      });
      io.to(`user_${userId}`).emit('chat-muted', { user_id: userId,
        target_id,
        target_type,
        muted_until: mutedUntil})
      return res.status(200).json({ message: "Chat muted successfully." });
    } else {
      await MutedChat.destroy({
        where: { user_id: userId, target_id, target_type },
      });

      return res.status(200).json({ message: "Chat unmuted successfully." });
    }
  } catch (error) {
    console.error("Error in muteChat:", error);
    res.status(500).json({ success: false, message: "Failed to mute chat.", error: error.message });
  }
};

exports.unmuteChat = async (req, res) => {
  const { target_id, target_type } = req.body;
  const userId = req.user.id;
   
  await MutedChat.destroy({
    where: { user_id: userId, target_id, target_type },
  });
    const io = req.app.get("io");

      io.to(`user_${userId}`).emit('chat-unmuted', { user_id: userId,
        target_id,
        target_type})
  return res.status(200).json({ message: "Chat unmuted successfully." });
};

exports.pinMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message_id, value = true } = req.body;

    if (!message_id) {
      return res.status(400).json({ message: "Message ID is required." });
    }

    const message = await Message.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    let payload = {};
    let io;

    if (value) {
      // Check if already pinned
      const existingPin = await MessagePin.findOne({ where: { message_id, pinned_by: userId } });
      if (existingPin) {
        return res.status(400).json({ message: "Message already pinned." });
      }

      await MessagePin.create({
        message_id,
        pinned_by: userId,
        channel_id: message.channel_id || null,
      });

      // Fetch the user data for the pin
      const pinningUser = await User.findByPk(userId, {
        attributes: ["id", "name", "profile_color", "email", "avatar"],
      });

      io = req.app.get("io");
      payload = {
        message_id,
        isPinned: true,
        pins: [
          {
            pinned_by: userId,
            user: pinningUser.get({ plain: true }),
          },
        ],
      };
    } else {
      const pin = await MessagePin.findOne({ where: { message_id, pinned_by: userId } });
      if (!pin) {
        return res.status(404).json({ message: "Pinned message not found for this user." });
      }

      await pin.destroy();

      io = req.app.get("io");
      payload = {
        message_id,
        isPinned: false,
      };
    }

    if (message.channel_id) {
      io.to(`channel_${message.channel_id}`).emit("message-pin", payload);
    } else if (message.recipient_id) {
      io.to(`user_${message.sender_id}`).emit("message-pin", payload);
      io.to(`user_${message.recipient_id}`).emit("message-pin", payload);
    }

    return res.status(200).json({ message: `Message ${value ? "pinned" : "unpinned"} successfully.` });
  } catch (err) {
    console.error("Error in pinMessage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.unpinMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message_id } = req.body;

    const message = await Message.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Find ALL pins for this message (not just the current user's pin)
    const pins = await MessagePin.findAll({ where: { message_id } });

    if (!pins || pins.length === 0) {
      return res.status(404).json({ message: "No pinned message found." });
    }

    // Delete all pins for this message
    await MessagePin.destroy({ where: { message_id } });

    const io = req.app.get("io");
    const payload = {
      message_id,
      isPinned: false,
    };
    if (message.channel_id) {
      io.to(`channel_${message.channel_id}`).emit("message-pin", payload);
    } else if (message.recipient_id) {
      io.to(`user_${message.sender_id}`).emit("message-pin", payload);
      io.to(`user_${message.recipient_id}`).emit("message-pin", payload);
    }

    return res.status(200).json({
      message: "Message unpinned successfully.",
      unpinned_by: userId,
      pins_removed: pins.length,
    });
  } catch (err) {
    console.error("Error in unpinMessage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.favoriteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message_id, value = true } = req.body;

    if (!message_id) {
      return res.status(400).json({ message: "Message ID is required." });
    }

    const message = await Message.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    let payload = {};
    let io;
    if (value) {
      const existingFav = await MessageFavorite.findOne({ where: { message_id, user_id: userId } });
      if (existingFav) {
        return res.status(400).json({ message: "Message already favorited." });
      }

      await MessageFavorite.create({ message_id, user_id: userId });
      io = req.app.get("io");
      payload = {
        message_id,
        isFavorite: true,
      };
    } else {
      const fav = await MessageFavorite.findOne({ where: { message_id, user_id: userId } });
      if (!fav) {
        return res.status(404).json({ message: "Favorite not found." });
      }

      await fav.destroy();
      io = req.app.get("io");
      payload = {
        message_id,
        isFavorite: false,
      };
    }

    io.to(`user_${userId}`).emit("message-favorite", payload);

    return res.status(200).json({ message: "Message favorited successfully." });
  } catch (err) {
    console.error("Error in favoriteMessage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.unfavoriteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message_id } = req.body;

    const fav = await MessageFavorite.findOne({ where: { message_id, user_id: userId } });
    if (!fav) {
      return res.status(404).json({ message: "Favorite not found." });
    }

    await fav.destroy();
    const io = req.app.get("io");
    const payload = {
      message_id,
      isFavorite: false,
    };
    io.to(`user_${userId}`).emit("message-favorite", payload);

    return res.status(200).json({ message: "Message unfavorited successfully." });
  } catch (err) {
    console.error("Error in unfavoriteMessage:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllFilesFromConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { channel_id, recipient_id, limit = 100, offset = 0, file_type } = req.query;

    if ((channel_id && recipient_id) || (!channel_id && !recipient_id)) {
      return res.status(400).json({ message: "Provide either channel_id or recipient_id." });
    }

    let whereClause = {
      team_id: req.team_id,
      message_type: {
        [Op.in]: ["image", "video", "file", "link"],
      },
      [Op.or]: [
        { file_url: { [Op.ne]: null } }, // For image, video, file
        { message_type: "link" }, // For all link messages (relaxed: no metadata check)
      ],
    };

    // Check permissions and set where clause
    if (channel_id) {
      const membership = await ChannelMember.findOne({
        where: { user_id: userId, channel_id },
      });
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this channel." });
      }
      whereClause.channel_id = channel_id;
    } else if (recipient_id) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { sender_id: userId, recipient_id },
          { sender_id: recipient_id, recipient_id: userId },
        ],
      };
    }

    // Add file type filter if specified
    if (file_type && ["image", "video", "file", "link"].includes(file_type.toLowerCase())) {
      const messageTypeMap = {
        image: "image",
        video: "video",
        file: "file",
        link: "link",
      };
      whereClause.message_type = messageTypeMap[file_type.toLowerCase()];
    }

    const { count: totalCount, rows: messages } = await Message.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "email", "avatar", "profile_color"],
        },
      ],
      attributes: ["id", "sender_id", "message_type", "file_url", "file_type", "metadata", "content", "created_at"],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Process the messages to extract file information
    const files = messages.map((message) => {
      const getFileNameFromMessage = (msg) => {
        try {
          if (msg.message_type === "link" && msg.metadata) {
            const metadata = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
            if (metadata.urls && metadata.urls.length > 0) {
              const url = metadata.urls[0];
              const urlObj = new URL(url);
              return urlObj.hostname || url; // e.g., "github.com"
            }
          }
          if (msg.metadata) {
            const metadata = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
            if (metadata.original_filename) {
              return metadata.original_filename;
            }
          }
          if (msg.file_url) {
            const urlParts = msg.file_url.split("/");
            const filename = urlParts[urlParts.length - 1];
            return filename.split("?")[0] || "Untitled";
          }
          return "Untitled Link"; // Default for links
        } catch (error) {
          console.error("Error parsing metadata for filename:", error);
          return "Untitled Link";
        }
      };

      let fileType = "file";
      if (message.message_type === "image") fileType = "image";
      else if (message.message_type === "video") fileType = "video";
      else if (message.message_type === "link") fileType = "link";

      // Derive fileUrl for link messages from metadata.urls if file_url is null
      const fileUrl =
        message.message_type === "link" && !message.file_url && message.metadata
          ? (typeof message.metadata === "string" ? JSON.parse(message.metadata) : message.metadata).urls?.[0]
          : message.file_url;

      return {
        id: `${message.id}-${fileUrl || "link"}`,
        type: fileType,
        fileName: getFileNameFromMessage(message),
        fileUrl: fileUrl || null,
        fileType: message.file_type,
        content: message.content, // Added: For Renderer
        createdAt: message.created_at,
        senderId: message.sender_id,
        senderName: message.sender?.name || "Unknown",
        messageId: message.id,
      };
    });

    const hasMore = parseInt(offset) + parseInt(limit) < totalCount;
    const nextOffset = hasMore ? parseInt(offset) + parseInt(limit) : null;

    const response = {
      files,
      hasMore,
      totalCount,
      offset: parseInt(offset),
      nextOffset,
      currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    };

    return res.json(response);
  } catch (error) {
    console.error("Error in getAllFilesFromConversation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
