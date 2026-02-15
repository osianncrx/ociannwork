const { User, TeamSetting } = require("../models");

/**
 * Helper: Check if E2E is enabled for the team
 */
const isE2EEnabled = async (teamId) => {
  if (!teamId) return false;
  const teamSetting = await TeamSetting.findOne({ where: { team_id: teamId } });
  return teamSetting?.e2e_encryption_enabled || false;
};

/**
 * Save/Update my public key
 * POST /api/e2e/keys
 */
exports.savePublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.team_id;
    const { public_key } = req.body;

    // Check if E2E is enabled for this team
    if (!await isE2EEnabled(teamId)) {
      return res.status(403).json({
        success: false,
        message: "E2E encryption is not enabled for this team",
      });
    }

    if (!public_key) {
      return res.status(400).json({
        success: false,
        message: "public_key is required",
      });
    }

    await User.update(
      { public_key },
      { where: { id: userId } }
    );

    return res.status(200).json({
      success: true,
      message: "Public key saved successfully",
    });
  } catch (error) {
    console.error("Error in savePublicKey:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save public key",
    });
  }
};

/**
 * Get a user's public key
 * GET /api/e2e/keys/:user_id
 */
exports.getPublicKey = async (req, res) => {
  try {
    const { user_id } = req.params;
    const teamId = req.team_id;

    // Check if E2E is enabled for this team
    const e2eEnabled = await isE2EEnabled(teamId);

    const user = await User.findByPk(user_id, {
      attributes: ["id", "name", "public_key"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user_id: user.id,
      name: user.name,
      public_key: e2eEnabled ? user.public_key : null,
      has_encryption: e2eEnabled && !!user.public_key,
      e2e_enabled: e2eEnabled,
    });
  } catch (error) {
    console.error("Error in getPublicKey:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get public key",
    });
  }
};

/**
 * Get my public key
 * GET /api/e2e/keys
 */
exports.getMyPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.team_id;

    // Check if E2E is enabled for this team
    const e2eEnabled = await isE2EEnabled(teamId);

    const user = await User.findByPk(userId, {
      attributes: ["id", "public_key"],
    });

    return res.status(200).json({
      success: true,
      public_key: e2eEnabled ? user.public_key : null,
      has_encryption: e2eEnabled && !!user.public_key,
      e2e_enabled: e2eEnabled,
    });
  } catch (error) {
    console.error("Error in getMyPublicKey:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get public key",
    });
  }
};

/**
 * Delete my public key (disable E2E)
 * DELETE /api/e2e/keys
 */
exports.deletePublicKey = async (req, res) => {
  try {
    const userId = req.user.id;

    await User.update(
      { public_key: null },
      { where: { id: userId } }
    );

    return res.status(200).json({
      success: true,
      message: "Public key deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePublicKey:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete public key",
    });
  }
};

/**
 * Get E2E status for the team
 * GET /api/e2e/status
 */
exports.getE2EStatus = async (req, res) => {
  try {
    const teamId = req.team_id;
    const e2eEnabled = await isE2EEnabled(teamId);

    return res.status(200).json({
      success: true,
      e2e_enabled: e2eEnabled,
    });
  } catch (error) {
    console.error("Error in getE2EStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get E2E status",
    });
  }
};

/**
 * Toggle E2E encryption for the team (Admin only)
 * POST /api/e2e/toggle
 */
exports.toggleE2E = async (req, res) => {
  try {
    const teamId = req.team_id;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled must be true or false",
      });
    }

    await TeamSetting.update(
      { e2e_encryption_enabled: enabled },
      { where: { team_id: teamId } }
    );

    return res.status(200).json({
      success: true,
      message: `E2E encryption ${enabled ? "enabled" : "disabled"} successfully`,
      e2e_enabled: enabled,
    });
  } catch (error) {
    console.error("Error in toggleE2E:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle E2E encryption",
    });
  }
};

