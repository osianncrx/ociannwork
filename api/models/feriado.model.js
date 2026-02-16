module.exports = (sequelize, DataTypes) => {
  const Feriado = sequelize.define(
    "Feriado",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      feriados: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Date in DD/MM format (no year)",
      },
      pagado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "1=Paid holiday, 0=Unpaid",
      },
    },
    {
      tableName: "feriados",
      timestamps: false,
    }
  );

  return Feriado;
};
