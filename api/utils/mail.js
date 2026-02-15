const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs").promises;

const loadSystemSettings = async () => {
  const settingsModulePath = require.resolve('./system-settings');
  delete require.cache[settingsModulePath];
  const freshModule = require('./system-settings');
  return await freshModule.loadSystemSettings();
};

let transporter;

// const initMailer = async () => {
//   const settings = await loadSystemSettings();

//   transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: false, // use TLS
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });
// };

const initMailer = async () => {
  const settings = await loadSystemSettings();

  const smtpUser = process.env.SMTP_USER || settings.smtp_user;
  const smtpPass = process.env.SMTP_PASS || settings.smtp_pass;

  const smtpHost = process.env.SMTP_HOST || settings.smtp_host;
  const smtpPort = parseInt(process.env.SMTP_PORT || settings.smtp_port, 10);

  const transportConfig = {
    host: smtpHost,
    port: smtpPort,
    secure: false,
    ignoreTLS: (smtpHost === '127.0.0.1' || smtpHost === 'localhost'),
    tls: { rejectUnauthorized: false },
  };

  if (smtpUser && smtpPass) {
    transportConfig.auth = {
      user: smtpUser,
      pass: smtpPass,
    };
  }

  transporter = nodemailer.createTransport(transportConfig);
};


/**
 * Render EJS template to HTML
 * @param {string} templateName - Name of the template file (without .ejs extension)
 * @param {object} data - Data to pass to the template
 * @returns {string} Rendered HTML
 */
const renderTemplate = async (templateName, data = {}) => {
  try {
    const templatePath = path.join(__dirname, 'views', 'emails', `${templateName}.ejs`);

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    // Render the template
    const html = await ejs.renderFile(templatePath, data);
    return html;
  } catch (error) {
    console.error("Error rendering template:", error);
    throw error;
  }
};

/**
 * Send email using EJS template
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} templateName - EJS template name
 * @param {object} templateData - Data for the template
 * @returns {boolean} Success status
 */
const sendTemplateMail = async (to, subject, templateName, templateData = {}) => {
  try {
    // Render the template
    const html = await renderTemplate(templateName, templateData);

    // Send the email
    return await sendMail(to, subject, html);
  } catch (error) {
    console.error("Error sending template mail:", error);
    return false;
  }
};

/**
 * Original sendMail function (kept for backward compatibility)
 */
const sendMail = async (to, subject, html) => {
  const settings = await loadSystemSettings();

  if (!transporter) {
    await initMailer();
  }

  if (process.env.APP_DEMO_MODE == 'true') {
    console.log(`[DEMO MODE] Email would be sent to: ${to}`);
    console.log(`Subject: ${subject}`);
  } else {
    try {
      const fromEmail = process.env.SMTP_USER || settings.smtp_user || settings.mail_from_email || 'noreply@ociannwork.com';
      await transporter.sendMail({
        from: `"${settings.site_name || settings.mail_from_name || 'System'}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (err) {
      console.error("Error sending mail:", err.message || err);
      return false;
    }
  }
};

module.exports = {
  sendMail,
  sendTemplateMail,
  renderTemplate
};