module.exports = (sequelize, DataTypes) => {
  const MarcaProyectoEspecial = sequelize.define(
    "MarcaProyectoEspecial",
    {
      idMarcaProyecto: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      idProyecto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "proyectos", key: "idProyecto" },
        onDelete: "CASCADE",
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      horaEntrada: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      horaSalida: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "NULL = currently working on project",
      },
      reporte: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "marca_proyecto_especial",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id", "fecha"] },
        { fields: ["idProyecto"] },
      ],
    }
  );

  MarcaProyectoEspecial.associate = (models) => {
    MarcaProyectoEspecial.belongsTo(models.User, { foreignKey: "user_id", as: "usuario" });
    MarcaProyectoEspecial.belongsTo(models.Proyecto, { foreignKey: "idProyecto", as: "proyecto" });
    MarcaProyectoEspecial.belongsTo(models.Team, { foreignKey: "team_id", as: "empresa" });
  };

  return MarcaProyectoEspecial;
};
