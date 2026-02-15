const bcrypt = require("bcryptjs");
const { Op, fn, col, where: whereFn, QueryTypes } = require("sequelize");
const {
  OTPLog,
  User,
  Team,
  TeamMember,
  TeamSetting,
  CustomField,
  ChannelMember,
  sequelize,
  Message,
  Channel,
  Setting,
  TeamSubscription,
  Wallet,
  WalletTransaction,
  Plan,
} = require("../models");
const { sendTemplateMail } = require("../utils/mail");
const { generateToken } = require("../utils/jwt");
const { getRandomColor } = require("../utils/colorUtils");
const {
  calculateTeamStorageUsage,
  getActivePlanForTeam,
  calculateStorageBreakdownByType,
} = require("../utils/subscription");

exports.createTeam = async (req, res) => {
  const { team_name, email, name, country_code, phone, password } = req.body;

  try {
    let user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    const otpLog = await OTPLog.findOne({
      where: {
        email: email.toLowerCase().trim(),
        verified: true,
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpLog) {
      return res.status(400).json({ message: "Account is not verified." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const profileColor = getRandomColor();

    const updateData = {
      name: name ?? user.name,
      profile_color: profileColor,
      country_code,
      phone,
      email_verified: true,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (user) {
      await user.update(updateData);
    } else {
      // Create the user
      user = await User.create({
        email: email.toLowerCase().trim(),
        profile_color: profileColor,
        name,
        country_code,
        phone,
        password: hashedPassword,
        email_verified: true,
      });
    }

    // Extract domain from email
    const domain = email.split("@")[1];

    // Create the team
    const newTeam = await Team.create({
      name: team_name,
      domain,
      created_by: user.id,
    });

    // Add user as admin in the new team
    const teamMember = await TeamMember.create({
      team_id: newTeam.id,
      user_id: user.id,
      role: "admin",
      display_name: name,
      status: "active",
    });

    // Add Team Setting
    await TeamSetting.create({
      team_id: newTeam.id,
      require_approval_to_join: true,
      invite_only: true,
      approved_domains: [domain], // optional, can be omitted or included as empty
      block_all_other_domains: false,
      invitation_permission: "admin",
      email_notifications_enabled: true,
      direct_join_enabled: false,
      members_can_create_channels: true,
      message_retention_days: 90,
      notifications_default: "all",
      public_channel_creation_permission: "all",
      private_channel_creation_permission: "admin",
      channel_creation_limit_per_user: 20,
      file_sharing_access: "admin",
      file_sharing_type_scope: "all",
      team_file_upload_limit_mb: 1000,
      member_file_upload_limit_mb: 100,
      timezone: "UTC",
      visibility: "public",
      video_calls_enabled: true,
      audio_calls_enabled: true,
      audio_messages_enabled: true,
      screen_sharing_in_calls_enabled: true,
      maximum_message_length: 40000,
      default_theme_mode: "light",
    });

    // Generate JWT
    const token = generateToken({ id: user.id, email: user.email });

    return res.status(201).json({
      message: "Team created successfully.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        country_code: user.country_code,
        phone: user.phone,
      },
      team: {
        id: newTeam.id,
        name: newTeam.name,
        domain: newTeam.domain,
      },
      teamMember: {
        role: teamMember.role,
      },
    });
  } catch (err) {
    console.error("Error in createTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.findTeam = async (req, res) => {
  try {
    const { term, email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    const userId = user ? user.id : null;

    const whereClause = term ? { name: { [Op.like]: `%${term}%` } } : {};

    const teams = await Team.findAll({
      where: whereClause,
      include: [
        {
          model: TeamSetting,
          as: "team_setting", // or whatever alias you’ve used in association
          where: {
            visibility: "public",
          },
          required: true, // ensures only teams with matching settings are returned
        },
      ],
    });

    let memberRecords = [];

    if (userId) {
      memberRecords = await TeamMember.findAll({
        where: {
          user_id: userId,
          team_id: teams.map((t) => t.id),
        },
      });
    }

    const memberMap = {};
    memberRecords.forEach((m) => {
      memberMap[m.team_id] = m.status; // 'active', 'pending', etc.
    });

    // Wait for all async map operations to resolve
    const result = await Promise.all(
      teams.map(async (team) => {
        const status = memberMap[team.id] || "join";

        const memberCount = await TeamMember.count({
          where: {
            team_id: team.id,
            status: ["active"], // adjust as needed
          },
        });

        return {
          id: team.id,
          name: team.name,
          memberCount,
          status: status === "active" ? "joined" : status === "pending" ? "requested" : "join",
        };
      }),
    );

    return res.status(200).json({ teams: result });
  } catch (err) {
    console.error("Error in findTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.joinTeamPreUser = async (req, res) => {
  const { email, team_id } = req.body;

  let transaction;

  try {
    if (!email || !team_id) {
      return res.status(400).json({ message: "Email and team ID are required" });
    }

    const domain = email.split("@")[1]?.toLowerCase().trim();
    const nameFromEmail = email.split("@")[0]?.toLowerCase().trim();

    if (!domain || !nameFromEmail) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Start transaction
    transaction = await sequelize.transaction();

    // Get team and check subscription
    const team = await Team.findByPk(team_id, { transaction });
    if (!team) {
      await transaction.rollback();
      return res.status(404).json({ message: "Team not found" });
    }

    const setting = await TeamSetting.findOne({
      where: { team_id },
      transaction,
    });
    if (!setting) {
      await transaction.rollback();
      return res.status(400).json({ message: "Team settings not found" });
    }

    // Check for active subscription
    const activeSubscription = await TeamSubscription.findOne({
      where: {
        team_id,
        status: "active",
        expiry_date: { [Op.gt]: new Date() },
      },
      transaction,
    });

    if (!activeSubscription) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Team does not have an active subscription",
      });
    }

    // Check current member count BEFORE any modifications
    const currentMemberCount = await TeamMember.count({
      where: {
        team_id,
        status: "active",
      },
      transaction,
    });

    const {
      invite_only,
      require_approval_to_join,
      approved_domains = [],
      block_all_other_domains,
      auto_joined_channel = [],
    } = setting;

    let status;
    const domainApproved = approved_domains.includes(domain);

    if (!invite_only) {
      status = "active"; // Public team
    } else {
      if (domainApproved) {
        status = "active";
      } else if (block_all_other_domains) {
        await transaction.rollback();
        return res.status(403).json({ message: "Domain not allowed to join this team." });
      } else {
        status = require_approval_to_join ? "pending" : "active";
      }
    }

    // Check if user exists (including soft-deleted)
    let user = await User.findOne({
      where: { email },
      paranoid: false,
      transaction,
    });

    const isNewUser = !user || user.deleted_at;

    if (user) {
      // If user is soft-deleted, force delete permanently
      if (user.deleted_at) {
        await User.destroy({
          where: { id: user.id },
          force: true,
          transaction,
        });
        user = null; // Reset user to null so new one gets created
      }

      if (user) {
        // If user exists and is not deleted
        const alreadyInTeam = await TeamMember.findOne({
          where: { team_id, user_id: user.id },
          transaction,
        });

        if (alreadyInTeam) {
          await transaction.rollback();
          return res.status(409).json({ message: "User is already a member of this team" });
        }
      }
    }

    // Only deduct from wallet for new active users
    if (status === "active" && isNewUser) {
      // Get wallet
      let wallet = await Wallet.findOne({
        where: { team_id },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Team wallet not found",
        });
      }

      if (wallet.status !== "active") {
        await transaction.rollback();
        return res.status(400).json({
          message: "Team wallet is not active",
        });
      }

      // Get plan to calculate cost per user
      const plan = await Plan.findByPk(activeSubscription.plan_id, { transaction });
      if (!plan) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Plan not found",
        });
      }

      // Calculate cost for one user
      let costPerUser;
      if (activeSubscription.billing_cycle === "monthly") {
        costPerUser = parseFloat(plan.price_per_user_per_month);
      } else if (activeSubscription.billing_cycle === "yearly") {
        costPerUser = parseFloat(plan.getYearlyPrice());
      } else {
        await transaction.rollback();
        return res.status(400).json({
          message: "Invalid billing cycle in subscription",
        });
      }

      // Check wallet balance
      if (!wallet.hasSufficientBalance(costPerUser)) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Insufficient wallet balance to add new user",
          required: costPerUser.toFixed(2),
          available: parseFloat(wallet.balance).toFixed(2),
          shortfall: (costPerUser - parseFloat(wallet.balance)).toFixed(2),
        });
      }

      // Deduct from wallet
      const balanceBefore = parseFloat(wallet.balance);
      await wallet.deductBalance(costPerUser, transaction);

      // Create wallet transaction
      const walletTransaction = await WalletTransaction.create(
        {
          wallet_id: wallet.id,
          transaction_type: "debit",
          amount: costPerUser,
          balance_before: balanceBefore,
          balance_after: parseFloat(wallet.balance),
          description: `New user addition: ${email} to team ${team.name}`,
          reference_type: "user_addition",
          status: "completed",
        },
        { transaction },
      );

      // Update subscription amount paid
      await activeSubscription.update(
        {
          amount_paid: parseFloat(activeSubscription.amount_paid) + costPerUser,
        },
        { transaction },
      );

      // We'll update wallet transaction reference after user creation
      // Store walletTransaction for later update
      var createdWalletTransaction = walletTransaction;
    }

    // Create user if not exists (or was force deleted)
    if (!user) {
      const profile_color = getRandomColor();
      user = await User.create(
        {
          name: nameFromEmail,
          profile_color,
          email,
          password: "",
          role: "user",
        },
        { transaction },
      );
    }

    // Update wallet transaction with user reference if it exists
    if (createdWalletTransaction && user) {
      await createdWalletTransaction.update(
        {
          reference_id: user.id,
        },
        { transaction },
      );
    }

    // Add user to the team
    const teamMember = await TeamMember.create(
      {
        team_id,
        user_id: user.id,
        display_name: nameFromEmail,
        role: "member",
        status,
      },
      { transaction },
    );

    // Auto-join user to specified channels if status is "active"
    // Note: This should be done outside transaction if it might fail
    // as it's not critical to the main operation
    let autoJoinResult = { success: true };
    if (status === "active" && auto_joined_channel && auto_joined_channel.length > 0) {
      // Commit transaction first before non-critical operations
      await transaction.commit();

      // Now do auto-join outside transaction
      autoJoinResult = await addUserToAutoJoinChannels(user.id, team_id, auto_joined_channel);

      return res.status(200).json({
        message: status === "active" ? "User joined team successfully." : "Join request submitted. Awaiting approval.",
        isProfileUpdated: user.password ? true : false,
        status,
        autoJoinedChannels: autoJoinResult.success ? autoJoinResult.joinedChannels : 0,
        isNewUser: isNewUser,
        subscription: {
          current_members: currentMemberCount + (status === "active" ? 1 : 0),
          member_limit: activeSubscription.member_count,
          billing_cycle: activeSubscription.billing_cycle,
        },
        autoJoinWarning: !autoJoinResult.success ? "Auto-join channels failed but user was added" : undefined,
      });
    }

    // If no auto-join channels, just commit and return
    await transaction.commit();

    return res.status(200).json({
      message: status === "active" ? "User joined team successfully." : "Join request submitted. Awaiting approval.",
      isProfileUpdated: user.password ? true : false,
      status,
      autoJoinedChannels: 0,
      isNewUser: isNewUser,
      subscription: {
        current_members: currentMemberCount + (status === "active" ? 1 : 0),
        member_limit: activeSubscription.member_count,
        billing_cycle: activeSubscription.billing_cycle,
      },
    });
  } catch (err) {
    // Only rollback if transaction exists and hasn't been committed
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error in joinTeamPreUser:", err);

    // Check for specific errors
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Helper function to add user to auto-join channels
async function addUserToAutoJoinChannels(userId, teamId, channelIds, transaction = null) {
  try {
    const options = transaction ? { transaction } : {};

    // Validate that channels exist and belong to the team
    const channels = await Channel.findAll({
      where: {
        id: channelIds,
        team_id: teamId,
      },
      ...options,
    });

    const validChannelIds = channels.map((channel) => channel.id);

    if (validChannelIds.length === 0) {
      console.log("No valid auto-join channels found");
      return {
        success: false,
        message: "No valid auto-join channels found",
      };
    }

    // Check which channels the user is already a member of
    const existingMemberships = await ChannelMember.findAll({
      where: {
        channel_id: validChannelIds,
        user_id: userId,
      },
      ...options,
    });

    const existingChannelIds = existingMemberships.map((member) => member.channel_id);
    const channelsToJoin = validChannelIds.filter((channelId) => !existingChannelIds.includes(channelId));

    // Create channel memberships for channels user is not already in
    if (channelsToJoin.length > 0) {
      const channelMemberships = channelsToJoin.map((channelId) => ({
        channel_id: channelId,
        user_id: userId,
        role: "member",
      }));

      await ChannelMember.bulkCreate(channelMemberships, options);
      console.log(`User ${userId} auto-joined ${channelsToJoin.length} channels`);

      return {
        success: true,
        joinedChannels: channelsToJoin.length,
        channelIds: channelsToJoin,
      };
    }

    return {
      success: true,
      joinedChannels: 0,
      message: "User already in all auto-join channels",
    };
  } catch (error) {
    console.error("Error adding user to auto-join channels:", error);

    // Don't throw error here to avoid breaking the main flow
    // But return error info so caller can handle it
    return {
      success: false,
      error: error.message,
    };
  }
}

exports.setupUserProfile = async (req, res) => {
  try {
    const { email, name, country, country_code, phone, password } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {
      name: name ?? user.name,
      country,
      country_code,
      phone,
      email_verified: true,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    await user.update(updateData);

    // Generate JWT
    const token = generateToken({ id: user.id, email: user.email });

    // Fetch active teams
    const teamMemberships = await TeamMember.findAll({
      where: {
        user_id: user.id,
        status: "active",
      },
    });

    const teamCount = teamMemberships.length;
    let teamId = null;
    let teamMemberRole = null;

    if (teamCount === 1) {
      teamId = teamMemberships[0].team_id;
      teamMemberRole = teamMemberships[0].role;
    }

    const fields = await CustomField.findAll({
      where: { team_id: teamId },
    });

    const settings = await Setting.findOne();

    if (settings && settings.enable_email_notifications) {
      await sendTemplateMail(email, `${settings.site_name || "System"} - Welcome Email`, "welcome-email", {
        siteName: settings.site_name || "Our System",
        userEmail: email,
        currentYear: new Date().getFullYear(),
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      showTeamsScreen: teamCount > 1,
      teamId,
      teamMemberRole,
      fields,
    });
  } catch (err) {
    console.error("Error in setupUserProfile:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTeams = async (req, res) => {
  const userId = req.user?.id;

  try {
    // Get all teams where user is a member
    const teamMemberships = await TeamMember.findAll({
      where: { user_id: userId },
      include: {
        model: Team,
        attributes: ["id", "name", "avatar"],
      },
    });

    if (!teamMemberships || teamMemberships.length === 0) {
      return res.status(200).json({ teams: [], message: "No teams found for this user" });
    }

    // Prepare teams with member count
    const teams = await Promise.all(
      teamMemberships.map(async (membership) => {
        const team = membership.Team;

        const memberCount = await TeamMember.count({
          where: {
            team_id: team.id,
            status: ["active"], // adjust as needed
          },
        });

        const fields = await CustomField.findAll({
          where: { team_id: team.id },
        });

        return {
          id: team.id,
          name: team.name,
          avatar: team.avatar,
          role: membership.role,
          status: membership.status,
          teamCustomField: membership.custom_field,
          memberCount,
          fields,
        };
      }),
    );

    return res.status(200).json({ teams });
  } catch (err) {
    console.error("Error in getTeams:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTeamById = async (req, res) => {
  const userId = req.user?.id;
  const teamId = req.team_id;

  try {
    // Validate teamId
    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required in headers" });
    }

    // Verify user is a member of the team and fetch team details
    const teamMembership = await TeamMember.findOne({
      where: {
        user_id: userId,
        team_id: teamId,
      },
      include: {
        model: Team,
        attributes: ["id", "name", "avatar"],
      },
    });

    if (!teamMembership) {
      return res.status(403).json({
        message: "User is not a member of this team or team does not exist",
      });
    }

    const team = teamMembership.Team;

    // Get member count for the team
    const memberCount = await TeamMember.count({
      where: {
        team_id: team.id,
        status: ["active"], // Adjust as needed
      },
    });

    // Get custom fields for the team
    const fields = await CustomField.findAll({
      where: { team_id: team.id },
    });

    // Prepare response
    const teamData = {
      id: team.id,
      name: team.name,
      avatar: team.avatar,
      role: teamMembership.role,
      status: teamMembership.status,
      teamCustomField: teamMembership.custom_field,
      memberCount,
      fields,
    };

    return res.status(200).json({ team: teamData });
  } catch (err) {
    console.error("Error in getTeamById:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addNewTeam = async (req, res) => {
  const { team_name } = req.body;

  try {
    // Extract domain from email
    const domain = req.user.email.split("@")[1];

    // Create the team
    const newTeam = await Team.create({
      name: team_name,
      domain,
      created_by: req.user.id,
    });

    // Add user as admin in the new team
    const teamMember = await TeamMember.create({
      team_id: newTeam.id,
      user_id: req.user.id,
      role: "admin",
      display_name: req.user.name,
      status: "active",
    });

    // Add Team Setting
    await TeamSetting.create({
      team_id: newTeam.id,
      require_approval_to_join: true,
      invite_only: true,
      approved_domains: [domain], // optional, can be omitted or included as empty
      block_all_other_domains: false,
      invitation_permission: "admin",
      email_notifications_enabled: true,
      direct_join_enabled: false,
      members_can_create_channels: true,
      message_retention_days: 90,
      notifications_default: "all",
      public_channel_creation_permission: "all",
      private_channel_creation_permission: "admin",
      channel_creation_limit_per_user: 20,
      file_sharing_access: "admin",
      file_sharing_type_scope: "all",
      team_file_upload_limit_mb: 1000,
      member_file_upload_limit_mb: 100,
      timezone: "UTC",
      visibility: "public",
    });

    return res.status(200).json({ team: newTeam });
  } catch (err) {
    console.error("Error in addNewTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.inviteTeamMember = async (req, res) => {
  const { emails } = req.body;
  const inviterId = req.user.id;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ message: "No emails provided" });
  }

  try {
    const team = await Team.findByPk(req.team_id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const inviter = await User.findByPk(inviterId);

    // Get team settings for auto-join channels
    const setting = await TeamSetting.findOne({ where: { team_id: req.team_id } });
    const auto_joined_channel = setting?.auto_joined_channel || [];

    // Pre-validation checks before processing
    const validationErrors = [];

    for (const email of emails) {
      const emailTrimmed = email.trim().toLowerCase();

      // Basic email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        validationErrors.push({
          email: emailTrimmed,
          error: "Invalid email format",
        });
        continue;
      }

      // Check if user is trying to invite themselves
      if (emailTrimmed === inviter.email.toLowerCase()) {
        return res.status(400).json({
          message: "You cannot invite yourself",
          email: emailTrimmed,
        });
      }

      // Check if user already exists and is already a team member
      const user = await User.findOne({ where: { email: emailTrimmed } });
      if (user) {
        const existing = await TeamMember.findOne({
          where: { team_id: req.team_id, user_id: user.id },
        });

        if (existing) {
          return res.status(400).json({
            message: existing.display_name + " is already a team member",
            email: emailTrimmed,
          });
        }
      }
    }

    // If there are validation errors (invalid emails), return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Invalid email format(s) provided",
        errors: validationErrors,
      });
    }

    const results = [];

    // Process invitations concurrently - only valid emails reach here
    await Promise.all(
      emails.map(async (email) => {
        const emailTrimmed = email.trim().toLowerCase();
        const nameFromEmail = emailTrimmed.split("@")[0];

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
          results.push({ email: emailTrimmed, error: "Invalid email format" });
          return;
        }

        // Check if user is trying to invite themselves
        if (emailTrimmed === inviter.email.toLowerCase()) {
          results.push({
            email: emailTrimmed,
            error: "You cannot invite yourself",
          });
          return;
        }

        // Check if user already exists
        let user = await User.findOne({ where: { email: emailTrimmed } });
        if (!user) {
          const profile_color = getRandomColor();
          user = await User.create({
            name: nameFromEmail,
            profile_color,
            email: emailTrimmed,
            password: "",
            role: "user",
          });
        }

        // Check if already a team member
        const existing = await TeamMember.findOne({
          where: { team_id: req.team_id, user_id: user.id },
        });

        if (existing) {
          results.push({ email: emailTrimmed, error: "Already a team member" });
          return;
        }

        // Add user to team
        await TeamMember.create({
          team_id: req.team_id,
          user_id: user.id,
          display_name: nameFromEmail,
          role: "member",
          invited_by: inviterId,
          status: "active",
        });

        // Auto-join user to specified channels
        let autoJoinedChannels = 0;
        if (auto_joined_channel && auto_joined_channel.length > 0) {
          autoJoinedChannels = await addUserToAutoJoinChannels(user.id, req.team_id, auto_joined_channel);
        }

        const settings = await Setting.findOne();

        if (settings && settings.enable_email_notifications) {
          await sendTemplateMail(email, `${settings.site_name || "System"} - Welcome Email`, "welcome-email", {
            siteName: settings.site_name || "Our System",
            userEmail: email,
            currentYear: new Date().getFullYear(),
          });
        }

        if (settings && settings.enable_email_notifications) {
          await sendTemplateMail(email, `You're invited to join the team "${team.name}"`, "invite-team-email", {
            siteName: settings.site_name || "Our System",
            userEmail: email,
            inviter: inviter.name,
            team: team,
            currentYear: new Date().getFullYear(),
          });
        }

        results.push({
          email: emailTrimmed,
          status: "invited",
          autoJoinedChannels,
        });
      }),
    );

    return res.status(200).json({
      message: "Invitations processed",
      results,
    });
  } catch (err) {
    console.error("Error in inviteTeamMember:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateTeamMemberStatus = async (req, res) => {
  const { user_id, action } = req.body; // 'approve', 'reject', 'deactivate', 'reactivate', 'make_admin', 'remove_admin'

  try {
    // Find the team member
    const member = await TeamMember.findOne({
      where: {
        team_id: req.team_id,
        user_id: user_id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent users from modifying their own status
    if (member.user_id === req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Define new status or role based on action
    const statusMap = {
      approve: "active",
      reject: "rejected",
      deactivate: "deactivated",
      reactivate: "active",
    };

    let updateData = {};

    if (action === "make_admin") {
      updateData.role = "admin";
    } else if (action === "remove_admin") {
      updateData.role = "member";
    } else if (statusMap[action]) {
      updateData.status = statusMap[action];
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // Update the member's status or role
    await member.update(updateData);

    // If action is 'reject', delete the member
    if (action === "reject") {
      await member.destroy();
    }

    // Get socket.io instance
    const io = req.app.get("io");

    // Fetch all team members (excluding the user performing the action)
    const teamMembers = await TeamMember.findAll({
      where: {
        team_id: req.team_id,
      },
      attributes: ["user_id"],
    });

    // Emit socket event to each team member's socket
    teamMembers.forEach((teamMember) => {
      io.to(`user_${teamMember.user_id}`).emit("member_status_updated", {
        user_id: member.user_id,
        team_id: req.team_id,
        status: member.status,
        role: member.role,
        action: action, // Include the action for context
      });
    });

    // Existing socket event for deactivation (optional, keep if needed)
    if (action === "deactivate") {
      io.to(`user_${user_id}`).emit("account-deactivated", member);
    }

    // Respond with success
    res.status(200).json({ message: "Member updated", data: member });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateTeam = async (req, res) => {
  const { team_name } = req.body;
  try {
    const team = await Team.findOne({ where: { id: req.team_id } });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const avatar = req.file ? `/uploads/team_avatars/${req.file.filename}` : null;

    await team.update({
      name: team_name ?? team.name,
      avatar: avatar,
    });

    return res.status(200).json({
      message: "Team updated successfully",
      team,
    });
  } catch (err) {
    console.error("Error in updateTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateDoNotDisturb = async (req, res) => {
  try {
    const { duration, value } = req.body;
    const userId = req.user.id;
    const teamId = req.team_id;

    if (value === undefined) {
      return res.status(400).json({ success: false, message: "Value parameter is required." });
    }

    let mutedUntil = null;
    const now = new Date();

    if (value) {
      // Activating Do Not Disturb
      if (!duration) {
        return res.status(400).json({
          success: false,
          message: "Duration is required when activating Do Not Disturb.",
        });
      }

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

      await TeamMember.update(
        {
          do_not_disturb: true,
          do_not_disturb_until: mutedUntil,
        },
        {
          where: {
            user_id: userId,
            team_id: teamId,
          },
        },
      );

      const io = req.app.get("io");
      // Fetch all team members except the current user
      const teamMembers = await TeamMember.findAll({
        where: {
          team_id: teamId,
          user_id: { [Op.ne]: userId }, // Exclude the current user
        },
        attributes: ["user_id"],
      });

      // Emit socket event to each team member's user socket
      teamMembers.forEach((member) => {
        io.to(`user_${member.user_id}`).emit("dnd_status_updated", {
          userId,
          teamId,
          do_not_disturb: true,
          do_not_disturb_until: mutedUntil,
        });
      });

      return res.status(200).json({
        success: true,
        message: "Do not disturb activated.",
        muted_until: mutedUntil,
      });
    } else {
      await TeamMember.update(
        {
          do_not_disturb: false,
          do_not_disturb_until: null,
        },
        {
          where: {
            user_id: userId,
            team_id: teamId,
          },
        },
      );

      const io = req.app.get("io");
      // Fetch all team members except the current user
      const teamMembers = await TeamMember.findAll({
        where: {
          team_id: teamId,
          user_id: { [Op.ne]: userId }, // Exclude the current user
        },
        attributes: ["user_id"],
      });

      // Emit socket event to each team member's user socket
      teamMembers.forEach((member) => {
        io.to(`user_${member.user_id}`).emit("dnd_status_updated", {
          userId,
          teamId,
          do_not_disturb: false,
          do_not_disturb_until: null,
        });
      });

      return res.status(200).json({
        success: true,
        message: "Do not disturb deactivated.",
      });
    }
  } catch (error) {
    console.error("Error in updateDoNotDisturb:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Do Not Disturb settings.",
      error: error.message,
    });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const teamId = req.team_id; // set from auth middleware
    const {
      channel_id,
      page = 1,
      limit = 10,
      search,
      role,
      status,
      all,
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    const offset = all === "true" ? 0 : (parseInt(page) - 1) * parseInt(limit);
    const queryLimit = all === "true" ? undefined : parseInt(limit);

    // Base member filter
    const memberWhere = {
      team_id: teamId,
      status: status || "active",
    };

    // Build user filter if searching
    const userWhere = {};
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;

      userWhere[Op.or] = [
        whereFn(fn("LOWER", col("User.name")), {
          [Op.like]: searchTerm,
        }),
        whereFn(fn("LOWER", col("User.email")), {
          [Op.like]: searchTerm,
        }),
      ];
    }

    if (role) {
      memberWhere.role = role.toLowerCase();
    }

    if (status) {
      memberWhere.status = status.toLowerCase();
    }

    // Define allowed sort fields
    const allowedSortFields = ["created_at", "name", "email", "team_role", "status"];

    let order = [["created_at", "DESC"]]; // Default order

    // If sort_by is provided and allowed, use it
    if (sort_by && allowedSortFields.includes(sort_by)) {
      const orderDirection = sort_order ? sort_order.toUpperCase() : "DESC";

      // Handle different sort field mappings
      switch (sort_by) {
        case "name":
          order = [[User, "name", orderDirection]];
          break;
        case "email":
          order = [[User, "email", orderDirection]];
          break;
        case "team_role":
          order = [["role", orderDirection]];
          break;
        case "status":
          order = [["status", orderDirection]];
          break;
        default:
          // For created_at and other direct fields
          order = [[sort_by, orderDirection]];
          break;
      }

      // Add secondary sort for consistent ordering
      if (sort_by !== "created_at") {
        order.push(["created_at", "DESC"]);
      }
    }

    // Step 1: Get team members with user info
    const { rows: members, count: total } = await TeamMember.findAndCountAll({
      where: memberWhere,
      include: [
        {
          model: User,
          where: userWhere,
          attributes: ["id", "name", "email", "avatar", "phone", "country_code", "created_at", "profile_color"],
        },
      ],
      offset,
      limit: queryLimit,
      order: order, // Use the dynamic order here
    });

    // Step 2: If channel_id is provided, get member map
    let channelMemberMap = {};
    if (channel_id) {
      const channelMembers = await ChannelMember.findAll({
        where: { channel_id },
      });
      channelMembers.forEach((cm) => {
        channelMemberMap[cm.user_id] = {
          role: cm.role,
        };
      });
    }

    // Step 3: Map members
    const result = members.map((m) => {
      const user = m.User;
      const inChannel = channelMemberMap[user.id] !== undefined;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profile_color: user.profile_color,
        phone: user.phone,
        country_code: user.country_code,
        team_role: m.role,
        status: m.status,
        display_name: m.display_name,
        created_at: user.created_at,
        channel_info: channel_id
          ? {
              is_member: inChannel,
              role: inChannel ? channelMemberMap[user.id].role : null,
            }
          : undefined,
      };
    });

    // Step 4: Get status and role counts
    const [adminCount, pendingCount, deactivatedCount, totalCount] = await Promise.all([
      TeamMember.count({ where: { team_id: teamId, role: "admin" } }),
      TeamMember.count({ where: { team_id: teamId, status: "pending" } }),
      TeamMember.count({ where: { team_id: teamId, status: "deactivated" } }),
      TeamMember.count({ where: { team_id: teamId } }),
    ]);

    // Step 5: Return result
    return res.status(200).json({
      total,
      page: all === "true" ? 1 : parseInt(page),
      limit: all === "true" ? total : parseInt(limit),
      members: result,
      counts: {
        admins: adminCount,
        pending: pendingCount,
        deactivated: deactivatedCount,
        total: totalCount,
      },
    });
  } catch (err) {
    console.error("Error in getTeamMembers:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeUserFromTeam = async (req, res) => {
  const { userId } = req.params;
  const { ids } = req.body; // Get ids from body for bulk delete
  const teamId = req.team_id;

  try {
    // Handle bulk delete if ids array is provided
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Find all members to be deleted
      const members = await TeamMember.findAll({
        where: {
          team_id: teamId,
          user_id: ids,
        },
      });

      if (members.length === 0) {
        return res.status(404).json({ message: "No team memberships found" });
      }

      // Check if any of the members are admins
      const adminMembers = members.filter((m) => m.role === "admin");

      if (adminMembers.length > 0) {
        // Check total admins in the team
        const totalAdmins = await TeamMember.count({
          where: {
            team_id: teamId,
            role: "admin",
          },
        });

        // Check if deleting these admins would leave no admins
        if (totalAdmins - adminMembers.length < 1) {
          return res.status(400).json({
            message: "Cannot remove all admins from the team. At least one admin must remain.",
          });
        }
      }

      // Delete all members
      await TeamMember.destroy({
        where: {
          team_id: teamId,
          user_id: ids,
        },
      });

      return res.status(200).json({
        message: `${members.length} user(s) removed from team successfully`,
        count: members.length,
      });
    }

    // Handle single delete (existing logic)
    const member = await TeamMember.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!member) {
      return res.status(404).json({ message: "Team membership not found" });
    }

    if (member.role === "admin") {
      const totalAdmins = await TeamMember.count({
        where: {
          team_id: teamId,
          role: "admin",
        },
      });

      if (totalAdmins <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last admin from the team",
        });
      }
    }

    await member.destroy();

    return res.status(200).json({ message: "User removed from team successfully" });
  } catch (err) {
    console.error("Error in removeUserFromTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const user_id = req.user.id;
    const team_id = req.team_id;

    if (!team_id) {
      return res.status(400).json({
        message: "Team ID is required",
      });
    }

    if (!user_id) {
      return res.status(401).json({
        message: "User authentication required",
      });
    }

    // Check if the team exists
    const team = await Team.findByPk(team_id);
    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    // Check if user is a member of the team
    const teamMember = await TeamMember.findOne({
      where: {
        team_id: team_id,
        user_id: user_id,
        status: "active", // only active members can leave
      },
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
    });

    if (!teamMember) {
      return res.status(404).json({
        message: "You are not a member of this team or your membership is not active",
      });
    }

    // Prevent team creator from leaving if they're the only admin
    if (team.created_by === user_id) {
      // Check if there are other admins
      const otherAdmins = await TeamMember.count({
        where: {
          team_id: team_id,
          role: "admin",
          user_id: { [Op.ne]: user_id }, // not equal to current user
          status: "active",
        },
      });

      if (otherAdmins === 0) {
        return res.status(400).json({
          message:
            "Team creator cannot leave the team unless there's another admin. Please assign another admin first.",
        });
      }
    }

    // Remove user from the team
    await TeamMember.destroy({
      where: {
        team_id: team_id,
        user_id: user_id,
      },
    });

    const allChannels = await ChannelMember.findAll({
      where: { user_id: user_id },
      include: [
        {
          model: Channel,
          attributes: ["id", "name"],
          where: { team_id: team_id },
        },
      ],
    });

    const io = req.app.get("io");
    for (const channelMember of allChannels) {
      const channelId = channelMember.channel_id;

      const systemMessage = await Message.create({
        channel_id: channelId,
        team_id: team_id,
        sender_id: user_id,
        message_type: "system",
        content: `${teamMember.User?.name} left the channel`,
      });

      if (io) {
        io.to(`channel_${channelId}`).emit("receive-message", systemMessage);
      }
    }

    await ChannelMember.destroy({
      where: {
        user_id: user_id,
        channel_id: {
          [Op.in]: sequelize.literal(`(SELECT id FROM channels WHERE team_id = ${team_id})`),
        },
      },
    });

    return res.status(200).json({
      message: "Successfully left the team",
      data: {
        team_id: team_id,
        user_id: user_id,
      },
    });
  } catch (err) {
    console.error("Error in leaveTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Team Admin Dashboard
exports.dashboard = async (req, res) => {
  try {
    const team_id = req.team_id;
    const currentUserId = req.user.id;

    // Verify the user is admin of this team
    const teamMember = await TeamMember.findOne({
      where: {
        team_id,
        user_id: currentUserId,
        role: "admin",
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Team admin privileges required.",
      });
    }

    const dashboardData = {
      counts: {
        totalMembers: 0,
        totalMembersGrowth: 0,
        totalChannels: 0,
        totalChannelsGrowth: 0,
        totalOnlineUsers: 0,
        totalOnlineUsersGrowth: 0,
        newThisWeek: 0,
        newThisWeekGrowth: 0,
        mediaShared: 0,
        mediaSharedGrowth: 0,
        fileShared: 0,
        fileSharedGrowth: 0,
        totalChats: 0,
        totalChatsGrowth: 0,
        totalCalls: 0,
        totalCallsGrowth: 0,
        pendingInvites: 0,
        pendingInvitesGrowth: 0,
      },
      charts: {
        messageTypeDistribution: [],
        activeUsersGraph: [],
        growthMemberChart: [],
        userLocationDistribution: [], // Added country-wise distribution
      },
      insights: {
        topActiveMembers: [],
        recentActivity: [],
        teamHealth: {},
        latestInvites: [],
      },
    };

    // Get proper date ranges for comparisons
    const now = new Date();

    // Current period (this week)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(now);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Previous period (previous week - same duration)
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setMilliseconds(-1);

    // Helper function to calculate growth percentage safely
    const calculateGrowth = (current, previous) => {
      if (previous === 0) {
        // If previous was 0 and current is > 0, it's 100% growth
        // If both are 0, it's 0% growth
        return current > 0 ? 100 : 0;
      }

      const growth = ((current - previous) / previous) * 100;
      // Cap at reasonable limits (-100% to 500%)
      return Math.max(-100, Math.min(growth, 500)).toFixed(2);
    };

    // 1. TOTAL MEMBERS - Compare current total vs total from 2 weeks ago
    const currentMembers = await TeamMember.count({
      where: {
        team_id,
        status: "active",
      },
    });

    const previousMembers = await TeamMember.count({
      where: {
        team_id,
        status: "active",
        created_at: {
          [Op.lt]: previousWeekStart, // Members before previous week started
        },
      },
    });

    dashboardData.counts.totalMembers = currentMembers;
    dashboardData.counts.totalMembersGrowth = parseFloat(calculateGrowth(currentMembers, previousMembers));

    // 2. TOTAL CHANNELS - Compare current total vs total from 2 weeks ago
    const currentChannels = await Channel.count({
      where: { team_id },
    });

    const previousChannels = await Channel.count({
      where: {
        team_id,
        created_at: {
          [Op.lt]: previousWeekStart,
        },
      },
    });

    dashboardData.counts.totalChannels = currentChannels;
    dashboardData.counts.totalChannelsGrowth = parseFloat(calculateGrowth(currentChannels, previousChannels));

    // 3. TOTAL ONLINE USERS - Compare current online vs online at same time yesterday
    const currentOnlineUsers = await User.count({
      include: [
        {
          model: TeamMember,
          where: { team_id, status: "active" },
          attributes: [],
        },
      ],
      where: {
        is_online: true,
        status: "active",
      },
    });

    const yesterdaySameTime = new Date(now);
    yesterdaySameTime.setDate(yesterdaySameTime.getDate() - 1);

    const previousOnlineUsers = await User.count({
      include: [
        {
          model: TeamMember,
          where: { team_id, status: "active" },
          attributes: [],
        },
      ],
      where: {
        is_online: true,
        status: "active",
        last_seen: {
          [Op.gte]: yesterdaySameTime,
        },
      },
    });

    dashboardData.counts.totalOnlineUsers = currentOnlineUsers;
    dashboardData.counts.totalOnlineUsersGrowth = parseFloat(calculateGrowth(currentOnlineUsers, previousOnlineUsers));

    // 4. NEW THIS WEEK - Compare new members this week vs new members last week
    const newThisWeek = await TeamMember.count({
      where: {
        team_id,
        status: "active",
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });

    const newLastWeek = await TeamMember.count({
      where: {
        team_id,
        status: "active",
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });

    dashboardData.counts.newThisWeek = newThisWeek;
    dashboardData.counts.newThisWeekGrowth = parseFloat(calculateGrowth(newThisWeek, newLastWeek));

    // 5. MEDIA SHARED - Compare media this week vs media last week
    const currentMedia = await Message.count({
      where: {
        team_id,
        message_type: ["image", "video", "audio"],
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });

    const previousMedia = await Message.count({
      where: {
        team_id,
        message_type: ["image", "video", "audio"],
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });

    dashboardData.counts.mediaShared = currentMedia;
    dashboardData.counts.mediaSharedGrowth = parseFloat(calculateGrowth(currentMedia, previousMedia));

    // 6. FILE SHARED - Compare files this week vs files last week
    const currentFiles = await Message.count({
      where: {
        team_id,
        message_type: "file",
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });

    const previousFiles = await Message.count({
      where: {
        team_id,
        message_type: "file",
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });

    dashboardData.counts.fileShared = currentFiles;
    dashboardData.counts.fileSharedGrowth = parseFloat(calculateGrowth(currentFiles, previousFiles));

    // 7. TOTAL CALLS - Compare calls this week vs calls last week
    const currentCalls = await Message.count({
      where: {
        team_id,
        message_type: "call",
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });

    const previousCalls = await Message.count({
      where: {
        team_id,
        message_type: "call",
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });

    dashboardData.counts.totalCalls = currentCalls;
    dashboardData.counts.totalCallsGrowth = parseFloat(calculateGrowth(currentCalls, previousCalls));

    // 8. PENDING INVITES - Compare pending invites this week vs last week
    const currentPendingInvites = await TeamMember.count({
      where: {
        team_id,
        status: "pending",
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });

    const previousPendingInvites = await TeamMember.count({
      where: {
        team_id,
        status: "pending",
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });

    dashboardData.counts.pendingInvites = currentPendingInvites;
    dashboardData.counts.pendingInvitesGrowth = parseFloat(
      calculateGrowth(currentPendingInvites, previousPendingInvites),
    );

    // 9. TOTAL CHATS (Active Channels) - Compare active channels this week vs last week
    const currentActiveChannels = await Message.count({
      where: {
        team_id,
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
      distinct: true,
      col: "channel_id",
    });

    const previousActiveChannels = await Message.count({
      where: {
        team_id,
        created_at: {
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
      distinct: true,
      col: "channel_id",
    });

    dashboardData.counts.totalChats = currentActiveChannels;
    dashboardData.counts.totalChatsGrowth = parseFloat(calculateGrowth(currentActiveChannels, previousActiveChannels));

    // CHARTS DATA
    // Message Type Distribution (for current week)
    dashboardData.charts.messageTypeDistribution = await Message.findAll({
      attributes: ["message_type", [fn("COUNT", sequelize.col("message_type")), "count"]],
      where: {
        team_id,
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
      group: ["message_type"],
      raw: true,
    });

    // Active Users Graph (Last 7 days)
    const activeUsersGraphStart = new Date(now);
    activeUsersGraphStart.setDate(activeUsersGraphStart.getDate() - 6);
    activeUsersGraphStart.setHours(0, 0, 0, 0);

    const activeUsersData = await sequelize.query(
      `
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT sender_id) as active_users
      FROM messages 
      WHERE team_id = :team_id 
        AND created_at >= :startDate
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      {
        replacements: {
          team_id,
          startDate: activeUsersGraphStart.toISOString().split("T")[0],
        },
        type: QueryTypes.SELECT,
      },
    );

    // Fill missing dates for active users graph
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayData = activeUsersData.find((d) => {
        const dateObj = new Date(d.date);
        return dateObj.toISOString().split("T")[0] === dateStr;
      });

      last7Days.push({
        date: dateStr,
        active_users: dayData ? parseInt(dayData.active_users) : 0,
      });
    }
    dashboardData.charts.activeUsersGraph = last7Days;

    // Growth Member Chart (Last 30 days) - Includes all statuses
    const memberGrowthStart = new Date(now);
    memberGrowthStart.setDate(memberGrowthStart.getDate() - 30);

    const memberGrowthData = await sequelize.query(
      `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_members,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_members
      FROM team_members 
      WHERE team_id = :team_id 
        AND created_at >= :startDate
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
      {
        replacements: {
          team_id,
          startDate: memberGrowthStart.toISOString().split("T")[0],
        },
        type: QueryTypes.SELECT,
      },
    );

    dashboardData.charts.growthMemberChart = memberGrowthData;

    // COUNTRY-WISE USER DISTRIBUTION
    const userLocationData = await sequelize.query(
      `
      SELECT 
        u.country,
        u.country_code,
        COUNT(DISTINCT tm.user_id) as user_count
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = :team_id 
        AND tm.status = 'active'
        AND u.country IS NOT NULL
      GROUP BY u.country, u.country_code
      ORDER BY user_count DESC
    `,
      {
        replacements: { team_id },
        type: QueryTypes.SELECT,
      },
    );

    // Calculate percentages and format the data
    const totalTeamUsersWithCountry = userLocationData.reduce(
      (total, location) => total + parseInt(location.user_count),
      0,
    );

    dashboardData.charts.userLocationDistribution = userLocationData.map((location) => {
      const percentage =
        totalTeamUsersWithCountry > 0
          ? ((parseInt(location.user_count) / totalTeamUsersWithCountry) * 100).toFixed(2)
          : 0;

      return {
        country: location.country || "Unknown",
        country_code: location.country_code || "UN",
        user_count: parseInt(location.user_count),
        percentage: parseFloat(percentage),
      };
    });

    // ADDITIONAL INSIGHTS
    // Top Active Members (current week) - with country data
    dashboardData.insights.topActiveMembers = await Message.findAll({
      attributes: ["sender_id", [fn("COUNT", sequelize.col("sender_id")), "message_count"]],
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "avatar", "is_online", "country", "country_code"],
        },
      ],
      where: {
        team_id,
        created_at: {
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
      group: ["sender_id"],
      order: [[fn("COUNT", col("sender_id")), "DESC"]],
      limit: 5,
      raw: true,
      nest: true,
    });

    // Recent Activity - with country data
    dashboardData.insights.recentActivity = await Message.findAll({
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "avatar", "country", "country_code"],
        },
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name"],
        },
      ],
      where: {
        team_id,
      },
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    // Latest Invites (Pending invitations) - with country data
    dashboardData.insights.latestInvites = await TeamMember.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "avatar", "country", "country_code"],
        },
        {
          model: User,
          foreignKey: "invited_by",
          as: "invited",
          attributes: ["id", "name"],
        },
      ],
      where: {
        team_id,
        status: "pending",
      },
      order: [["created_at", "DESC"]],
      limit: 10,
      attributes: ["role", "display_name", "status", "created_at", "invited_by"],
    });

    // Team Health Metrics - with country insights
    const totalTeamMembers = await TeamMember.count({
      where: { team_id, status: "active" },
    });

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const activeToday = await Message.count({
      where: {
        team_id,
        created_at: {
          [Op.gte]: todayStart,
        },
      },
      distinct: true,
      col: "sender_id",
    });

    // Calculate team health percentage
    const teamHealthPercentage =
      totalTeamMembers > 0 ? Math.min((activeToday / totalTeamMembers) * 100, 100).toFixed(2) : 0;

    // Get top countries for team insights
    const topCountries = await sequelize.query(
      `
      SELECT 
        u.country,
        COUNT(*) as member_count
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = :team_id 
        AND tm.status = 'active'
        AND u.country IS NOT NULL
      GROUP BY u.country
      ORDER BY member_count DESC
      LIMIT 5
    `,
      {
        replacements: { team_id },
        type: QueryTypes.SELECT,
      },
    );

    dashboardData.insights.teamHealth = {
      totalMembers: totalTeamMembers,
      activeToday,
      healthPercentage: parseFloat(teamHealthPercentage),
      pendingInvites: await TeamMember.count({
        where: { team_id, status: "pending" },
      }),
      totalInvites: await TeamMember.count({
        where: { team_id },
      }),
      topCountries: topCountries.map((country) => ({
        country: country.country,
        member_count: parseInt(country.member_count),
        percentage: totalTeamMembers > 0 ? ((parseInt(country.member_count) / totalTeamMembers) * 100).toFixed(2) : 0,
      })),
      countriesCount: dashboardData.charts.userLocationDistribution.length,
    };

    // Add storage usage information
    const currentStorageUsageMB = await calculateTeamStorageUsage(team_id);
    const storageBreakdown = await calculateStorageBreakdownByType(team_id);
    const activeSubscription = await getActivePlanForTeam(team_id);
    const maxStorageMB = activeSubscription?.plan?.max_storage_mb || null;

    const storageInfo = {
      current_usage_mb: Math.ceil(currentStorageUsageMB * 100) / 100,
      max_storage_mb: maxStorageMB,
      usage_percentage:
        maxStorageMB && maxStorageMB > 0
          ? Math.min((currentStorageUsageMB / maxStorageMB) * 100, 100).toFixed(2)
          : null,
      is_unlimited: maxStorageMB === null || maxStorageMB === undefined,
      breakdown: storageBreakdown,
    };

    dashboardData.storage = storageInfo;

    res.json({
      success: true,
      data: dashboardData,
      message: "Team dashboard data fetched successfully",
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};

// Admin
exports.adminDashboard = async (req, res) => {
  try {
    const dashboardData = {
      // Count widgets
      counts: {
        totalTeams: 0,
        totalUsers: 0,
        totalChannels: 0,
        newTeamsThisWeek: 0,
        deactivatedTeams: 0,
        activatedTeams: 0,
        totalMembersGrowth: 0,
        totalChannelsGrowth: 0,
        totalOnlineUsersGrowth: 0,
        fileSharedGrowth: 0,
        totalOnlineUsers: 0,
        totalFileShared: 0,
      },

      // Location data
      locationWiseUsers: [],

      // Growth charts
      charts: {
        userGrowthMonthly: [],
        teamGrowthMonthly: [],
        newTeamsThisWeek: [], // New chart for teams this week
        userLocationDistribution: [], // Added country-wise distribution
      },

      // Additional insights
      insights: {
        teamStatusBreakdown: {},
        recentActivity: [],
        mostActiveUsers: [], // New table for most active users
        topCountries: [], // Added top countries insights
      },
    };

    // Get date ranges for comparisons
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setMilliseconds(-1);

    // Calculate start of current month and previous months
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }

    // Total Teams Count
    dashboardData.counts.totalTeams = await Team.count();

    // Total Users Count
    dashboardData.counts.totalUsers = await User.count({
      where: { status: "active" },
    });

    // Total Channels Count
    dashboardData.counts.totalChannels = await Channel.count();

    // New Teams This Week
    dashboardData.counts.newTeamsThisWeek = await Team.count({
      where: {
        created_at: {
          [Op.gte]: weekStart,
        },
      },
    });

    // Total Online Users Count
    dashboardData.counts.totalOnlineUsers = await User.count({
      where: {
        is_online: true,
        status: "active",
      },
    });

    // Total File Shared Count
    dashboardData.counts.totalFileShared = await Message.count({
      where: {
        message_type: "file",
      },
    });

    // COUNTRY-WISE USER DISTRIBUTION
    const userLocationData = await sequelize.query(
      `
        SELECT 
          country,
          country_code,
          COUNT(*) as user_count
        FROM users 
        WHERE status = 'active'
          AND country IS NOT NULL
        GROUP BY country, country_code
        ORDER BY user_count DESC
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    // Calculate percentages and format the data
    const totalUsersWithCountry = userLocationData.reduce(
      (total, location) => total + parseInt(location.user_count),
      0,
    );

    dashboardData.charts.userLocationDistribution = userLocationData.map((location) => {
      const percentage =
        totalUsersWithCountry > 0 ? ((parseInt(location.user_count) / totalUsersWithCountry) * 100).toFixed(2) : 0;

      return {
        country: location.country || "Unknown",
        country_code: location.country_code || "UN",
        user_count: parseInt(location.user_count),
        percentage: parseFloat(percentage),
      };
    });

    // Legacy locationWiseUsers (keeping for backward compatibility)
    dashboardData.locationWiseUsers = dashboardData.charts.userLocationDistribution;

    // TOP COUNTRIES INSIGHTS
    dashboardData.insights.topCountries = await sequelize
      .query(
        `
        SELECT 
          country,
          country_code,
          COUNT(*) as user_count,
          SUM(CASE WHEN is_online = true THEN 1 ELSE 0 END) as online_users
        FROM users 
        WHERE status = 'active'
          AND country IS NOT NULL
        GROUP BY country, country_code
        ORDER BY user_count DESC
        LIMIT 10
      `,
        {
          type: QueryTypes.SELECT,
        },
      )
      .then((results) =>
        results.map((country) => ({
          country: country.country,
          country_code: country.country_code,
          user_count: parseInt(country.user_count),
          online_users: parseInt(country.online_users),
          online_percentage: ((parseInt(country.online_users) / parseInt(country.user_count)) * 100).toFixed(2),
        })),
      );

    // Growth Calculations
    // Total Members Growth (Users)
    const currentMembers = await User.count({
      where: { status: "active" },
    });

    const previousMembers = await User.count({
      where: {
        status: "active",
        created_at: {
          [Op.lt]: weekStart,
        },
      },
    });

    dashboardData.counts.totalMembersGrowth =
      previousMembers > 0 ? (((currentMembers - previousMembers) / previousMembers) * 100).toFixed(2) : 100;

    // Total Channels Growth
    const currentChannels = await Channel.count();
    const previousChannels = await Channel.count({
      where: {
        created_at: {
          [Op.lt]: weekStart,
        },
      },
    });

    dashboardData.counts.totalChannelsGrowth =
      previousChannels > 0 ? (((currentChannels - previousChannels) / previousChannels) * 100).toFixed(2) : 100;

    // Total Online Users Growth
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const previousOnlineUsers = await User.count({
      where: {
        is_online: true,
        status: "active",
        last_seen: {
          [Op.between]: [
            new Date(yesterday.setHours(now.getHours() - 1, 0, 0, 0)),
            new Date(yesterday.setHours(now.getHours() - 1, 59, 59, 999)),
          ],
        },
      },
    });

    dashboardData.counts.totalOnlineUsersGrowth =
      previousOnlineUsers > 0
        ? (((dashboardData.counts.totalOnlineUsers - previousOnlineUsers) / previousOnlineUsers) * 100).toFixed(2)
        : 100;

    // File Shared Growth
    const currentFiles = await Message.count({
      where: {
        message_type: "file",
        created_at: {
          [Op.gte]: weekStart,
        },
      },
    });

    const previousFiles = await Message.count({
      where: {
        message_type: "file",
        created_at: {
          [Op.between]: [lastWeekStart, lastWeekEnd],
        },
      },
    });

    dashboardData.counts.fileSharedGrowth =
      previousFiles > 0 ? (((currentFiles - previousFiles) / previousFiles) * 100).toFixed(2) : 100;

    // User Growth Month Wise (Last 12 months)
    const userGrowthPromises = months.map(async (month) => {
      const newUsers = await User.count({
        where: {
          status: "active",
          created_at: {
            [Op.between]: [month.start, month.end],
          },
        },
      });

      const totalUsers = await User.count({
        where: {
          status: "active",
          created_at: {
            [Op.lte]: month.end,
          },
        },
      });

      return {
        month: `${month.year}-${month.month.toString().padStart(2, "0")}`,
        new_users: newUsers,
        total_users: totalUsers,
      };
    });

    dashboardData.charts.userGrowthMonthly = await Promise.all(userGrowthPromises);

    // Team Growth Month Wise (Last 12 months)
    const teamGrowthPromises = months.map(async (month) => {
      const newTeams = await Team.count({
        where: {
          created_at: {
            [Op.between]: [month.start, month.end],
          },
        },
      });

      const totalTeams = await Team.count({
        where: {
          created_at: {
            [Op.lte]: month.end,
          },
        },
      });

      return {
        month: `${month.year}-${month.month.toString().padStart(2, "0")}`,
        new_teams: newTeams,
        total_teams: totalTeams,
      };
    });

    dashboardData.charts.teamGrowthMonthly = await Promise.all(teamGrowthPromises);

    // New Teams This Week Chart (Last 7 days)
    const newTeamsThisWeekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const newTeams = await Team.count({
        where: {
          created_at: {
            [Op.between]: [dayStart, dayEnd],
          },
        },
      });

      newTeamsThisWeekData.push({
        date: dateStr,
        new_teams: newTeams,
      });
    }
    dashboardData.charts.newTeamsThisWeek = newTeamsThisWeekData;

    // Most Active Users (Across all teams) - with country data
    dashboardData.insights.mostActiveUsers = await Message.findAll({
      attributes: ["sender_id", [fn("COUNT", sequelize.col("sender_id")), "message_count"]],
      include: [
        {
          model: User,
          as: "sender",
          attributes: [
            "id",
            "name",
            "email",
            "avatar",
            "is_online",
            "created_at",
            "last_seen",
            "country",
            "country_code", // Added country data
          ],
        },
      ],
      where: {
        created_at: {
          [Op.gte]: weekStart,
        },
      },
      group: ["sender_id"],
      order: [[fn("COUNT", col("sender_id")), "DESC"]],
      limit: 10,
    });

    // Recent Activity (Recent team creations) - with country insights
    dashboardData.insights.recentActivity = await Team.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "country", "country_code"], // Added country data
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    // Additional country insights for counts
    dashboardData.counts.totalCountries = dashboardData.charts.userLocationDistribution.length;
    dashboardData.counts.usersWithCountry = totalUsersWithCountry;
    dashboardData.counts.usersWithoutCountry = dashboardData.counts.totalUsers - totalUsersWithCountry;

    res.json({
      success: true,
      data: dashboardData,
      message: "Admin dashboard data fetched successfully",
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin dashboard data",
      error: error.message,
    });
  }
};

exports.getAllTeams = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      created_by,
      created_from,
      created_to,
      min_size,
      max_size,
      sort_by = "created_at", // Default sort field
      sort_order = "DESC", // Default sort order
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Base where condition
    const where = {};

    // Search team name
    if (search) {
      where[Op.or] = [
        whereFn(fn("LOWER", col("Team.name")), {
          [Op.like]: `%${search.toLowerCase()}%`,
        }),
      ];
    }

    // Filter by creator
    if (created_by) {
      where.created_by = created_by;
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

    // Fetch teams with creator & settings
    const { rows: teams, count: total } = await Team.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
      ],
      order: dbOrder,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Enrich with team size and admin(s)
    const enriched = await Promise.all(
      teams.map(async (team) => {
        const members = await TeamMember.findAll({
          where: {
            team_id: team.id,
            status: { [Op.in]: ["active", "pending"] },
          },
          include: {
            model: User,
            attributes: ["id", "name", "email"],
          },
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
          id: team.id,
          name: team.name,
          avatar: team.avatar,
          created_at: team.created_at,
          created_by: team.creator
            ? {
                id: team.creator.id,
                name: team.creator.name,
                email: team.creator.email,
              }
            : null,
          total_members: totalMembers,
          admins,
        };
      }),
    );

    // Apply team size filtering
    let filtered = enriched;
    if (min_size || max_size) {
      filtered = enriched.filter((team) => {
        if (min_size && team.total_members < parseInt(min_size)) return false;
        if (max_size && team.total_members > parseInt(max_size)) return false;
        return true;
      });
    }

    // Apply sorting for computed fields (total_members, etc.)
    const allowedComputedSortFields = ["total_members", "name", "created_at"];
    let finalTeams = filtered;

    if (allowedComputedSortFields.includes(sort_by)) {
      finalTeams = filtered.sort((a, b) => {
        let aValue = a[sort_by];
        let bValue = b[sort_by];

        // Handle string comparison for name field
        if (sort_by === "name") {
          aValue = aValue?.toLowerCase() || "";
          bValue = bValue?.toLowerCase() || "";
        }

        // Handle date comparison
        if (sort_by === "created_at") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
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
      teams: finalTeams,
    });
  } catch (err) {
    console.error("Error in getAllTeams:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteTeam = async (req, res) => {
  const { ids } = req.body;

  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Team IDs array is required" });
    }
    const teams = await Team.findAll({
      where: {
        id: ids,
      },
    });

    if (teams.length === 0) {
      return res.status(404).json({ message: "No teams found" });
    }

    const foundIds = teams.map((team) => team.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));
    const members = await TeamMember.findAll({
      where: { team_id: { [Op.in]: foundIds } },
      attributes: ["team_id", "user_id"],
    });

    const teamMembersMap = new Map();
    for (const m of members) {
      if (!teamMembersMap.has(m.team_id)) {
        teamMembersMap.set(m.team_id, []);
      }
      teamMembersMap.get(m.team_id).push(m.user_id);
    }

    const channels = await Channel.findAll({
      where: { team_id: { [Op.in]: foundIds } },
      attributes: ["id"],
    });
    const channelIds = channels.map((ch) => ch.id);

    const io = req.app.get("io");

    await sequelize.transaction(async (t) => {
      if (channelIds.length > 0) {
        await Message.destroy({
          where: { channel_id: { [Op.in]: channelIds } },
          transaction: t,
        });

        await ChannelMember.destroy({
          where: { channel_id: { [Op.in]: channelIds } },
          transaction: t,
        });

        // Delete channels
        await Channel.destroy({
          where: { team_id: { [Op.in]: foundIds } },
          transaction: t,
        });
      }

      // Delete custom fields
      await CustomField.destroy({
        where: { team_id: { [Op.in]: foundIds } },
        transaction: t,
      });

      // Delete team settings
      await TeamSetting.destroy({
        where: { team_id: { [Op.in]: foundIds } },
        transaction: t,
      });

      // Delete team members
      await TeamMember.destroy({
        where: { team_id: { [Op.in]: foundIds } },
        transaction: t,
      });

      await Team.destroy({
        where: { id: { [Op.in]: foundIds } },
        transaction: t,
      });
    });

    if (io) {
      for (const [teamId, userIds] of teamMembersMap.entries()) {
        const teamName = teamMap.get(teamId);
        userIds.forEach((userId) => {
          io.to(`user_${userId}`).emit("team-deleted", {
            team_id: teamId,
            team_name: teamName,
            message: "This team has been deleted by an administrator",
          });
        });
      }
    }

    const deletedTeams = teams.map((t) => ({
      team_id: t.id,
      team_name: t.name,
    }));

    const response = {
      message: `${deletedTeams.length} team(s) deleted successfully`,
      data: deletedTeams,
    };

    if (notFoundIds.length > 0) {
      response.notFound = notFoundIds;
      response.message += `, ${notFoundIds.length} team(s) not found`;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in deleteTeam:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.deleteUsersFromTeam = async (req, res) => {
  const { ids, teamId } = req.body;

  console.log("teamId:", teamId, "ids:", ids);

  if (!teamId) {
    return res.status(400).json({ message: "Team ID is required" });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "User IDs array is required" });
  }

  try {
    const members = await TeamMember.findAll({
      where: {
        team_id: teamId,
        user_id: ids,
      },
    });

    if (members.length === 0) {
      return res.status(404).json({ message: "No team memberships found" });
    }

    const foundIds = members.map((member) => member.user_id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    const adminsToRemove = members.filter((m) => m.role === "admin");
    if (adminsToRemove.length > 0) {
      const totalAdmins = await TeamMember.count({
        where: {
          team_id: teamId,
          role: "admin",
        },
      });

      if (totalAdmins - adminsToRemove.length <= 0) {
        return res.status(400).json({
          message: "Cannot remove the last admin(s) from the team",
        });
      }
    }

    await TeamMember.destroy({
      where: {
        team_id: teamId,
        user_id: foundIds,
      },
    });

    const response = {
      message: `${foundIds.length} user(s) removed from team successfully`,
      removedCount: foundIds.length,
    };

    if (notFoundIds.length > 0) {
      response.notFound = notFoundIds;
      response.message += `, ${notFoundIds.length} user(s) not found in team`;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in removeUserFromTeam:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateSuperTeamMemberStatus = async (req, res) => {
  const { user_id, action, team_id } = req.body;

  if (!team_id) {
    return res.status(400).json({ message: "Team ID is required" });
  }

  try {
    const member = await TeamMember.findOne({
      where: {
        team_id,
        user_id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (member.user_id === req.user.id) {
      return res.status(403).json({ message: "Not authorized to modify own status" });
    }

    const statusMap = {
      approve: "active",
      reject: "rejected",
      deactivate: "deactivated",
      reactivate: "active",
    };

    let updateData = {};

    if (action === "make_admin") {
      updateData = { role: "admin" };
    } else if (action === "remove_admin") {
      updateData = { role: "member" };
    } else if (statusMap[action]) {
      updateData = { status: statusMap[action] };
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await member.update(updateData);

    if (action === "reject") {
      await member.destroy();
    }

    const io = req.app.get("io");
    const teamMembers = await TeamMember.findAll({
      where: {
        team_id,
      },
      attributes: ["user_id"],
    });

    teamMembers.forEach((teamMember) => {
      io.to(`user_${teamMember.user_id}`).emit("member_status_updated", {
        user_id: member.user_id,
        team_id,
        status: member.status,
        role: member.role,
        action,
      });
    });

    if (action === "deactivate") {
      io.to(`user_${user_id}`).emit("account-deactivated", member);
    }

    res.status(200).json({ message: "Member updated", data: member });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
