const { Op } = require("sequelize");
const { User, Message, MessageStatus, ChannelMember, Channel } = require("../models");
const onesignal = require('../utils/onesignal');

const resetOnlineStatuses = async () => {
  const now = new Date();
  await User.update({ is_online: false, is_away: false, last_seen: now }, { where: { is_online: true } });
};

resetOnlineStatuses();

// Inside the initSockets function:
const { updateUserStatus } = require("../utils/userStatusHelper");

module.exports = function initSockets(io) {
  // Store user socket mappings
  const userSockets = new Map();
  const socketUsers = new Map();
  const userStatus = new Map();
  const activeScreenShares = new Map();
  const activeCalls = new Map();
  const userCalls = new Map();
  const activeRemoteControls = new Map(); // callId -> { controllerId, targetId }

  // Virtual Office: track which users are in which rooms
  // voRooms: Map<roomId, Map<userId, { id, name, first_name, last_name, avatar, profile_color, status }>>
  const voRooms = new Map();
  const voUserRoom = new Map(); // Map<userId, roomId> - which room each user is in

  // Initialize default rooms
  const defaultVORooms = [
    'desarrolladores', 'gerencia', 'descanso', 'sala-1',
    'sala-2', 'comercial', 'inactivos', 'legal-docente'
  ];
  defaultVORooms.forEach(roomId => voRooms.set(roomId, new Map()));

  const fixMetadata = (meta) => {
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch {
        return {};
      }
    }
    const numericKeys = Object.keys(meta)
      .filter((k) => !isNaN(k))
      .map(Number)
      .sort((a, b) => a - b);
    if (
      numericKeys.length > 0 &&
      numericKeys[0] === 0 &&
      numericKeys[numericKeys.length - 1] === numericKeys.length - 1
    ) {
      const originalStr = numericKeys.map((k) => meta[k]).join("");
      try {
        const originalMeta = JSON.parse(originalStr);
        const nonNumeric = Object.keys(meta).filter((k) => isNaN(k));
        nonNumeric.forEach((k) => {
          originalMeta[k] = meta[k];
        });
        return originalMeta;
      } catch (e) {
        console.error("Failed to reconstruct metadata", e);
        return meta;
      }
    }
    return meta;
  };

  async function sendCallPushNotification({ recipient, initiator, callType, chatType, chatName, callId, additionalData }) {
    try {
      if (!recipient.player_id) {
        return; // No player_id, can't send push notification
      }

      // Prepare notification content
      const notificationTitle = "Incoming Call";
      let notificationBody = "";

      if (chatType === "dm") {
        notificationBody = `${initiator.name} is calling you`;
      } else {
        notificationBody = `${initiator.name} started a ${callType} call in ${chatName}`;
      }

      // Add call-specific context
      if (callType === "video") {
        notificationBody += " (Video)";
      } else {
        notificationBody += " (Audio)";
      }

      // Prepare notification data specific to calls
      const callNotificationData = {
        ...additionalData,
        type: "incoming_call",
        action: "call_notification",
        // Include all necessary data for the app to handle the call
        call_id: callId,
        chat_id: additionalData.chatId,
        chat_type: chatType,
        call_type: callType,
        initiator_id: initiator.userId,
        initiator_name: initiator.name,
        timestamp: new Date().toISOString()
      };

      // Send notification using your existing OneSignal utility
      const result = await onesignal.sendToUsers(
        [recipient.player_id],
        notificationTitle,
        notificationBody,
        callNotificationData
      );

      if (result.success) {
        console.log('✅ Call push notification sent successfully to', recipient.name);
      } else {
        console.error('❌ Failed to send call push notification to', recipient.name, ':', result.error);
      }

    } catch (error) {
      console.error('❌ Error sending call push notification:', error);
      // Don't throw error to avoid breaking the call flow
    }
  }

  io.on("connection", (socket) => {
    socket.on("join-room", async (userId) => {
      if (!userId) {
        console.error("No userId provided for join-room");
        return;
      }

      try {
        const user = await User.findByPk(userId, { attributes: ["id"] });
        if (!user) {
          console.error(`Invalid userId: ${userId}`);
          return;
        }
      } catch (error) {
        console.error(`Error validating user ${userId}:`, error);
        return;
      }

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socketUsers.set(socket.id, userId);
      socket.userId = userId;

      socket.join(`user_${userId}`);
      console.log(
        `User ${userId} joined personal room user_${userId} with socket ${socket.id}`
      );

      try {
        const userChannels = await ChannelMember.findAll({
          where: { user_id: userId },
          attributes: ["channel_id"],
        });

        userChannels.forEach((channelMember) => {
          socket.join(`channel_${channelMember.channel_id}`);
          console.log(
            `User ${userId} auto-joined channel_${channelMember.channel_id}`
          );
        });
      } catch (error) {
        console.error(`Error joining user ${userId} to channels:`, error);
      }

      try {
        await updateUserStatus(userId, "online");

        const allUsersFromDb = await User.findAll({
          attributes: ["id", "is_online", "is_away", "last_seen"],
        });

        const allUsers = allUsersFromDb
          .map((user) => ({
            userId: user.id,
            status: user.is_online
              ? user.is_away
                ? "away"
                : "online"
              : "offline",
            lastSeen: user.last_seen?.toISOString() ?? null,
          }))
          .filter((u) => u.userId !== userId);

        if (allUsers.length > 0) {
          socket.emit("bulk-user-status-update", allUsers);
        }

        socket.broadcast.emit("user-status-update", {
          userId,
          status: "online",
          lastSeen: null,
        });
      } catch (error) {
        console.error(`Error updating status for user ${userId}:`, error);
      }

      try {
        const undeliveredStatuses = await MessageStatus.findAll({
          where: {
            user_id: userId,
            status: "sent",
          },
          include: [{ model: Message, as: "message" }],
        });

        const messageIds = undeliveredStatuses.map((ms) => ms.message_id);

        if (messageIds.length > 0) {
          await MessageStatus.update(
            { status: "delivered" },
            {
              where: {
                message_id: messageIds,
                user_id: userId,
                status: "sent",
              },
            }
          );

          for (const status of undeliveredStatuses) {
            const senderId = status.message.sender_id;
            io.to(`user_${senderId}`).emit("message-status-updated", {
              messageId: status.message_id,
              userId,
              status: "delivered",
            });
          }
        }
      } catch (error) {
        console.error(
          `Error processing undelivered messages for user ${userId}:`,
          error
        );
      }
    });

    socket.on("request-status-update", async () => {
      const userId = socket.userId;
      if (!userId) {
        console.error("No userId for request-status-update");
        return;
      }

      try {
        // Fetch all users' statuses from DB
        const allUsersFromDb = await User.findAll({
          attributes: ["id", "is_online", "is_away", "last_seen"],
        });

        const allUsers = allUsersFromDb
          .map((user) => ({
            userId: user.id,
            status: user.is_online
              ? user.is_away
                ? "away"
                : "online"
              : "offline",
            lastSeen: user.last_seen?.toISOString() ?? null,
          }))
          .filter((u) => u.userId !== userId); // Exclude self

        socket.emit("bulk-user-status-update", allUsers);
        console.log(`Sent status update for user ${userId}`);
      } catch (error) {
        console.error(
          `Error fetching status updates for user ${userId}:`,
          error
        );
      }
    });

    socket.on("set-away", async () => {
      const userId = socket.userId;
      if (userId) {
        try {
          await updateUserStatus(userId, "away");
          socket.broadcast.emit("user-status-update", {
            userId,
            status: "away",
            lastSeen: new Date().toISOString(),
          });
          console.log(`User ${userId} is away`);
        } catch (error) {
          console.error(`Error setting user ${userId} to away:`, error);
        }
      }
    });

    socket.on("set-online", async () => {
      const userId = socket.userId;
      if (userId) {
        try {
          await updateUserStatus(userId, "online");
          socket.broadcast.emit("user-status-update", {
            userId,
            status: "online",
            lastSeen: null,
          });
          console.log(`User ${userId} is back online`);
        } catch (error) {
          console.error(`Error setting user ${userId} to online:`, error);
        }
      }
    });

    socket.on("initiate-call", async (data) => {
      const { callId, chatId, chatType, callType, chatName, initiator } = data;

      const callRecord = {
        callId,
        chatId,
        chatType,
        callType,
        chatName,
        initiator,
        participants: new Map([
          [
            initiator.userId,
            {
              userId: initiator.userId,
              socketId: socket.id,
              name: initiator.name,
              avatar: initiator.avatar,
              profile_color: initiator.profile_color,
              joinedAt: new Date(),
              isAudioEnabled:
                initiator.isAudioEnabled !== undefined
                  ? initiator.isAudioEnabled
                  : true,
              isVideoEnabled:
                initiator.isVideoEnabled !== undefined
                  ? initiator.isVideoEnabled
                  : callType === "video",
            },
          ],
        ]),
        invitedUsers: new Set(),
        acceptedUsers: new Set([initiator.userId]),
        startTime: null,
        acceptedTime: null,
        status: "calling",
        messageId: null,
        timer: null,
      };

      // Add invited users to tracking
      if (chatType === "channel") {
        try {
          const channelMembers = await ChannelMember.findAll({
            where: { channel_id: chatId },
            attributes: ["user_id"],
          });

          channelMembers.forEach((member) => {
            if (member.user_id !== initiator.userId) {
              callRecord.invitedUsers.add(member.user_id);
            }
          });
        } catch (error) {
          console.error("Error getting channel members:", error);
        }
      } else {
        callRecord.invitedUsers.add(chatId);
      }

      activeCalls.set(callId, callRecord);
      userCalls.set(initiator.userId, callId);

      // Create call message with 'calling' status initially
      if (chatType === "dm") {
        try {
          const message = await Message.create({
            sender_id: initiator.userId,
            recipient_id: chatId,
            channel_id: null,
            team_id: initiator.team_id || null,
            content: null,
            message_type: "call",
            metadata: {
              call_id: callId,
              call_kind: callType,
              call_status: "calling",
            },
          });

          callRecord.messageId = message.id;
          activeCalls.set(callId, callRecord);

          await MessageStatus.bulkCreate([{ message_id: message.id, user_id: chatId, status: "sent" }]);

          const fullMessage = await Message.findByPk(message.id, {
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
            ],
          });

          io.to(`user_${initiator.userId}`).emit("receive-message", fullMessage);
          io.to(`user_${chatId}`).emit("receive-message", fullMessage);
        } catch (e) {
          console.error("Error creating initial call message:", e);
        }
      } else if (chatType === "channel") {
        try {
          const channel = await Channel.findByPk(chatId, {
            attributes: ["team_id"],
          });
          const teamId = channel ? channel.team_id : null;

          const message = await Message.create({
            sender_id: initiator.userId,
            channel_id: chatId,
            recipient_id: null,
            team_id: teamId,
            content: null,
            message_type: "call",
            metadata: {
              call_id: callId,
              call_kind: callType,
              call_status: "calling",
            },
          });

          callRecord.messageId = message.id;
          activeCalls.set(callId, callRecord);

          const members = await ChannelMember.findAll({
            where: { channel_id: chatId },
            attributes: ["user_id"],
            raw: true,
          });
          const recipients = members
            .map((m) => m.user_id)
            .filter((uid) => uid !== initiator.userId);
          if (recipients.length > 0) {
            await MessageStatus.bulkCreate(
              recipients.map((uid) => ({
                message_id: message.id,
                user_id: uid,
                status: "sent",
              }))
            );
          }

          const fullMessage = await Message.findByPk(message.id, {
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
            ],
          });

          io.to(`channel_${chatId}`).emit("receive-message", fullMessage);
        } catch (e) {
          console.error("Error creating initial channel call message:", e);
        }
      }

      // Set server-side timeout for calling phase
      callRecord.timer = setTimeout(async () => {
        const call = activeCalls.get(callId);
        if (call && call.status === "calling") {
          console.log(`Timeout: Ending unanswered call ${callId}`);

          // Notify participants and invited users
          call.participants.forEach((participant) => {
            io.to(`user_${participant.userId}`).emit("call-ended", { callId });
            userCalls.delete(participant.userId);
          });

          call.invitedUsers.forEach((invitedUserId) => {
            io.to(`user_${invitedUserId}`).emit("call-ended", { callId });
          });

          // Update message
          if (call.messageId) {
            try {
              const msg = await Message.findByPk(call.messageId);
              if (msg) {
                let currentMeta = fixMetadata(msg.metadata) || {};
                const durationSec = 0;
                const wasMissedCall = call.acceptedUsers.size <= 1;
                await msg.update({
                  metadata: {
                    ...currentMeta,
                    call_status:
                      call.chatType === "dm"
                        ? wasMissedCall
                          ? "no_answer"
                          : "ended"
                        : "ended",
                    duration_sec: durationSec,
                    recipient_view:
                      call.chatType === "dm"
                        ? wasMissedCall
                          ? "missed"
                          : undefined
                        : undefined,
                    participant_count: call.acceptedUsers.size,
                    accepted_users: Array.from(call.acceptedUsers),
                  },
                });

                const updated = await Message.findByPk(msg.id, {
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
                  ],
                });

                if (call.chatType === "dm") {
                  io.to(`user_${call.initiator.userId}`).emit(
                    "message-updated",
                    updated
                  );
                  io.to(`user_${call.chatId}`).emit("message-updated", updated);
                } else {
                  io.to(`channel_${call.chatId}`).emit(
                    "message-updated",
                    updated
                  );
                }
              }
            } catch (e) {
              console.error("Error updating message on call timeout:", e);
            }
          }

          activeCalls.delete(callId);
        }
      }, 20000);

      // PUSH NOTIFICATION LOGIC - ADDED HERE
      // Prepare notification data for calls
      const notificationData = {
        callId,
        chatId,
        chatType,
        callType,
        chatName,
        initiator: {
          id: initiator.userId,
          name: initiator.name,
          avatar: initiator.avatar,
          profile_color: initiator.profile_color
        },
        type: "incoming_call",
        timestamp: new Date().toISOString()
      };

      // Send push notifications based on chat type
      if (chatType === "dm") {
        const targetUserId = chatId;

        // Get target user's player_id for push notification
        try {
          const targetUser = await User.findByPk(targetUserId, {
            attributes: ["id", "player_id", "name"]
          });

          if (targetUser && targetUser.player_id) {
            await sendCallPushNotification({
              recipient: targetUser,
              initiator: initiator,
              callType: callType,
              chatType: chatType,
              chatName: chatName,
              callId: callId,
              additionalData: notificationData
            });
          }
        } catch (error) {
          console.error('Error sending DM call push notification:', error);
        }

        // Existing socket notification logic for DM
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          const isBusy = userCalls.has(targetUserId);
          if (isBusy) {
            socket.emit("call-busy", {
              callId,
              targetUser: { name: chatName, id: targetUserId },
            });
          }
          io.to(`user_${targetUserId}`).emit("incoming-call", {
            callId,
            chatId,
            chatType,
            callType,
            chatName,
            initiator,
          });
        }
      } else if (chatType === "channel") {
        try {
          const channelMembers = await ChannelMember.findAll({
            where: { channel_id: chatId },
            include: [{
              model: User,
              attributes: ["id", "name", "avatar", "profile_color", "player_id"]
            }],
          });

          // Send push notifications to offline channel members
          const offlineMembers = channelMembers.filter(member =>
            member.user_id !== initiator.userId &&
            member.User.player_id &&
            !userSockets.has(member.user_id) // User is offline
          );

          if (offlineMembers.length > 0) {
            for (const member of offlineMembers) {
              await sendCallPushNotification({
                recipient: member.User,
                initiator: initiator,
                callType: callType,
                chatType: chatType,
                chatName: chatName,
                callId: callId,
                additionalData: notificationData
              });
            }
          }

          // Existing socket notification logic for channel
          channelMembers.forEach((member) => {
            if (member.user_id !== initiator.userId) {
              const memberSocketId = userSockets.get(member.user_id);
              if (memberSocketId) {
                io.to(`user_${member.user_id}`).emit("incoming-call", {
                  callId,
                  chatId,
                  chatType,
                  callType,
                  chatName,
                  initiator,
                });
              }
            }
          });
        } catch (error) {
          console.error("Error notifying channel members:", error);
        }
      }

      console.log(
        `Call ${callId} initiated by ${initiator.userId} in ${chatType} ${chatId}`
      );
    });

    socket.on("accept-call", async (data) => {
      const { callId, user } = data;
      const call = activeCalls.get(callId);

      if (!call) {
        console.error(`Call ${callId} not found`);
        return;
      }

      // Clear the calling timeout on first accept
      if (!call.acceptedTime && call.timer) {
        clearTimeout(call.timer);
        call.timer = null;
      }

      // Mark user as accepted and remove from invited
      call.acceptedUsers.add(user.userId);
      call.invitedUsers.delete(user.userId);

      // Set the actual call start time when first person accepts
      if (!call.acceptedTime) {
        call.acceptedTime = new Date();
        call.startTime = new Date();
      }

      // Add user to call participants with their join time
      call.participants.set(user.userId, {
        userId: user.userId,
        socketId: socket.id,
        name: user.name,
        avatar: user.avatar,
        profile_color: user.profile_color,
        joinedAt: new Date(),
        isAudioEnabled:
          user.isAudioEnabled !== undefined ? user.isAudioEnabled : true,
        isVideoEnabled:
          user.isVideoEnabled !== undefined
            ? user.isVideoEnabled
            : call.callType === "video",
        isScreenSharing: false,
      });

      userCalls.set(user.userId, callId);
      call.status = "connected";

      // Update call message to 'ongoing' status when first acceptance happens, and always update participant_count
      if (call.messageId) {
        try {
          const msg = await Message.findByPk(call.messageId);
          if (msg) {
            let currentMeta = fixMetadata(msg.metadata) || {};
            let updateData = {
              ...currentMeta,
              participant_count: call.participants.size,
            };
            if (currentMeta.call_status === "calling") {
              updateData.call_status = "ongoing";
              updateData.call_accepted_time = call.acceptedTime.toISOString();
            }
            await msg.update({
              metadata: updateData,
            });

            const updated = await Message.findByPk(msg.id, {
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
              ],
            });

            // Emit updated message to show 'In Call' status
            if (call.chatType === "dm") {
              io.to(`user_${call.initiator.userId}`).emit(
                "message-updated",
                updated
              );
              io.to(`user_${call.chatId}`).emit("message-updated", updated);
            } else {
              io.to(`channel_${call.chatId}`).emit("message-updated", updated);
            }
          }
        } catch (e) {
          console.error("Error updating call message to ongoing:", e);
        }
      }

      // Notify initiator and other participants
      call.participants.forEach((participant, participantId) => {
        if (participantId !== user.userId) {
          io.to(`user_${participantId}`).emit("call-accepted", {
            callId,
            userId: user.userId,
            user: {
              ...user,
              isAudioEnabled:
                user.isAudioEnabled !== undefined ? user.isAudioEnabled : true,
              isVideoEnabled:
                user.isVideoEnabled !== undefined
                  ? user.isVideoEnabled
                  : call.callType === "video",
            },
          });
        }
      });

      io.to(socket.id).emit("call-participants-sync", {
        callId,
        participants: Array.from(call.participants.entries()).map(
          ([userId, participant]) => ({
            userId,
            socketId: participant.socketId,
            name: participant.name,
            avatar: participant.avatar,
            profile_color: participant.profile_color,
            joinedAt: participant.joinedAt,
            isAudioEnabled: participant.isAudioEnabled,
            isVideoEnabled: participant.isVideoEnabled,
            isScreenSharing: participant.isScreenSharing || false,
          })
        ),
      });

      console.log(`User ${user.userId} accepted call ${callId}`);
    });

    socket.on("rejoin-call", async (data) => {
      const { callId, channelId, user } = data;
      const call = activeCalls.get(callId);

      if (!call || call.status !== "connected") {
        console.error(`Call ${callId} not found or not active`);
        return;
      }

      // Add user to call participants
      call.participants.set(user.userId, {
        userId: user.userId,
        socketId: socket.id,
        name: user.name,
        avatar: user.avatar,
        profile_color: user.profile_color,
        joinedAt: new Date(), // New join time for rejoining user
        isAudioEnabled: true,
        isVideoEnabled: user.callType === "video",
        isScreenSharing: false, // Added
      });

      // Add user to acceptedUsers set to track they're now part of the call
      call.acceptedUsers.add(user.userId);
      userCalls.set(user.userId, callId);

      // Get channel name for proper display
      let chatName = call.chatName;
      try {
        const channel = await Channel.findByPk(channelId, {
          attributes: ["name"],
        });
        if (channel) {
          chatName = channel.name;
        }
      } catch (error) {
        console.error("Error fetching channel name:", error);
      }

      // Update participant count in message metadata
      if (call.messageId) {
        try {
          const msg = await Message.findByPk(call.messageId);
          if (msg) {
            let currentMeta = fixMetadata(msg.metadata) || {};
            await msg.update({
              metadata: {
                ...currentMeta,
                participant_count: call.participants.size,
              },
            });

            const updated = await Message.findByPk(msg.id, {
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
              ],
            });

            // Send updated message to entire channel
            io.to(`channel_${call.chatId}`).emit("message-updated", updated);
          }
        } catch (e) {
          console.error("Error updating participant count:", e);
        }
      }

      // Notify existing participants about new joiner
      call.participants.forEach((participant, participantId) => {
        if (participantId !== user.userId) {
          io.to(`user_${participantId}`).emit("connect-with-participant", {
            callId,
            userId: user.userId,
            user: {
              userId: user.userId,
              socketId: socket.id,
              name: user.name,
              avatar: user.avatar,
              profile_color: user.profile_color,
              callType: user.callType,
            },
          });
        }
      });

      // Send current participants info to rejoining user with proper chatName
      socket.emit("rejoin-call-accepted", {
        callId,
        user: {
          ...user,
          channelId,
          callStartTime: call.acceptedTime, // Use accepted time, not initiation time
          chatName: chatName, // Include proper channel name
        },
        participants: Array.from(call.participants.entries())
          .filter(([userId]) => userId !== user.userId)
          .map(([userId, participant]) => ({
            userId,
            socketId: participant.socketId,
            name: participant.name,
            avatar: participant.avatar,
            profile_color: participant.profile_color,
            joinedAt: participant.joinedAt,
            isAudioEnabled: participant.isAudioEnabled,
            isVideoEnabled: participant.isVideoEnabled,
            isScreenSharing: participant.isScreenSharing || false,
          })),
        chatName: chatName, // Include chatName at top level too
      });

      console.log(`User ${user.userId} rejoined call ${callId} in channel ${chatName}`);
    });

    socket.on("decline-call", async (data) => {
      const { callId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`Call ${callId} not found`);
        return;
      }

      // Remove user from invited list
      call.invitedUsers.delete(userId);

      if (call.chatType === "dm") {
        // For DM, decline ends the call
        io.to(`user_${call.initiator.userId}`).emit("call-declined", {
          callId,
          userId,
        });

        // End call for both participants
        call.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit("call-ended", { callId });
          userCalls.delete(participant.userId);
        });

        // Update the initial call message to reflect missed/no_answer
        if (call.messageId) {
          try {
            const msg = await Message.findByPk(call.messageId);
            if (msg) {
              let currentMeta = fixMetadata(msg.metadata) || {};
              await msg.update({
                metadata: {
                  ...currentMeta,
                  call_status: "no_answer",
                  recipient_view: "missed",
                  accepted_users: Array.from(call.acceptedUsers),
                },
              });

              const updated = await Message.findByPk(msg.id, {
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
                ],
              });
              io.to(`user_${call.initiator.userId}`).emit(
                "message-updated",
                updated
              );
              io.to(`user_${call.chatId}`).emit("message-updated", updated);
            }
          } catch (e) {
            console.error("Error updating call message to missed:", e);
          }
        }

        activeCalls.delete(callId);
        userCalls.delete(call.initiator.userId);
      } else {
        // For channel calls - notify decline
        console.log(
          `User ${userId} declined channel call ${callId}, checking call status`
        );

        // Notify the initiator about the decline
        io.to(`user_${call.initiator.userId}`).emit("call-declined", {
          callId,
          userId,
        });

        // Check if all invited users have declined or left
        const allDeclined =
          call.invitedUsers.size === 0 && call.acceptedUsers.size <= 1;

        if (allDeclined) {
          console.log(`All invited users declined call ${callId}, ending call`);

          // End the call and update message for all participants
          call.participants.forEach((participant) => {
            io.to(`user_${participant.userId}`).emit("call-ended", { callId });
            userCalls.delete(participant.userId);
          });

          call.invitedUsers.forEach((invitedUserId) => {
            io.to(`user_${invitedUserId}`).emit("call-ended", { callId });
          });

          if (call.messageId) {
            try {
              const msg = await Message.findByPk(call.messageId);
              if (msg) {
                let currentMeta = fixMetadata(msg.metadata) || {};
                const durationSec = 0;
                await msg.update({
                  metadata: {
                    ...currentMeta,
                    call_status: "ended",
                    duration_sec: durationSec,
                    participant_count: call.acceptedUsers.size,
                    accepted_users: Array.from(call.acceptedUsers),
                  },
                });

                const updated = await Message.findByPk(msg.id, {
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
                  ],
                });

                io.to(`channel_${call.chatId}`).emit(
                  "message-updated",
                  updated
                );
              }
            } catch (e) {
              console.error("Error updating channel call message:", e);
            }
          }

          activeCalls.delete(callId);
        } else {
          // Call continues with remaining participants/invited users
          activeCalls.set(callId, call);
        }
      }

      console.log(`Call ${callId} - User ${userId} declined`);
    });

    socket.on("end-call", async (data) => {
      const { callId, isInitiator, chatType } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`Call ${callId} not found`);
        return;
      }

      call.participants.delete(userId);
      userCalls.delete(userId);
      if (activeScreenShares.get(callId) === userId) {
        activeScreenShares.delete(callId);
        call.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit(
            "participant-screen-share-stopped",
            {
              callId,
              userId,
            }
          );
        });
      }

      // Clean up remote control if participant was involved
      const rc = activeRemoteControls.get(callId);
      if (rc && (rc.controllerId === userId || rc.targetId === userId)) {
        activeRemoteControls.delete(callId);
        call.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit(
            "remote-control-stopped",
            { callId, userId }
          );
        });
      }

      const shouldEndCall = call.participants.size < 2;

      if (shouldEndCall) {
        console.log(
          `Ending call ${callId} - fewer than 2 participants remaining`
        );

        // Notify remaining participants
        call.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit("call-ended", { callId });
          userCalls.delete(participant.userId);
        });

        // Notify invited users if call was still in calling phase (fixes DM modal issue)
        if (call.status === "calling" || call.invitedUsers.size > 0) {
          call.invitedUsers.forEach((invitedUserId) => {
            io.to(`user_${invitedUserId}`).emit("call-ended", { callId });
          });
        }

        // Handle channel call message updates with missed call logic
        if (call.chatType === "channel") {
          try {
            if (call.messageId) {
              const originalMsg = await Message.findByPk(call.messageId);
              if (originalMsg) {
                let currentMeta = fixMetadata(originalMsg.metadata) || {};
                const durationSec = call.acceptedTime
                  ? Math.max(
                      1,
                      Math.floor(
                        (Date.now() - new Date(call.acceptedTime).getTime()) /
                          1000
                      )
                    )
                  : 0;

                // Update main message for participants (those who joined the call)
                await originalMsg.update({
                  metadata: {
                    ...currentMeta,
                    call_status: "ended",
                    duration_sec: durationSec,
                    participant_count: call.acceptedUsers.size,
                    accepted_users: Array.from(call.acceptedUsers),
                  },
                });
                // Send updated original message to participants only
                const updatedOriginal = await Message.findByPk(call.messageId, {
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
                  ],
                });

                // Send to entire channel (non-joiners will render as missed via client logic)
                io.to(`channel_${call.chatId}`).emit(
                  "message-updated",
                  updatedOriginal
                );
              }
            }
          } catch (error) {
            console.error(
              "Error handling channel call end with missed calls:",
              error
            );
          }
        } else {
          // Handle DM calls (existing logic)
          if (call.messageId) {
            try {
              const msg = await Message.findByPk(call.messageId);
              if (msg) {
                let currentMeta = fixMetadata(msg.metadata) || {};
                const durationSec = call.acceptedTime
                  ? Math.max(
                      1,
                      Math.floor(
                        (Date.now() - new Date(call.acceptedTime).getTime()) /
                          1000
                      )
                    )
                  : 0;

                const wasMissedCall = call.acceptedUsers.size <= 1;

                await msg.update({
                  metadata: {
                    ...currentMeta,
                    call_status: wasMissedCall ? "no_answer" : "ended",
                    duration_sec: durationSec,
                    recipient_view: wasMissedCall ? "missed" : undefined,
                    participant_count: call.acceptedUsers.size,
                    accepted_users: Array.from(call.acceptedUsers),
                  },
                });

                const updated = await Message.findByPk(msg.id, {
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
                  ],
                });

                io.to(`user_${call.initiator.userId}`).emit(
                  "message-updated",
                  updated
                );
                io.to(`user_${call.chatId}`).emit("message-updated", updated);
              }
            } catch (e) {
              console.error("Error updating DM call message:", e);
            }
          }
        }

        activeCalls.delete(callId);
        activeScreenShares.delete(callId);
      } else {
        // Call continues with remaining participants
        console.log(`User ${userId} left call ${callId}, but call continues`);

        if (call.messageId) {
          try {
            const msg = await Message.findByPk(call.messageId);
            if (msg) {
              let currentMeta = fixMetadata(msg.metadata) || {};
              await msg.update({
                metadata: {
                  ...currentMeta,
                  participant_count: call.participants.size,
                },
              });

              const updated = await Message.findByPk(msg.id, {
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
                ],
              });

              if (call.chatType === "channel") {
                // Send to entire channel
                io.to(`channel_${call.chatId}`).emit(
                  "message-updated",
                  updated
                );
              }
            }
          } catch (e) {
            console.error("Error updating participant count on leave:", e);
          }
        }

        call.participants.forEach((participant) => {
          io.to(`user_${participant.userId}`).emit("participant-left", {
            callId,
            userId,
            remainingParticipants: Array.from(call.participants.keys()),
          });
        });

        activeCalls.set(callId, call);
      }
    });

    socket.on("webrtc-offer", (data) => {
      const { callId, targetUserId, offer } = data;
      const fromUserId = socket.userId;

      io.to(`user_${targetUserId}`).emit("webrtc-offer", {
        callId,
        fromUserId,
        offer,
      });
    });

    socket.on("webrtc-answer", (data) => {
      const { callId, targetUserId, answer } = data;
      const fromUserId = socket.userId;

      io.to(`user_${targetUserId}`).emit("webrtc-answer", {
        callId,
        fromUserId,
        answer,
      });
    });

    socket.on("ice-candidate", (data) => {
      const { callId, targetUserId, candidate } = data;
      const fromUserId = socket.userId;

      io.to(`user_${targetUserId}`).emit("ice-candidate", {
        callId,
        fromUserId,
        candidate,
      });
    });

    socket.on("toggle-video", (data) => {
      const { callId, isVideoEnabled } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (call) {
        // Update the stored participant state
        const participant = call.participants.get(userId);
        if (participant) {
          participant.isVideoEnabled = isVideoEnabled;
          call.participants.set(userId, participant);
        }

        // Notify other participants
        call.participants.forEach((participant) => {
          if (participant.userId !== userId) {
            io.to(`user_${participant.userId}`).emit(
              "participant-toggle-video",
              {
                callId,
                userId,
                isVideoEnabled,
              }
            );
          }
        });
      }
    });

    socket.on("toggle-audio", (data) => {
      const { callId, isAudioEnabled } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (call) {
        // Update the stored participant state
        const participant = call.participants.get(userId);
        if (participant) {
          participant.isAudioEnabled = isAudioEnabled;
          call.participants.set(userId, participant);
        }

        // Notify other participants
        call.participants.forEach((participant) => {
          if (participant.userId !== userId) {
            io.to(`user_${participant.userId}`).emit(
              "participant-toggle-audio",
              {
                callId,
                userId,
                isAudioEnabled,
              }
            );
          }
        });
      }
    });

    socket.on("member-added-to-channel", ({ channelId, userIds, channel }) => {
      // Notify all added members
      userIds.forEach((userId) => {
        io.to(`user_${userId}`).emit("channel-added", channel);

        // Handle multiple sockets for the user
        const memberSocketIds = userSockets.get(userId);
        if (memberSocketIds) {
          memberSocketIds.forEach((memberSocketId) => {
            const memberSocket = io.sockets.sockets.get(memberSocketId);
            if (memberSocket) {
              memberSocket.join(`channel_${channelId}`);
              console.log(
                `User ${userId} auto-joined channel_${channelId} after being added`
              );
            }
          });
        }
      });

      io.to(`channel_${channelId}`).emit("member-added-to-channel", {
        channelId,
        newMemberIds: userIds,
        channel,
      });
    });

    socket.on("join-channel", (channelId) => {
      socket.join(`channel_${channelId}`);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    socket.on("typing", (data) => {
      if (data.channelId) {
        socket.to(`channel_${data.channelId}`).emit("typing", {
          channelId: data.channelId,
          userId: data.userId,
          userName: data.userName,
          isTyping: data.isTyping,
        });
        console.log(`Typing indicator sent to channel_${data.channelId}`);
      } else if (data.recipientId && data.senderId) {
        // Direct message typing - send to recipient's personal room
        io.to(`user_${data.recipientId}`).emit("typing", {
          senderId: data.senderId,
          recipientId: data.recipientId,
          userId: data.userId,
          userName: data.userName,
          isTyping: data.isTyping,
        });
        console.log(
          `Direct typing indicator sent from user_${data.senderId} to user_${data.recipientId}`
        );
      }
    });

    socket.on("message-delivered", async ({ messageId, senderId }) => {
      const userId = socket.userId;
      if (!userId || !messageId) return;

      try {
        const [affectedCount] = await MessageStatus.update(
          { status: "delivered", updated_at: new Date() },
          {
            where: {
              message_id: messageId,
              user_id: userId,
              // status: "sent",
            },
          }
        );

        if (affectedCount > 0) {
          // Emit to the sender that this user has received the message
          io.to(`user_${senderId}`).emit("message-status-updated", {
            messageId,
            userId: userId,
            status: "delivered",
            updated_at: new Date().toISOString(),
          });
          console.log(`Message ${messageId} marked as delivered by user ${userId}`);
        }
      } catch (error) {
        console.error("Error updating message delivered status:", error);
      }
    });

    socket.on("mark-last-message-seen", async ({ lastMessageId, channelId, recipientId }) => {
      if (!lastMessageId || !socket.userId) return;

      try {
        // Get the last message
        const lastMessage = await Message.findOne({
          where: { id: lastMessageId },
          attributes: ["id", "created_at", "channel_id", "sender_id", "recipient_id"],
        });

        if (!lastMessage) return;

        // Determine chat context
        let whereCondition = {};
        if (channelId) {
          whereCondition = {
            channel_id: channelId,
            created_at: { [Op.lte]: lastMessage.created_at },
          };
        } else if (recipientId) {
          whereCondition = {
            [Op.or]: [
              { sender_id: socket.userId, recipient_id: recipientId, created_at: { [Op.lte]: lastMessage.created_at } },
              { sender_id: recipientId, recipient_id: socket.userId, created_at: { [Op.lte]: lastMessage.created_at } },
            ],
          };
        }

        // Find messages to mark as seen
        const messagesToMark = await Message.findAll({
          where: whereCondition,
          attributes: ["id", "sender_id"],
        });

        const messageIds = messagesToMark.map((m) => m.id);

        // Update to delivered first
        const [deliveredCount] = await MessageStatus.update(
          { status: "delivered", updated_at: new Date() },
          {
            where: {
              message_id: messageIds,
              user_id: socket.userId,
              status: "sent",
            },
          }
        );

        // Update to seen
        const [seenCount] = await MessageStatus.update(
          { status: "seen", updated_at: new Date() },
          {
            where: {
              message_id: messageIds,
              user_id: socket.userId,
              status: { [Op.ne]: "seen" },
            },
          }
        );

        // Notify senders with message-status-updated for each message
        const messagesBySender = {};
        messagesToMark.forEach((message) => {
          if (message.sender_id !== socket.userId) {
            if (!messagesBySender[message.sender_id]) {
              messagesBySender[message.sender_id] = [];
            }
            messagesBySender[message.sender_id].push(message.id);
          }
        });

        for (const [senderId, messageIds] of Object.entries(messagesBySender)) {
          messageIds.forEach((messageId) => {
            // Emit delivered status update (if applicable)
            if (deliveredCount > 0) {
              io.to(`user_${senderId}`).emit("message-status-updated", {
                messageId,
                userId: socket.userId,
                status: "delivered",
                updated_at: new Date().toISOString(),
              });
            }
            // Emit seen status update
            if (seenCount > 0) {
              io.to(`user_${senderId}`).emit("message-status-updated", {
                messageId,
                userId: socket.userId,
                status: "seen",
                updated_at: new Date().toISOString(),
              });
            }
          });
        }
      } catch (error) {
        console.error("Error updating message seen status:", error);
      }
    });
      
    socket.on("message-seen", async ({ messageIds, userId }) => {
      if (!Array.isArray(messageIds) || !socket.userId || messageIds.length === 0) return;

      try {
        // First update to delivered if not already
        await MessageStatus.update(
          { status: "delivered", updated_at: new Date() },
          {
            where: {
              message_id: messageIds,
              user_id: socket.userId,
              status: "sent",
            },
          }
        );

        // Then update to seen
        const [affectedCount] = await MessageStatus.update(
          { status: "seen", updated_at: new Date() },
          {
            where: {
              message_id: messageIds,
              user_id: socket.userId,
              status: { [Op.ne]: "seen" },
            },
          }
        );

        if (affectedCount > 0) {
          // Emit to the sender for each message
          messageIds.forEach((messageId) => {
            io.to(`user_${userId}`).emit("message-status-updated", {
              messageId: messageId,
              userId: socket.userId,
              status: "seen",
              updated_at: new Date().toISOString(),
            });
          });

          // Emit messages-read event to handle unread count updates
          io.to(`user_${userId}`).emit("messages-read", {
            readerId: socket.userId,
          });
        }
      } catch (error) {
        console.error("Error updating message seen status:", error);
      }
    });

    socket.on("mark-messages-read", async ({ chatId, type }) => {
      const userId = socket.userId;
      if (!userId) return;

      try {
        if (type === "channel") {
          await MessageStatus.update(
            { status: "seen" },
            {
              where: {
                user_id: userId,
                status: { [Op.ne]: "seen" },
              },
              include: [
                {
                  model: Message,
                  as: "message",
                  where: { channel_id: chatId },
                },
              ],
            }
          );
        } else {
          await MessageStatus.update(
            { status: "seen" },
            {
              where: {
                user_id: userId,
                status: { [Op.ne]: "seen" },
              },
              include: [
                {
                  model: Message,
                  as: "message",
                  where: {
                    [Op.or]: [
                      { sender_id: chatId, recipient_id: userId },
                      { sender_id: userId, recipient_id: chatId },
                    ],
                  },
                },
              ],
            }
          );
        }

        if (type === "dm") {
          io.to(`user_${chatId}`).emit("messages-read", {
            readerId: userId,
          });
        } else {
          const channelMembers = await ChannelMember.findAll({
            where: { channel_id: chatId },
            attributes: ["user_id"],
          });

          channelMembers.forEach((member) => {
            if (member.user_id !== userId) {
              io.to(`user_${member.user_id}`).emit("messages-read", {
                channelId: chatId,
                readerId: userId,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("sync-participant-state", (data) => {
      const { callId, targetUserId, audioState, videoState } = data;
      const fromUserId = socket.userId;
      io.to(`user_${targetUserId}`).emit("sync-participant-state", {
        callId,
        fromUserId,
        audioState,
        videoState,
      });
    });

    // ========== Attendance Module Socket Events ==========

    // Join attendance team room for real-time updates
    socket.on("attendance:join-team", (teamId) => {
      if (teamId) {
        socket.join(`team-${teamId}`);
      }
    });

    // Leave attendance team room
    socket.on("attendance:leave-team", (teamId) => {
      if (teamId) {
        socket.leave(`team-${teamId}`);
      }
    });

    // ========== End Attendance Module ==========

    socket.on("disconnect", async () => {
      const userId = socketUsers.get(socket.id);
      if (!userId) {
        console.log(`No userId associated with socket ${socket.id} on disconnect`);
        return;
      }

      // Remove the socket from the user's socket set
      if (userSockets.has(userId)) {
        const socketSet = userSockets.get(userId);
        socketSet.delete(socket.id);

        if (socketSet.size === 0) {
          userSockets.delete(userId);

          try {
            // Update user status to offline only if no sockets remain
            await updateUserStatus(userId, "offline");
            socket.broadcast.emit("user-status-update", {
              userId,
              status: "offline",
              lastSeen: new Date().toISOString(),
            });
            console.log(`User ${userId} went offline`);
          } catch (error) {
            console.error(`Error setting user ${userId} to offline:`, error);
          }
        } else {
          console.log(`User ${userId} still online with ${socketSet.size} active sessions`);
        }
      }

      // Handle call state regardless of socket count (user leaves call on disconnect)
      const callId = userCalls.get(userId);
      if (callId) {
        const call = activeCalls.get(callId);
        if (call) {
          if (activeScreenShares.get(callId) === userId) {
            activeScreenShares.delete(callId);
            call.participants.forEach((participant) => {
              io.to(`user_${participant.userId}`).emit(
                "participant-screen-share-stopped",
                {
                  callId,
                  userId,
                }
              );
            });
          }
          // Clean up remote control on disconnect
          const rcDisconnect = activeRemoteControls.get(callId);
          if (rcDisconnect && (rcDisconnect.controllerId === userId || rcDisconnect.targetId === userId)) {
            activeRemoteControls.delete(callId);
            call.participants.forEach((participant) => {
              io.to(`user_${participant.userId}`).emit(
                "remote-control-stopped",
                { callId, userId }
              );
            });
          }
          // Check if the user is the initiator and the call is in "calling" state (for channel calls)
          if (
            call.initiator.userId === userId &&
            call.status === "calling" &&
            call.chatType === "channel"
          ) {
            console.log(
              `Initiator ${userId} disconnected during calling phase, ending call ${callId}`
            );

            // Notify all invited users and participants
            call.participants.forEach((participant) => {
              io.to(`user_${participant.userId}`).emit("call-ended", {
                callId,
              });
              userCalls.delete(participant.userId);
            });
            call.invitedUsers.forEach((invitedUserId) => {
              io.to(`user_${invitedUserId}`).emit("call-ended", { callId });
            });

            // Update the call message to "ended"
            if (call.messageId) {
              try {
                const msg = await Message.findByPk(call.messageId);
                if (msg) {
                  let currentMeta = fixMetadata(msg.metadata) || {};
                  await msg.update({
                    metadata: {
                      ...currentMeta,
                      call_status: "ended",
                      duration_sec: 0,
                      participant_count: call.acceptedUsers.size,
                      accepted_users: Array.from(call.acceptedUsers),
                    },
                  });

                  const updated = await Message.findByPk(msg.id, {
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
                    ],
                  });

                  io.to(`channel_${call.chatId}`).emit(
                    "message-updated",
                    updated
                  );
                }
              } catch (e) {
                console.error(
                  "Error updating call message on initiator disconnect:",
                  e
                );
              }
            }

            activeCalls.delete(callId);
            activeScreenShares.delete(callId);
          } else {
            // Existing logic for other cases (participant leaving or call continuing)
            call.participants.delete(userId);
            userCalls.delete(userId);

            const shouldEndCall = call.participants.size < 2;

            if (shouldEndCall) {
              console.log(
                `Ending call ${callId} - fewer than 2 participants remaining`
              );

              call.participants.forEach((participant) => {
                io.to(`user_${participant.userId}`).emit("call-ended", {
                  callId,
                });
                userCalls.delete(participant.userId);
              });

              if (call.status === "calling" || call.invitedUsers.size > 0) {
                call.invitedUsers.forEach((invitedUserId) => {
                  io.to(`user_${invitedUserId}`).emit("call-ended", { callId });
                });
              }

              if (call.messageId) {
                try {
                  const msg = await Message.findByPk(call.messageId);
                  if (msg) {
                    let currentMeta = fixMetadata(msg.metadata) || {};
                    const durationSec = call.acceptedTime
                      ? Math.max(
                          1,
                          Math.floor(
                            (Date.now() -
                              new Date(call.acceptedTime).getTime()) /
                              1000
                          )
                        )
                      : 0;

                    const wasMissedCall = call.acceptedUsers.size <= 1;

                    await msg.update({
                      metadata: {
                        ...currentMeta,
                        call_status:
                          wasMissedCall && call.chatType === "dm"
                            ? "no_answer"
                            : "ended",
                        duration_sec: durationSec,
                        recipient_view:
                          wasMissedCall && call.chatType === "dm"
                            ? "missed"
                            : undefined,
                        participant_count: call.acceptedUsers.size,
                        accepted_users: Array.from(call.acceptedUsers),
                      },
                    });

                    const updated = await Message.findByPk(msg.id, {
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
                      ],
                    });

                    if (call.chatType === "dm") {
                      io.to(`user_${call.initiator.userId}`).emit(
                        "message-updated",
                        updated
                      );
                      io.to(`user_${call.chatId}`).emit(
                        "message-updated",
                        updated
                      );
                    } else {
                      io.to(`channel_${call.chatId}`).emit(
                        "message-updated",
                        updated
                      );
                    }
                  }
                } catch (error) {
                  console.error(
                    `Error handling call ${callId} message on disconnect:`,
                    error
                  );
                }
              }

              activeCalls.delete(callId);
            } else {
              call.participants.forEach((participant) => {
                io.to(`user_${participant.userId}`).emit("participant-left", {
                  callId,
                  userId,
                  remainingParticipants: Array.from(call.participants.keys()),
                });
              });

              if (call.messageId) {
                try {
                  const msg = await Message.findByPk(call.messageId);
                  if (msg) {
                    let currentMeta = fixMetadata(msg.metadata) || {};
                    await msg.update({
                      metadata: {
                        ...currentMeta,
                        participant_count: call.participants.size,
                      },
                    });

                    const updated = await Message.findByPk(msg.id, {
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
                      ],
                    });

                    if (call.chatType === "channel") {
                      io.to(`channel_${call.chatId}`).emit(
                        "message-updated",
                        updated
                      );
                    }
                  }
                } catch (e) {
                  console.error(
                    "Error updating participant count on leave:",
                    e
                  );
                }
              }

              activeCalls.set(callId, call);
            }
          }
        }
      }

      // Clean up socket-user mapping
      socketUsers.delete(socket.id);
      console.log(`User ${userId} disconnected from socket ${socket.id}`);
    });

    socket.on("start-screen-share", (data) => {
      const { callId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`Call ${callId} not found for screen share`);
        return;
      }

      const currentSharer = activeScreenShares.get(callId);

      if (currentSharer && currentSharer !== userId) {
        io.to(`user_${currentSharer}`).emit("force-stop-screen-share", {
          callId,
          newSharerId: userId,
        });
      }

      activeScreenShares.set(callId, userId);

      const participant = call.participants.get(userId);
      if (participant) {
        participant.isScreenSharing = true;
        call.participants.set(userId, participant);
      }

      call.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          io.to(`user_${participant.userId}`).emit(
            "participant-screen-share-started",
            {
              callId,
              userId,
            }
          );
        }
      });

      console.log(`User ${userId} started screen sharing in call ${callId}`);
    });

    socket.on("stop-screen-share", (data) => {
      const { callId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`Call ${callId} not found for screen share stop`);
        return;
      }

      if (activeScreenShares.get(callId) === userId) {
        activeScreenShares.delete(callId);
      }

      // Stop remote control if screen sharer was being controlled
      const rcStop = activeRemoteControls.get(callId);
      if (rcStop && rcStop.targetId === userId) {
        activeRemoteControls.delete(callId);
        call.participants.forEach((p) => {
          io.to(`user_${p.userId}`).emit("remote-control-stopped", {
            callId,
            userId,
          });
        });
      }

      const participant = call.participants.get(userId);
      if (participant) {
        participant.isScreenSharing = false;
        call.participants.set(userId, participant);
      }

      call.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          io.to(`user_${participant.userId}`).emit(
            "participant-screen-share-stopped",
            {
              callId,
              userId,
            }
          );
        }
      });

      console.log(`User ${userId} stopped screen sharing in call ${callId}`);
    });

    // ============================================================
    // REMOTE CONTROL EVENTS
    // ============================================================

    socket.on("request-remote-control", (data) => {
      const { callId, targetUserId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`[RC] Call ${callId} not found for remote control request`);
        return;
      }

      const targetParticipant = call.participants.get(targetUserId);
      if (!targetParticipant || !targetParticipant.isScreenSharing) {
        console.log(`[RC] Target ${targetUserId} not sharing screen`);
        return;
      }

      const existing = activeRemoteControls.get(callId);
      if (existing) {
        console.log(`[RC] Remote control already active in call ${callId}`);
        return;
      }

      const requester = call.participants.get(userId);
      const requesterName = requester ? requester.name : "Unknown";

      io.to(`user_${targetUserId}`).emit("remote-control-request", {
        callId,
        requesterId: userId,
        requesterName,
      });

      console.log(`[RC] User ${userId} requested remote control of ${targetUserId} in call ${callId}`);
    });

    socket.on("accept-remote-control", (data) => {
      const { callId, requesterId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) {
        console.log(`[RC] Call ${callId} not found for remote control accept`);
        return;
      }

      activeRemoteControls.set(callId, {
        controllerId: requesterId,
        targetId: userId,
      });

      io.to(`user_${requesterId}`).emit("remote-control-accepted", {
        callId,
        targetUserId: userId,
      });

      console.log(`[RC] User ${userId} accepted remote control from ${requesterId} in call ${callId}`);
    });

    socket.on("deny-remote-control", (data) => {
      const { callId, requesterId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) return;

      io.to(`user_${requesterId}`).emit("remote-control-denied", {
        callId,
        targetUserId: userId,
      });

      console.log(`[RC] User ${userId} denied remote control from ${requesterId} in call ${callId}`);
    });

    socket.on("stop-remote-control", (data) => {
      const { callId } = data;
      const userId = socket.userId;
      const call = activeCalls.get(callId);

      if (!call) return;

      const rc = activeRemoteControls.get(callId);
      if (!rc) return;

      activeRemoteControls.delete(callId);

      call.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          io.to(`user_${participant.userId}`).emit("remote-control-stopped", {
            callId,
            userId,
          });
        }
      });

      console.log(`[RC] Remote control stopped by ${userId} in call ${callId}`);
    });

    // ============================================================
    // VIRTUAL OFFICE EVENTS
    // ============================================================

    // Helper: build user data object from DB user record
    const buildVOUserData = (dbUser) => ({
      id: String(dbUser.id),
      name: dbUser.name || "Usuario",
      first_name: dbUser.name || "",
      last_name: "",
      avatar: dbUser.avatar || null,
      profile_color: (dbUser.profile_color && dbUser.profile_color !== "0") ? dbUser.profile_color : "#5579F8",
      status: dbUser.is_online ? (dbUser.is_away ? "away" : "online") : "offline",
    });

    // Get current state of all rooms - includes ALL online team users
    socket.on("vo:get-rooms", async () => {
      try {
        // Fetch ALL users who are online from the database
        const onlineUsers = await User.findAll({
          where: { is_online: true },
          attributes: ["id", "name", "avatar", "profile_color", "is_online", "is_away"],
        });

        // Ensure all online users that are NOT yet in a room get placed in "inactivos"
        for (const dbUser of onlineUsers) {
          const uid = dbUser.id;
          if (!voUserRoom.has(uid)) {
            const userData = buildVOUserData(dbUser);
            voUserRoom.set(uid, "inactivos");
            if (voRooms.has("inactivos")) {
              voRooms.get("inactivos").set(uid, userData);
            }
          } else {
            // Update user data in their current room (name, avatar may have changed)
            const currentRoom = voUserRoom.get(uid);
            if (voRooms.has(currentRoom)) {
              const userData = buildVOUserData(dbUser);
              voRooms.get(currentRoom).set(uid, userData);
            }
          }
        }

        // Remove users who are no longer online from all rooms
        for (const [roomId, usersMap] of voRooms.entries()) {
          for (const [uid] of usersMap.entries()) {
            const isStillOnline = onlineUsers.some(u => u.id == uid);
            if (!isStillOnline) {
              usersMap.delete(uid);
              voUserRoom.delete(uid);
            }
          }
        }

        // Build response
        const roomsState = [];
        for (const [roomId, usersMap] of voRooms.entries()) {
          roomsState.push({
            roomId,
            users: Array.from(usersMap.values()),
          });
        }

        socket.emit("vo:rooms-state", roomsState);
        console.log(`[VO] Sent rooms state to user ${socket.userId}: ${onlineUsers.length} online users`);
      } catch (error) {
        console.error("[VO] Error getting rooms state:", error);
        // Send empty rooms state as fallback
        const roomsState = [];
        for (const [roomId, usersMap] of voRooms.entries()) {
          roomsState.push({ roomId, users: Array.from(usersMap.values()) });
        }
        socket.emit("vo:rooms-state", roomsState);
      }
    });

    // User joins a virtual office room
    socket.on("vo:join-room", async (data) => {
      const userId = socket.userId;
      if (!userId || !data?.roomId) return;

      const roomId = data.roomId;
      if (!voRooms.has(roomId)) {
        console.log(`[VO] Room ${roomId} not found`);
        return;
      }

      // Leave current room first
      const currentRoom = voUserRoom.get(userId);
      if (currentRoom && currentRoom !== roomId) {
        const oldRoom = voRooms.get(currentRoom);
        if (oldRoom) {
          oldRoom.delete(userId);
          io.emit("vo:user-left-room", { roomId: currentRoom, userId: String(userId) });
        }
      }

      // Fetch user info from DB
      try {
        const dbUser = await User.findByPk(userId, {
          attributes: ["id", "name", "avatar", "profile_color", "is_online", "is_away"],
        });
        if (!dbUser) return;

        const userData = buildVOUserData(dbUser);

        // Add user to new room
        voRooms.get(roomId).set(userId, userData);
        voUserRoom.set(userId, roomId);

        // Broadcast to everyone
        io.emit("vo:user-joined-room", { roomId, user: userData });
        console.log(`[VO] User ${userId} (${userData.name}) joined room ${roomId}`);
      } catch (error) {
        console.error(`[VO] Error joining room:`, error);
      }
    });

    // User leaves a virtual office room
    socket.on("vo:leave-room", (data) => {
      const userId = socket.userId;
      if (!userId || !data?.roomId) return;

      const roomId = data.roomId;
      const room = voRooms.get(roomId);
      if (room) {
        room.delete(userId);
      }
      voUserRoom.delete(userId);

      io.emit("vo:user-left-room", { roomId, userId: String(userId) });
      console.log(`[VO] User ${userId} left room ${roomId}`);
    });

    // Quick message from virtual office
    socket.on("vo:send-quick-message", (data) => {
      const userId = socket.userId;
      if (!userId || !data?.targetUserId) return;

      const { targetUserId, content, type, senderName } = data;

      io.to(`user_${targetUserId}`).emit("vo:quick-message-received", {
        senderId: String(userId),
        senderName: senderName || "Usuario",
        content,
        type,
        timestamp: new Date().toISOString(),
      });

      console.log(`[VO] Quick message from ${userId} to ${targetUserId} (${type})`);
    });

    // Clean up virtual office on disconnect
    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (!userId) return;

      // Only remove from VO if user has no other sockets
      const remainingSockets = userSockets.get(userId);
      const hasOtherSockets = remainingSockets && remainingSockets.size > 0;

      if (!hasOtherSockets) {
        const currentRoom = voUserRoom.get(userId);
        if (currentRoom) {
          const room = voRooms.get(currentRoom);
          if (room) {
            room.delete(userId);
          }
          voUserRoom.delete(userId);
          io.emit("vo:user-left-room", { roomId: currentRoom, userId: String(userId) });
          console.log(`[VO] User ${userId} disconnected, removed from room ${currentRoom}`);
        }
      }
    });

  });
};
