module.exports = (sequelize, DataTypes) => {
  const CuentaBancaria = sequelize.define(
    "CuentaBancaria",
    {
      idCuenta: {
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
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      cuenta: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Account number (digits and dashes only)",
      },
      banca: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Bank name",
      },
      tipoCuenta: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Account type",
      },
    },
    {
      tableName: "cuentas_bancarias",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  CuentaBancaria.associate = (models) => {
    CuentaBancaria.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    CuentaBancaria.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
  };

  return CuentaBancaria;
};
