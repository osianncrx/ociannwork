module.exports = (sequelize, DataTypes) => {
    const TeamSubscription = sequelize.define(
        "TeamSubscription",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            team_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'teams',
                    key: 'id'
                }
            },
            plan_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'plans',
                    key: 'id'
                }
            },
            member_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: 1
                }
            },
            amount_paid: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            billing_cycle: {
                type: DataTypes.ENUM("monthly", "yearly"),
                allowNull: false
            },
            subscription_date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            expiry_date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM("active", "expired", "cancelled"),
                defaultValue: "active"
            },
            payment_source: {
                type: DataTypes.ENUM("wallet"),
                defaultValue: "wallet"
            },
            wallet_transaction_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'wallet_transactions',
                    key: 'id'
                }
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            }
        },
        {
            tableName: "team_subscriptions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                {
                    fields: ['team_id', 'status']
                },
                {
                    fields: ['plan_id']
                },
                {
                    fields: ['expiry_date']
                }
            ]
        }
    );

    TeamSubscription.associate = function (models) {
        TeamSubscription.belongsTo(models.Team, {
            foreignKey: 'team_id',
            as: 'team'
        });
        TeamSubscription.belongsTo(models.Plan, {
            foreignKey: 'plan_id',
            as: 'plan'
        });
        TeamSubscription.belongsTo(models.WalletTransaction, {
            foreignKey: 'wallet_transaction_id',
            as: 'walletTransaction'
        });
    };

    // Instance Methods
    TeamSubscription.prototype.isActive = function () {
        return this.status === 'active' && new Date() < new Date(this.expiry_date);
    };

    TeamSubscription.prototype.daysRemaining = function () {
        const now = new Date();
        const expiry = new Date(this.expiry_date);
        const diff = expiry - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return TeamSubscription;
};