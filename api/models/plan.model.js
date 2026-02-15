module.exports = (sequelize, DataTypes) => {
    const Plan = sequelize.define(
        "Plan",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    is: /^[a-z0-9-]+$/ // Ensures URL-friendly slugs
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            // Pricing Information
            price_per_user_per_month: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                validate: {
                    min: 0
                }
            },
            price_per_user_per_year: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true, // Null if not offered annually
                defaultValue: null,
                validate: {
                    min: 0
                }
            },
            billing_cycle: {
                type: DataTypes.ENUM("monthly", "yearly", "both"),
                defaultValue: "monthly",
            },
            // Usage Limits
            max_message_search_limit: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 10000, // Last 10k messages searchable
            },
            max_channels: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 50,
            },
            max_storage_mb: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                comment: "Maximum storage in MB. Null means unlimited storage"
            },
            // Feature Flags
            allows_private_channels: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            allows_file_sharing: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            allows_video_calls: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            allows_multiple_delete: { 
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: "Allows bulk deletion of messages/channels"
            },

            // For flexible feature management
            features: {
                type: DataTypes.JSON,
                defaultValue: {},
                comment: "Flexible key-value store for additional features"
            },
            // Metadata
            display_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                comment: "For sorting plans in UI"
            },
            is_default: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: "Default plan for new teams"
            },
            status: {
                type: DataTypes.ENUM("active", "inactive"),
                defaultValue: "active",
            }
        },
        {
            tableName: "plans",
            timestamps: true,
            paranoid: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: "deleted_at",
            indexes: [
                {
                    unique: true,
                    fields: ['slug']
                },
                {
                    fields: ['status', 'display_order']
                }
            ]
        }
    );

    // Instance Methods
    Plan.prototype.isFreePlan = function () {
        return this.price_per_user_per_month === 0;
    };

    Plan.prototype.hasTrial = function () {
        return this.trial_period_days > 0;
    };

    Plan.prototype.getYearlyPrice = function () {
        if (this.price_per_user_per_year) {
            return this.price_per_user_per_year;
        }
        // Calculate 20% discount for yearly if not explicitly set
        return Number((this.price_per_user_per_month * 12 * 0.8).toFixed(2));
    };

    return Plan;
};