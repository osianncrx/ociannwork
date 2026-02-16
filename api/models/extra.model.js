module.exports = (sequelize, DataTypes) => {
  const Extra = sequelize.define(
    "Extra",
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
      totalextras: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Number of overtime hours requested",
      },
      motivo: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      aceptado: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        comment: "0=Rejected, 1=Accepted, 3=Pending",
      },
    },
    {
      tableName: "extras",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Extra.associate = (models) => {
    Extra.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    Extra.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
  };

  return Extra;
};
