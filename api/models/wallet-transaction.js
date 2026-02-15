module.exports = (sequelize, DataTypes) => {
    const WalletTransaction = sequelize.define(
        "WalletTransaction",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            wallet_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'wallets',
                    key: 'id'
                }
            },
            transaction_type: {
                type: DataTypes.ENUM("credit", "debit"),
                allowNull: false
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: 0
                }
            },
            balance_before: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            balance_after: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            reference_type: {
                type: DataTypes.ENUM("payment", "subscription", "refund", "adjustment"),
                allowNull: false
            },
            reference_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: "ID of related payment or subscription"
            },
            payment_gateway: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "stripe, paypal, razorpay, etc."
            },
            gateway_transaction_id: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "Transaction ID from payment gateway"
            },
            status: {
                type: DataTypes.ENUM("pending", "completed", "failed", "reversed"),
                defaultValue: "completed"
            },
            metadata: {
                type: DataTypes.JSON,
                defaultValue: {},
                comment: "Additional transaction details"
            }
        },
        {
            tableName: "wallet_transactions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                {
                    fields: ['wallet_id', 'created_at']
                },
                {
                    fields: ['transaction_type']
                },
                {
                    fields: ['reference_type', 'reference_id']
                }
            ]
        }
    );

    WalletTransaction.associate = function (models) {
        WalletTransaction.belongsTo(models.Wallet, {
            foreignKey: 'wallet_id',
            as: 'wallet'
        });
    };

    return WalletTransaction;
};