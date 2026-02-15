const { Setting, CountryCode, User, Page } = require("../models");
const fs = require("fs");
const path = require("path");

exports.getCountryCode = async (req, res) => {
  try {
    const countryCodes = await CountryCode.findAll({
      attributes: ["id", "country", "code", "flag"],
      order: [["country", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Country codes retrieved successfully",
      data: countryCodes,
    });
  } catch (err) {
    console.error("Error fetching country codes:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(404).json({ message: "Settings not found" });
    }

    const settings = setting.toJSON();

    return res.status(200).json({
      message: "Settings retrieved successfully",
      settings: settings,
    });
  } catch (err) {
    console.error("Error fetching settings:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPublicSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne({
      attributes: ["site_name", "site_description",
        "support_email", "contact_email", "contact_phone", "company_address",
        "favicon_url", "logo_light_url", "logo_dark_url", "sidebar_logo_url",
        "mobile_logo_url", "landing_logo_url", "favicon_notification_logo_url", "onboarding_logo_url",
        "otp_digits", "maintenance_mode", "maintenance_title", "maintenance_message",
        "maintenance_image_url", "page_404_title", "page_404_content", "page_404_image_url",
        "no_internet_title", "no_internet_content", "no_internet_image_url"
      ]
    });

    if (!setting) {
      return res.status(404).json({ message: "Settings not found" });
    }

    const settings = setting.toJSON();

    return res.status(200).json({
      message: "Settings retrieved successfully",
      settings: settings,
      pages: await Page.findAll({})
    });
  } catch (err) {
    console.error("Error fetching settings:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    // Extract all possible fields from the model
    const updateData = {};

    // Basic Site Information
    const basicFields = [
      "site_name",
      "site_description",
      "support_email",
      "contact_email",
      "contact_phone",
      "company_address",
    ];

    // Logo & Branding
    const logoFields = ["favicon_url", "logo_light_url", "logo_dark_url", "sidebar_logo_url", "mobile_logo_url", "landing_logo_url", "favicon_notification_logo_url", "onboarding_logo_url"];

    // OTP & Authentication
    const authFields = [
      "otp_digits",
      "otp_expiration_minutes",
      "max_login_attempts",
      "session_timeout_minutes",
      "password_min_length",
      "password_require_special_char",
    ];

    // Security & IP Management
    const securityFields = [
      "banned_ips",
      "ip_ban_enabled",
      "allowed_domains",
      "enable_captcha",
      "captcha_site_key",
      "captcha_secret_key",
    ];

    // Maintenance Mode
    const maintenanceFields = [
      "maintenance_mode",
      "maintenance_title",
      "maintenance_message",
      "maintenance_image_url",
      "maintenance_allowed_ips",
      "maintenance_start_time",
      "maintenance_end_time",
    ];

    // Dynamic Pages
    const pageFields = [
      "page_404_title",
      "page_404_content",
      "page_404_image_url",
      "no_internet_title",
      "no_internet_content",
      "no_internet_image_url",
    ];

    // SMTP & Email Configuration
    const smtpFields = [
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_pass",
      "mail_from_name",
      "mail_from_email",
      "email_encryption",
    ];

    // Notification Settings
    const notificationFields = ["enable_email_notifications", "enable_push_notifications", "new_user_welcome_email"];

    // Combine all fields
    const allFields = [
      ...basicFields,
      ...logoFields,
      ...authFields,
      ...securityFields,
      ...maintenanceFields,
      ...pageFields,
      ...smtpFields,
      ...notificationFields,
    ];

    // Field mapping for file uploads
    const fieldMap = {
      favicon: "favicon_url",
      logo_light: "logo_light_url",
      logo_dark: "logo_dark_url",
      sidebar_logo: "sidebar_logo_url",
      mobile_logo: "mobile_logo_url",
      landing_logo: "landing_logo_url",
      favicon_notification_logo: "favicon_notification_logo_url",
      onboarding_logo: "onboarding_logo_url",
      maintenance_image: "maintenance_image_url",
      page_404_image: "page_404_image_url",
      no_internet_image: "no_internet_image_url",
    };

    // Process each field
    allFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        // Handle JSON fields
        if (["banned_ips", "allowed_domains", "maintenance_allowed_ips"].includes(field)) {
          try {
            updateData[field] = Array.isArray(req.body[field]) ? req.body[field] : JSON.parse(req.body[field] || "[]");
          } catch (error) {
            console.warn(`Invalid JSON for field ${field}:`, error);
            updateData[field] = [];
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle image deletion when null is passed using file field names
    Object.keys(fieldMap).forEach((uploadField) => {
      const databaseField = fieldMap[uploadField];

      // Check if the upload field is passed as null in req.body
      if (req.body[uploadField] == null || req.body[uploadField] == "null") {
        // Delete the existing file if it exists
        if (settings[databaseField]) {
          const oldFilePath = path.join(process.cwd(), settings[databaseField]);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        // Set the field to null in database
        updateData[databaseField] = null;
      }
    });

    // Handle multiple logo file uploads
    if (req.files) {
      // Process each uploaded file type
      Object.keys(req.files).forEach((uploadField) => {
        const file = req.files[uploadField][0]; // Get first file for each field
        const databaseField = fieldMap[uploadField];

        if (file && databaseField) {
          // Delete old file if exists
          if (settings[databaseField]) {
            const oldFilePath = path.join(process.cwd(), settings[databaseField]);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }

          // Update the field with new file path
          updateData[databaseField] = `/uploads/logos/${file.filename}`;
        }
      });
    }

    // Validate specific fields
    if (updateData.otp_digits !== undefined && (updateData.otp_digits < 4 || updateData.otp_digits > 8)) {
      return res.status(400).json({ message: "OTP digits must be between 4 and 8" });
    }

    if (updateData.smtp_port !== undefined && (updateData.smtp_port < 1 || updateData.smtp_port > 65535)) {
      return res.status(400).json({ message: "SMTP port must be between 1 and 65535" });
    }

    // Update settings
    await settings.update(updateData);

    // Get updated settings without sensitive data
    const updatedSettings = await Setting.findOne();
    const { smtp_pass, captcha_secret_key, ...safeUpdatedSettings } = updatedSettings.toJSON();

    const io = req.app.get("io");

    // Fetch all team members (excluding the user performing the action)
    const members = await User.findAll({
      where: {
        is_online: true,
      },
      attributes: ["id"],
    });

    // Emit socket event to each team member's socket
    members.forEach((teamMember) => {
      io.to(`user_${teamMember.id}`).emit("admin-settings-updated", safeUpdatedSettings);
    });

    return res.status(200).json({
      message: "Settings updated successfully",
      settings: safeUpdatedSettings,
    });
  } catch (err) {
    console.error("Error updating settings:", err);

    // Delete uploaded files if error occurred
    if (req.files) {
      Object.keys(req.files).forEach((field) => {
        req.files[field].forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      });
    }

    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => ({
        field: error.path,
        message: error.message,
      }));
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};
