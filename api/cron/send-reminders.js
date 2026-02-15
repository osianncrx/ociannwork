const cron = require('node-cron');
const { Reminder, Message, User, MessageStatus, ChannelMember, MessageReaction, MessageFavorite, MessagePin } = require('../models');
const { Op } = require('sequelize');

async function sendDueReminders(io) {
    const now = new Date();
    const dueReminders = await Reminder.findAll({
        where: { is_sent: false, remind_at: { [Op.lte]: now } }
    });

    for (const reminder of dueReminders) {
        try {
            // Create the reminder message
            const firedMsg = await Message.create({
                team_id: reminder.team_id,
                sender_id: reminder.user_id,
                channel_id: reminder.channel_id || null,
                recipient_id: reminder.channel_id ? null : reminder.recipient_id,
                message_type: 'reminder',
                content: reminder.note || '',
                metadata: JSON.stringify({ reminder_id: reminder.id, fired: true })
            });

            // Determine recipients (same logic as createMessage)
            const recipients = [];
            if (reminder.recipient_id) {
                recipients.push(reminder.recipient_id);
            } else if (reminder.channel_id) {
                // Get channel members (excluding the reminder creator)
                const members = await ChannelMember.findAll({
                    where: {
                        channel_id: reminder.channel_id,
                        user_id: { [Op.ne]: reminder.user_id },
                    },
                    attributes: ["user_id"],
                    raw: true,
                });
                members.forEach((m) => recipients.push(m.user_id));
            }

            // Create message statuses for all recipients
            if (recipients.length > 0) {
                const statusData = recipients.map((uid) => ({
                    message_id: firedMsg.id,
                    user_id: uid,
                    status: "sent",
                }));
                await MessageStatus.bulkCreate(statusData);
            }

            // Load full message with associations
            const fullMessage = await Message.findByPk(firedMsg.id, {
                include: [
                    {
                        model: User,
                        as: "sender",
                        attributes: ["id", "name", "avatar"],
                    },
                    {
                        model: User,
                        as: "recipient",
                        attributes: ["id", "name", "avatar"],
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
                        where: { user_id: reminder.user_id },
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
            });

            const messageWithUserId = {
                ...fullMessage.toJSON(),
                currentUserId: reminder.user_id
            };

            // Emit socket events (same pattern as createMessage)
            if (reminder.recipient_id) {
                const isPersonalMessage = reminder.user_id == reminder.recipient_id;
                if (isPersonalMessage) {
                    io.to(`user_${reminder.user_id}`).emit("receive-message", messageWithUserId);
                } else {
                    io.to(`user_${reminder.user_id}`).emit("receive-message", messageWithUserId);
                    io.to(`user_${reminder.recipient_id}`).emit("receive-message", messageWithUserId);
                }

                // Emit status update
                io.to(`user_${reminder.user_id}`).emit("message-status-updated", {
                    messageId: fullMessage.id,
                    status: "sent",
                });
            } else if (reminder.channel_id) {
                io.to(`channel_${reminder.channel_id}`).emit("receive-message", messageWithUserId);
            }

            // Mark reminder as sent
            reminder.is_sent = true;
            await reminder.save();

        } catch (error) {
            console.error('Error processing reminder:', reminder.id, error);
        }
    }
}

module.exports = (io) => {
    // Existing reminder cron - runs every minute
    cron.schedule('* * * * *', async () => {
        await sendDueReminders(io);
    });
};