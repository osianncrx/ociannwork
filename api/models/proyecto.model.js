module.exports = (sequelize, DataTypes) => {
  const Proyecto = sequelize.define(
    "Proyecto",
    {
      idProyecto: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "proyectos",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Proyecto.associate = (models) => {
    Proyecto.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
    Proyecto.hasMany(models.MarcaProyectoEspecial, {
      foreignKey: "idProyecto",
      as: "marcas",
    });
  };

  return Proyecto;
};
