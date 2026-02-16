module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
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
      profile_color: {
        type: DataTypes.STRING,
        defaultValue: false,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("super_admin", "user"),
        defaultValue: "user",
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_seen: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_away: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "deactive"),
        defaultValue: "active",
      },
      player_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      public_key: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "User's public key for E2E encryption",
      },
      // Attendance module fields
      apellidos: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: "Last name(s) for attendance module",
      },
      puesto: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Job position/title",
      },
      fecha_entrada: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Company join date",
      },
      id_persona: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        comment: "National ID / Cedula for attendance",
      },
      tipo_permiso_marcas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Attendance role: 0=User, 1=Admin, 2=Supervisor, 3=SuperUser",
      },
      firsttime: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Must change password on first attendance login",
      },
      es_super_admin_marcas: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Super admin for attendance multi-tenant",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    }
  );

  User.associate = (models) => {
    User.belongsToMany(models.Team, {
      through: models.TeamMember,
      foreignKey: "user_id",
      otherKey: "team_id",
    });

    User.belongsToMany(models.Channel, {
      through: models.ChannelMember,
      foreignKey: "user_id",
      otherKey: "channel_id",
    });

    User.hasMany(models.MessageStatus, { foreignKey: "user_id" });

    User.hasMany(models.MutedChat, {
      foreignKey: 'user_id',
      as: 'mutedChats'
    });


    User.hasMany(models.TeamMember, {
      foreignKey: "user_id"
    });

    // Attendance associations
    User.hasMany(models.Marca, { foreignKey: "user_id", as: "marcas" });
    User.hasMany(models.EditarMarca, { foreignKey: "user_id", as: "editarMarcas" });
    User.hasMany(models.MarcaProyectoEspecial, { foreignKey: "user_id", as: "marcasProyecto" });
    User.hasMany(models.Extra, { foreignKey: "user_id", as: "extras" });
    User.hasMany(models.CuentaBancaria, { foreignKey: "user_id", as: "cuentasBancarias" });
    User.hasMany(models.TeamsNotificationLog, { foreignKey: "user_id", as: "teamsLogs" });
  };

  // Define a method to remove sensitive fields before serializing to JSON
  // User.prototype.toJSON = function () {
  //   const values = Object.assign({}, this.get());
  //   delete values.password;
  //   delete values.last_login;
  //   return values;
  // }

  return User;
};
