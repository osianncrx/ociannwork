const { Op } = require('sequelize');
const { Reminder, Message, User, Channel } = require('../models');

exports.setReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { channel_id, recipient_id, message_id, remind_at, note } = req.body;

    if (!remind_at) return res.status(400).json({ message: "remind_at is required." });

    const reminder = await Reminder.create({
      team_id: req.team_id,
      user_id: userId,
      recipient_id: recipient_id,
      channel_id: channel_id || null,
      message_id: message_id || null,
      remind_at,
      note
    });

    res.status(200).json({ message: "Reminder set successfully", reminder });

  } catch (err) {
    console.error("Error in setReminder:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.editReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { channel_id, recipient_id, message_id, remind_at, note } = req.body;

    // Find reminder and check ownership
    const reminder = await Reminder.findOne({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Validation
    if (!remind_at) {
      return res.status(400).json({ message: "remind_at is required." });
    }

    // Check if remind_at is in the future
    const remindDate = new Date(remind_at);
    const now = new Date();
    if (remindDate <= now) {
      return res.status(400).json({ message: "Reminder time must be in the future" });
    }

    // Update reminder
    await reminder.update({
      channel_id: channel_id || null,
      recipient_id: recipient_id,
      message_id: message_id || null,
      remind_at,
      note
    });

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (reminder.channel_id) {
      io.to(`channel_${reminder.channel_id}`).emit("reminder-updated", {
        reminder_id: id,
        reminder
      });
    } else {
      io.to(`user_${userId}`).emit("reminder-updated", {
        reminder_id: id,
        reminder
      });
    }

    res.status(200).json({
      message: "Reminder updated successfully",
      reminder
    });

  } catch (err) {
    console.error("Error in editReminder:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Find reminder and check ownership
    const reminder = await Reminder.findOne({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Delete the reminder
    await reminder.destroy();

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (reminder.channel_id) {
      io.to(`channel_${reminder.channel_id}`).emit("reminder-deleted", {
        reminder_id: id
      });
    } else {
      io.to(`user_${userId}`).emit("reminder-deleted", {
        reminder_id: id
      });
    }

    res.status(200).json({ message: "Reminder deleted successfully" });

  } catch (err) {
    console.error("Error in deleteReminder:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.cancelReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reminder_id } = req.body;

    const reminder = await Reminder.findOne({ where: { id: reminder_id, user_id: userId } });
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });

    const msg = await Message.findOne({
      where: { message_type: 'reminder' },
    });

    if (msg) await msg.destroy();

    await reminder.destroy();

    const io = req.app.get("io");
    if (reminder.channel_id) {
      io.to(`channel_${reminder.channel_id}`).emit("reminder-canceled", { reminder_id });
    } else {
      io.to(`user_${userId}`).emit("reminder-canceled", { reminder_id });
    }

    res.status(200).json({ message: "Reminder cancelled successfully" });

  } catch (err) {
    console.error("Error in cancelReminder:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, upcoming_only } = req.query;

    let whereClause = { user_id: userId };

    // Filter by upcoming reminders only
    if (upcoming_only === 'true') {
      whereClause.remind_at = {
        [Op.gte]: new Date()
      };
    }

    // Add more filtering options if needed
    if (status) {
      whereClause.status = status;
    }

    const reminders = await Reminder.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "avatar"]
        },
        {
          model: User,
          as: "recipient",
          foreignKey: "recipient_id",
          attributes: ["id", "name", "email", "avatar"]
        },
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name", "type"]
        },
        {
          model: Message,
          as: "message",
          attributes: ["id", "content", "created_at"]
        }
      ],
      order: [["remind_at", "ASC"]],
    });

    res.status(200).json({
      message: "Reminders retrieved successfully",
      data: reminders
    });
  } catch (err) {
    console.error("Error in getReminders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};