// Create a new file: utils/userStatusHelper.js
const { User } = require("../models");

async function updateUserStatus(userId, status) {
  const now = new Date();
  let updates = {};

  switch (status) {
    case "online":
      updates = { is_online: true, is_away: false, last_seen: null };
      break;
    case "away":
      updates = { is_online: true, is_away: true, last_seen: now };
      break;
    case "offline":
      updates = { is_online: false, is_away: false, last_seen: now };
      break;
    default:
      console.warn(`Invalid status: ${status}`);
      return;
  }

  try {
    await User.update(updates, { where: { id: userId } });
    console.log(`Updated status for user ${userId} to ${status}`);
  } catch (error) {
    console.error(`Error updating user status for ${userId}:`, error);
  }
}

module.exports = { updateUserStatus };