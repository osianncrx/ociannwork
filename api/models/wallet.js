module.exports = (sequelize, DataTypes) => {
    const Wallet = sequelize.define(
        "Wallet",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            team_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true,
                references: {
                    model: 'teams',
                    key: 'id'
                }
            },
            balance: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                validate: {
                    min: 0
                }
            },
            currency: {
                type: DataTypes.STRING(3),
                defaultValue: 'USD'
            },
            status: {
                type: DataTypes.ENUM("active", "suspended", "closed"),
                defaultValue: "active"
            }
        },
        {
            tableName: "wallets",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                {
                    unique: true,
                    fields: ['team_id']
                }
            ]
        }
    );

    Wallet.associate = function (models) {
        Wallet.belongsTo(models.Team, {
            foreignKey: 'team_id',
            as: 'team'
        });
        Wallet.hasMany(models.WalletTransaction, {
            foreignKey: 'wallet_id',
            as: 'transactions'
        });
    };

    // Instance Methods
    Wallet.prototype.hasSufficientBalance = function (amount) {
        return parseFloat(this.balance) >= parseFloat(amount);
    };

    Wallet.prototype.addBalance = function (amount, transaction = null) {
        this.balance = parseFloat(this.balance) + parseFloat(amount);
        return this.save({ transaction });
    };

    Wallet.prototype.deductBalance = function (amount, transaction = null) {
        if (!this.hasSufficientBalance(amount)) {
            throw new Error('Insufficient balance');
        }
        this.balance = parseFloat(this.balance) - parseFloat(amount);
        return this.save({ transaction });
    };

    return Wallet;
};