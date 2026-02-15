module.exports = (sequelize, DataTypes) => {
  const CallRecording = sequelize.define(
    'CallRecording',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      call_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'teams', key: 'id' },
      },
      initiator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: 0,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Duration in seconds',
      },
      call_type: {
        type: DataTypes.ENUM('audio', 'video'),
        allowNull: false,
        defaultValue: 'audio',
      },
      chat_type: {
        type: DataTypes.ENUM('dm', 'channel'),
        allowNull: false,
        defaultValue: 'dm',
      },
      chat_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      chat_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      participants: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of {userId, name, avatar}',
      },
      thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('recording', 'processing', 'ready', 'failed'),
        defaultValue: 'recording',
      },
      transcript: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      ai_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_tasks: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ai_analysis: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: true,
      },
      ai_processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'call_recordings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['team_id'] },
        { fields: ['initiator_id'] },
        { fields: ['call_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] },
      ],
    }
  );

  CallRecording.associate = (models) => {
    CallRecording.belongsTo(models.User, {
      foreignKey: 'initiator_id',
      as: 'initiator',
    });
    CallRecording.belongsTo(models.Team, {
      foreignKey: 'team_id',
      as: 'team',
    });
  };

  return CallRecording;
};
