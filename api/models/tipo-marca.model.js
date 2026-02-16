module.exports = (sequelize, DataTypes) => {
  const TipoMarca = sequelize.define(
    "TipoMarca",
    {
      idTipoMarca: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      Descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      tableName: "tipo_marcas",
      timestamps: false,
    }
  );

  TipoMarca.associate = (models) => {
    TipoMarca.hasMany(models.Marca, {
      foreignKey: "TipoMarca",
      sourceKey: "idTipoMarca",
      as: "marcas",
    });
  };

  return TipoMarca;
};
