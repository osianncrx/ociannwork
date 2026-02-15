const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const axios = require('axios');
const { User, OTPLog, Session, TeamMember, Setting } = require('../models');
const { sendTemplateMail } = require('../utils/mail');
const { generateToken } = require('../utils/jwt');

// Helper function to get settings
async function getSettings() {
  const settings = await Setting.findOne();
  if (!settings) {
    throw new Error('Settings not configured');
  }
  return settings;  
}

// Verify CAPTCHA with Google reCAPTCHA
async function verifyCaptcha(captchaToken, secretKey) {
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: captchaToken
        }
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

// Generate OTP based on settings
function generateOTP(digits = 6) {
  if (process.env.APP_DEMO_MODE == 'true') {
    return 123456;
  } else {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
}

exports.checkEmailAndSendOTP = async (req, res) => {
  try {
    const { email, captchaToken } = req.body;
    const ip = req.ip;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    // Verify CAPTCHA if enabled
    if (settings.enable_captcha) {
      if (!captchaToken) {
        return res.status(400).json({ message: 'CAPTCHA verification required' });
      }

      const isCaptchaValid = await verifyCaptcha(captchaToken, settings.captcha_secret_key);
      if (!isCaptchaValid) {
        return res.status(400).json({ message: 'CAPTCHA verification failed' });
      }
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (existingUser && existingUser.email_verified && existingUser.password) {
      return res.status(200).json({
        message: 'User exists. Please login.',
        userExists: true,
        emailVerified: true,
        isProfileUpdated: true
      });
    }

    const otp = generateOTP(settings.otp_digits);
    const expiresAt = new Date(Date.now() + settings.otp_expiration_minutes * 60 * 1000);

    await OTPLog.create({
      email: email.toLowerCase().trim(),
      otp,
      expires_at: expiresAt
    });

    // Send email if enabled
    if (settings.enable_email_notifications) {

      // Use EJS template for OTP email
      await sendTemplateMail(
        email,
        `${settings.site_name || 'System'} - Your OTP Code`,
        'otp-email',
        {
          siteName: settings.site_name || 'Our System',
          otp: otp,
          expirationMinutes: settings.otp_expiration_minutes,
          userEmail: email,
          currentYear: new Date().getFullYear()
        }
      );

    }

    res.status(200).json({
      message: 'OTP sent successfully',
      userExists: existingUser ? true : false,
      emailVerified: existingUser && existingUser.email_verified ? true : false,
      isProfileUpdated: existingUser && existingUser.password ? true : false
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const ip = req.ip;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    const otpLog = await OTPLog.findOne({
      where: {
        email: email.toLowerCase().trim(),
        otp,
        verified: false
      },
      order: [['created_at', 'DESC']]
    });

    if (!otpLog) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (otpLog.expires_at < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    otpLog.verified = true;
    await otpLog.save();

    let showProfileScreen = false;
    const user = await User.findOne({ where: { email: email } });

    if (user) {
      
      await user.update({ email_verified: true });

      const teamMemberships = await TeamMember.findAll({
        where: { user_id: user.id }
      });

      const hasActiveMembership = teamMemberships.some(
        (tm) => tm.status === 'active'
      );

      // Logic for showing profile screen
      showProfileScreen = !user.password && hasActiveMembership;
    }

    res.status(200).json({
      message: 'OTP verified successfully',
      showProfileScreen
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.ip;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    const otpLog = await OTPLog.findOne({
      where: {
        email: email.toLowerCase().trim(),
        verified: false
      },
      order: [['created_at', 'DESC']]
    });

    if (otpLog && otpLog.expires_at < new Date()) {
      const otp = generateOTP(settings.otp_digits);
      const expiresAt = new Date(Date.now() + settings.otp_expiration_minutes * 60 * 1000);

      await OTPLog.create({
        email: email.toLowerCase().trim(),
        otp,
        expires_at: expiresAt
      });

      if (settings.enable_email_notifications) {
        await sendTemplateMail(
          email,
          `${settings.site_name || 'System'} - Your OTP Code`,
          'otp-email',
          {
            siteName: settings.site_name || 'Our System',
            otp: otp,
            expirationMinutes: settings.otp_expiration_minutes,
            userEmail: email,
            currentYear: new Date().getFullYear()
          }
        );
      }
    } else if (otpLog) {
      otpLog.expires_at = new Date(Date.now() + settings.otp_expiration_minutes * 60 * 1000);
      await otpLog.save();

      if (settings.enable_email_notifications) {
        await sendTemplateMail(
          email,
          `${settings.site_name || 'System'} - Your OTP Code`,
          'otp-email',
          {
            siteName: settings.site_name || 'Our System',
            otp: otpLog.otp,
            expirationMinutes: settings.otp_expiration_minutes,
            userEmail: email,
            currentYear: new Date().getFullYear()
          }
        );
      }
    }

    res.status(200).json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Error resend OTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  const { email, password, agenda, captchaToken } = req.body;
  const ip_address = req.ip;

  try {
    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip_address)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip_address)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    // Verify CAPTCHA if enabled
    if (settings.enable_captcha) {
      if (!captchaToken) {
        return res.status(400).json({ message: 'CAPTCHA verification required' });
      }

      const isCaptchaValid = await verifyCaptcha(captchaToken, settings.captcha_secret_key);
      if (!isCaptchaValid) {
        return res.status(400).json({ message: 'CAPTCHA verification failed' });
      }
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found. Please register." });
    }

    if (user && !user.email_verified) {
      return res
        .status(400)
        .json({ message: "Email is not verified, Please verify email first." });
    }

    if (user && user.status == "deactive") {
      return res
        .status(400)
        .json({
          message: "Your account is deactivated, Please contact administrator.",
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email.toLowerCase().trim(),
    });

    const sessionLimit = 10;

    // Count existing active sessions
    const activeSessions = await Session.findAll({
      where: {
        user_id: user.id,
        status: "active",
        device_info: req.headers["user-agent"],
      },
      order: [["created_at", "ASC"]],
    });

    if (activeSessions.length >= sessionLimit) {
      // Remove oldest session
      const oldest = activeSessions[0];
      await oldest.destroy();
    }

    // Use session timeout from settings
    const expires_at = new Date(Date.now() + settings.session_timeout_minutes * 60 * 1000);

    await Session.create({
      user_id: user.id,
      session_token: token,
      device_info: req.headers["user-agent"],
      ip_address,
      agenda: agenda || "login",
      expires_at,
    });

    await user.update({ last_login: new Date() });

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
    let teamCustomField = null;

    if (teamCount === 1) {
      teamId = teamMemberships[0].team_id;
      teamMemberRole = teamMemberships[0].role;
      teamCustomField = teamMemberships[0].custom_field ? teamMemberships[0].custom_field : null;
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      showTeamsScreen: true,
      isProfileUpdated: user.password ? true : false,
      teamId,
      teamMemberRole,
      teamCustomField
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, captchaToken } = req.body;
  const ip = req.ip;

  try {
    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    // Verify CAPTCHA if enabled
    if (settings.enable_captcha) {
      if (!captchaToken) {
        return res.status(400).json({ message: 'CAPTCHA verification required' });
      }

      const isCaptchaValid = await verifyCaptcha(captchaToken, settings.captcha_secret_key);
      if (!isCaptchaValid) {
        return res.status(400).json({ message: 'CAPTCHA verification failed' });
      }
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const otp = generateOTP(settings.otp_digits);
    const expires_at = new Date(Date.now() + settings.otp_expiration_minutes * 60 * 1000);

    await OTPLog.create({
      email: email.toLowerCase().trim(),
      otp,
      expires_at,
      verified: false
    });

    if (settings.enable_email_notifications) {
      await sendTemplateMail(
        email,
        `${settings.site_name || 'System'} - Your OTP Code`,
        'otp-email',
        {
          siteName: settings.site_name || 'Our System',
          otp: otp,
          expirationMinutes: settings.otp_expiration_minutes,
          userEmail: email,
          currentYear: new Date().getFullYear()
        }
      );
    }

    return res.status(200).json({ message: 'OTP sent to your email.' });

  } catch (err) {
    console.error('Forgot Password Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, new_password } = req.body;
  const ip = req.ip;

  try {
    // Get settings
    const settings = await getSettings();

    // Check if IP is banned
    if (settings.isIPBanned(ip)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check maintenance mode
    if (!settings.canAccessDuringMaintenance(ip)) {
      return res.status(503).json({
        message: settings.maintenance_message || 'System under maintenance',
        maintenance: true
      });
    }

    // Validate password requirements
    if (new_password.length < settings.password_min_length) {
      return res.status(400).json({
        message: `Password must be at least ${settings.password_min_length} characters long.`
      });
    }

    if (settings.password_require_special_char) {
      const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
      if (!specialCharRegex.test(new_password)) {
        return res.status(400).json({
          message: 'Password must contain at least one special character.'
        });
      }
    }

    const otpRecord = await OTPLog.findOne({
      where: {
        email,
        otp,
        verified: true,
        expires_at: { [Op.gt]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or session expired.' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    otpRecord.verified = true;
    await otpRecord.save();

    return res.status(200).json({ message: 'Password reset successful.' });

  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};