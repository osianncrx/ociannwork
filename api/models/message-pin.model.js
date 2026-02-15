module.exports = (sequelize, DataTypes) => {
    const MessagePin = sequelize.define('MessagePin', {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        message_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'messages', key: 'id' },
            onDelete: 'CASCADE',
        },
        pinned_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        channel_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'channels', key: 'id' },
            onDelete: 'CASCADE',
        },
    }, {
        tableName: 'message_pins',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_message_pin', fields: ['message_id', 'channel_id'] }
        ]
    });

    MessagePin.associate = (models) => {
        MessagePin.belongsTo(models.Message, { foreignKey: 'message_id', as: 'message' });
        MessagePin.belongsTo(models.User, { foreignKey: 'pinned_by', as: 'pinner' });
        if (models.Channel) MessagePin.belongsTo(models.Channel, { foreignKey: 'channel_id', as: 'channel' });
    };
    return MessagePin;
};
