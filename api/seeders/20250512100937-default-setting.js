'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('settings', [{
      // Basic Site Information
      site_name: 'My Application',
      site_description: 'A modern web application built with cutting-edge technology',
      support_email: 'support@myapplication.com',
      contact_email: 'contact@myapplication.com',
      contact_phone: '+1-555-0123',
      company_address: '123 Business Street, City, State 12345',

      // Logo & Branding
      favicon_url: '',
      logo_light_url: '',
      logo_dark_url: '',
      sidebar_logo_url: '',
      mobile_logo_url: '',
      landing_logo_url: '',
      favicon_notification_logo_url: '',
      onboarding_logo_url: '',

      // OTP & Authentication
      otp_digits: 6,
      otp_expiration_minutes: 10,
      max_login_attempts: 5,
      session_timeout_minutes: 30,
      password_min_length: 8,
      password_require_special_char: true,

      // Security & IP Management
      banned_ips: JSON.stringify([]),
      ip_ban_enabled: false,
      allowed_domains: JSON.stringify([]),
      enable_captcha: false,
      captcha_site_key: '',
      captcha_secret_key: '',

      // Maintenance Mode
      maintenance_mode: false,
      maintenance_title: 'Under Maintenance',
      maintenance_message: 'We are performing some maintenance. Please check back later.',
      maintenance_image_url: '',
      maintenance_allowed_ips: JSON.stringify([]),
      maintenance_start_time: null,
      maintenance_end_time: null,

      // Dynamic Pages
      page_404_title: 'Page Not Found',
      page_404_content: 'The page you are looking for does not exist.',
      page_404_image_url: '',
      no_internet_title: 'No Internet Connection',
      no_internet_content: 'Please check your internet connection and try again.',
      no_internet_image_url: '',

      // SMTP & Email Configuration
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      mail_from_name: 'My Application',
      mail_from_email: 'noreply@myapplication.com',
      email_encryption: 'tls',

      // Notification Settings
      enable_email_notifications: true,
      enable_push_notifications: false,
      new_user_welcome_email: true,

      // Timestamps
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('settings', null, {});
  }
};