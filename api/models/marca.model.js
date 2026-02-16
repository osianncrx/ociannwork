module.exports = (sequelize, DataTypes) => {
  const Marca = sequelize.define(
    "Marca",
    {
      idMarca: {
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
      TipoMarca: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "1=Entrada, 2=Descanso, 3=Salida",
      },
      Hora: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      Activo: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: "1=Active, 0=Deleted (soft delete)",
      },
    },
    {
      tableName: "marcas",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["team_id", "Hora"] },
        { fields: ["user_id", "Hora"] },
      ],
    }
  );

  Marca.associate = (models) => {
    Marca.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    Marca.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
    Marca.belongsTo(models.TipoMarca, {
      foreignKey: "TipoMarca",
      targetKey: "idTipoMarca",
      as: "tipo",
    });
  };

  return Marca;
};
