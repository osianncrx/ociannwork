const bcrypt = require("bcryptjs");
const { User, TeamMember, Session } = require("../models");
const fs = require("fs");
const path = require("path");

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id","name", "profile_color", "avatar", "phone", "country", "country_code", "email", "role",'status'],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teamId = req.header("X-Team-ID");
    let member = null;
    if (teamId) {
      member = await TeamMember.findOne({ where: { user_id: userId, team_id: teamId } });
    }

    return res.status(200).json({ user, member });
  } catch (error) {
    console.error("Error getUserDetails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.body.id || req.user?.id;

    const { name, phone, country, country_code, remove_avatar } = req.body;

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.id && req.user?.role !== "super_admin" && req.user?.id !== userId) {
      return res.status(403).json({ message: "Unauthorized to edit this user" });
    }

    let avatar = user.avatar;
    if (remove_avatar === "true") {
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, "..", user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (error) {
            console.error("Error deleting old avatar:", error);
          }
        }
      }
      avatar = null;
    }
    else if (req.file) {
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, "..", user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (error) {
            console.error("Error deleting old avatar:", error);
          }
        }
      }
      avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.update({
      name: name ?? user.name,
      avatar: avatar,
      phone: phone ?? user.phone,
      country: country ?? user.country,
      country_code: country_code ?? user.country_code,
    });

    const updatedUser = await User.findByPk(userId, {
      attributes: [ "id", "name", "profile_color", "avatar", "phone", "country", "country_code", "email" ],
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { old_password, password } = req.body;

    if (!old_password || !password) {
      return res.status(404).json({ message: "Old password and new password are required" });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(old_password, user.password);
    if (!isPasswordValid) {
      return res.status(404).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({ password: hashedPassword, updated_at: new Date() });

    const io = req.app.get("io");
    io.to(`user_${userId}`).emit("password-updated", { ...user, token: req.headers.authorization });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.savePlayerId = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { playerId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.update({ player_id: playerId });
    return res.status(200).json({ message: "Player Id updated successfully", user });
    
  } catch (error) {
    console.error("Error Save Player Id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!userId || !token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // Delete the current session
    await Session.destroy({
      where: {
        user_id: userId,
        session_token: token,
        status: "active"
      }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("logout");
    }

    return res.status(200).json({ 
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.logoutFromAllDevices = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // Delete all sessions for this user
    await Session.destroy({
      where: {
        user_id: userId,
        status: "active"
      }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("logout-from-all-devices");
    }

    return res.status(200).json({ 
      message: "Logged out from all devices successfully" 
    });
  } catch (error) {
    console.error("Error logging out from all devices:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};