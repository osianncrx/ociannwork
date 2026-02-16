module.exports = (sequelize, DataTypes) => {
  const EditarMarca = sequelize.define(
    "EditarMarca",
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
      idMarca: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "0 = new mark request, >0 = edit existing mark",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      Hora: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      tipoSolicitud: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: "0=edit, 1=entrada, 2=descanso, 3=salida",
      },
      aprobado: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "0=pending/rejected, 1=approved",
      },
      eliminado: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "0=active, 1=rejected/deleted",
      },
    },
    {
      tableName: "editar_marcas",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["user_id", "Hora"] }],
    }
  );

  EditarMarca.associate = (models) => {
    EditarMarca.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    EditarMarca.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
  };

  return EditarMarca;
};
