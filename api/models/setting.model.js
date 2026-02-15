module.exports = (sequelize, DataTypes) => {
    const Setting = sequelize.define(
        'Setting',
        {
            // Basic Site Information
            site_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: 'My Application'
            },
            site_description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            support_email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    isEmail: true
                }
            },
            contact_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    isEmail: true
                }
            },
            contact_phone: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            company_address: {
                type: DataTypes.TEXT,
                allowNull: true
            },

            // Logo & Branding
            favicon_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            logo_light_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            logo_dark_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            sidebar_logo_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            mobile_logo_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            landing_logo_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            favicon_notification_logo_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            onboarding_logo_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },

            // OTP & Authentication
            otp_digits: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 6,
                validate: {
                    min: 4,
                    max: 8
                }
            },
            otp_expiration_minutes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 10,
                validate: {
                    min: 1,
                    max: 60
                }
            },
            max_login_attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 5
            },
            session_timeout_minutes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 30
            },
            password_min_length: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 8
            },
            password_require_special_char: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },

            // Security & IP Management
            banned_ips: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('banned_ips');
                    return rawValue ? JSON.parse(rawValue) : [];
                },
                set(value) {
                    this.setDataValue('banned_ips', value ? JSON.stringify(value) : null);
                }
            },
            ip_ban_enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            allowed_domains: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('allowed_domains');
                    return rawValue ? JSON.parse(rawValue) : [];
                },
                set(value) {
                    this.setDataValue('allowed_domains', value ? JSON.stringify(value) : null);
                }
            },
            enable_captcha: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            captcha_site_key: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            captcha_secret_key: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            // Maintenance Mode
            maintenance_mode: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            maintenance_title: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: 'Under Maintenance'
            },
            maintenance_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: 'We are performing some maintenance. Please check back later.'
            },
            maintenance_image_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            maintenance_allowed_ips: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('maintenance_allowed_ips');
                    return rawValue ? JSON.parse(rawValue) : [];
                },
                set(value) {
                    this.setDataValue('maintenance_allowed_ips', value ? JSON.stringify(value) : null);
                }
            },
            maintenance_start_time: {
                type: DataTypes.DATE,
                allowNull: true
            },
            maintenance_end_time: {
                type: DataTypes.DATE,
                allowNull: true
            },
            // Dynamic Pages
            page_404_title: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: 'Page Not Found'
            },
            page_404_content: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: 'The page you are looking for does not exist.'
            },
            page_404_image_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            no_internet_title: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: 'No Internet Connection'
            },
            no_internet_content: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: 'Please check your internet connection and try again.'
            },
            no_internet_image_url: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            // SMTP & Email Configuration
            smtp_host: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            smtp_port: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1,
                    max: 65535
                }
            },
            smtp_user: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            smtp_pass: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            mail_from_name: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            mail_from_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    isEmail: true
                }
            },
            email_encryption: {
                type: DataTypes.ENUM('none', 'ssl', 'tls'),
                allowNull: false,
                defaultValue: 'tls'
            },
            // Notification Settings
            enable_email_notifications: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            enable_push_notifications: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            new_user_welcome_email: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
        },
        {
            tableName: 'settings',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                {
                    unique: true,
                    fields: ['site_name']
                }
            ]
        }
    );

    // Instance Methods
    Setting.prototype.isIPBanned = function (ip) {
        if (!this.ip_ban_enabled) return false;
        return this.banned_ips.includes(ip);
    };

    Setting.prototype.canAccessDuringMaintenance = function (ip) {
        if (!this.maintenance_mode) return true;
        return this.maintenance_allowed_ips.includes(ip);
    };

    Setting.prototype.isMaintenanceScheduled = function () {
        if (!this.maintenance_start_time || !this.maintenance_end_time) return false;
        const now = new Date();
        return now >= this.maintenance_start_time && now <= this.maintenance_end_time;
    };

    return Setting;
};