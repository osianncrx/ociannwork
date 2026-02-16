module.exports = (sequelize, DataTypes) => {
  const TeamsNotificationLog = sequelize.define(
    "TeamsNotificationLog",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      tipoEvento: {
        type: DataTypes.ENUM(
          "entrada",
          "descanso_inicio",
          "descanso_fin",
          "salida",
          "reporte_diario",
          "proyecto_inicio",
          "proyecto_fin"
        ),
        allowNull: false,
      },
      mensaje: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      respuestaTeams: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      exitoso: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "teams_notifications_log",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["team_id"] },
        { fields: ["created_at"] },
      ],
    }
  );

  TeamsNotificationLog.associate = (models) => {
    TeamsNotificationLog.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    TeamsNotificationLog.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
  };

  return TeamsNotificationLog;
};
