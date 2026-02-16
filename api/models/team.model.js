module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define(
    "Team",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },
      // Attendance module fields
      teams_webhook_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "Microsoft Teams incoming webhook URL",
      },
      teams_notificaciones: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether Teams notifications are enabled",
      },
      slug: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        comment: "URL-friendly identifier for the company",
      },
      activo_marcas: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether attendance module is active for this team",
      },
    },
    {
      tableName: 'teams',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Team.associate = (models) => {
    Team.belongsToMany(models.User, {
      through: models.TeamMember,
      foreignKey: 'team_id',
      otherKey: 'user_id',
    });

    Team.hasMany(models.Channel, {
      foreignKey: 'team_id',
    });

    Team.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

    Team.hasOne(models.TeamSetting, {
      foreignKey: 'team_id',
      as: 'team_setting'
    });

    // Attendance associations
    Team.hasMany(models.Marca, { foreignKey: "team_id", as: "marcas" });
    Team.hasMany(models.Proyecto, { foreignKey: "team_id", as: "proyectos" });
    Team.hasMany(models.MarcaProyectoEspecial, { foreignKey: "team_id", as: "marcasProyecto" });
    Team.hasMany(models.EditarMarca, { foreignKey: "team_id", as: "editarMarcas" });
    Team.hasMany(models.Extra, { foreignKey: "team_id", as: "extras" });
    Team.hasMany(models.CuentaBancaria, { foreignKey: "team_id", as: "cuentasBancarias" });
    Team.hasMany(models.TeamsNotificationLog, { foreignKey: "team_id", as: "teamsLogs" });
  };

  return Team;
};
