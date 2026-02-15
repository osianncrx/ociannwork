module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define(
        "Payment",
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
            wallet_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'wallets',
                    key: 'id'
                }
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: 0.01
                }
            },
            currency: {
                type: DataTypes.STRING(3),
                defaultValue: 'USD'
            },
            payment_gateway: {
                type: DataTypes.ENUM("stripe", "paypal", "razorpay", "manual"),
                allowNull: false
            },
            gateway_payment_id: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "Payment ID from gateway"
            },
            gateway_order_id: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "Order ID from gateway"
            },
            payment_method: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "card, upi, netbanking, etc."
            },
            status: {
                type: DataTypes.ENUM("pending", "processing", "completed", "failed", "refunded"),
                defaultValue: "pending"
            },
            gateway_response: {
                type: DataTypes.JSON,
                defaultValue: {},
                comment: "Full response from payment gateway"
            },
            failure_reason: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            refund_amount: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0.00
            },
            refund_date: {
                type: DataTypes.DATE,
                allowNull: true
            },
            wallet_transaction_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'wallet_transactions',
                    key: 'id'
                }
            }
        },
        {
            tableName: "payments",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                {
                    fields: ['team_id']
                },
                {
                    fields: ['wallet_id']
                },
                {
                    fields: ['status']
                },
                {
                    fields: ['gateway_payment_id']
                }
            ]
        }
    );

    Payment.associate = function (models) {
        Payment.belongsTo(models.Team, {
            foreignKey: 'team_id',
            as: 'team'
        });
        Payment.belongsTo(models.Wallet, {
            foreignKey: 'wallet_id',
            as: 'wallet'
        });
        Payment.belongsTo(models.WalletTransaction, {
            foreignKey: 'wallet_transaction_id',
            as: 'walletTransaction'
        });
    };

    return Payment;
};